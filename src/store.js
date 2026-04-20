import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, configGet, configSet, exportarDados, importarDados, garantirPersistencia, migrateLegacyDbIfNeeded } from './db.js'
import { isGoogleDriveBackupConfigured, salvarBackupNoDrive, restaurarBackupDoDrive } from './services/googleDriveBackup.js'
import { isInsumoSemPeso, normalizar } from './utils.js'

export const useStore = defineStore('choco', () => {

  // ── UI ─────────────────────────────────────
  const tab     = ref('painel')
  const loading = ref(false)
  const toast   = ref(null)
  const modal   = ref(null)

  // ── Dados ─────────────────────────────────
  const produtos  = ref([])
  const receitas  = ref([])
  const producoes = ref([])
  const financeiro = ref([])

  // ── Config ────────────────────────────────
  const company = ref({
    nome: 'ChocoBete Produção',
    slogan: 'Registro de Produção',
    posicao_etiqueta: 0
  })
  const googleDriveConfigured = computed(() => isGoogleDriveBackupConfigured())

  const clean = (obj) => JSON.parse(JSON.stringify(obj))
  const normalizeReceitaCategoria = (categoria) => categoria === 'Nenhuma' ? '' : categoria
  const normalizarTextoFinanceiro = (texto) =>
    String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

  function getMesRef(dataIso) {
    const [ano, mes] = String(dataIso || '').split('-')
    return ano && mes ? `${mes}/${ano}` : ''
  }

  function normalizarTipoFinanceiro(tipo) {
    return normalizarTextoFinanceiro(tipo)
  }

  function classificarLancamentoFinanceiro({ tipo, descricao, valor }) {
    const tipoNorm = normalizarTipoFinanceiro(tipo)
    const descNorm = normalizarTextoFinanceiro(descricao)
    const valorNum = Number(valor || 0)

    if (tipoNorm.includes('pix recebido') || tipoNorm.includes('qr code pix recebido')) {
      return { categoria: 'Receita', natureza: 'entrada' }
    }

    if (tipoNorm.includes('rendimento')) {
      return { categoria: 'Rendimento financeiro', natureza: valorNum >= 0 ? 'entrada' : 'saida' }
    }

    if (descNorm.includes('condominio') || descNorm.includes('edificio') || descNorm.includes('edificio santo amaro')) {
      return { categoria: 'Moradia', natureza: 'pessoal' }
    }

    if (tipoNorm.includes('cartao de debito')) {
      if (descNorm.includes('supermerc') || descNorm.includes('merc') || descNorm.includes('acougue') || descNorm.includes('padaria') || descNorm.includes('biscoito') || descNorm.includes('casas pedro')) {
        return { categoria: 'Mercado', natureza: 'operacional' }
      }
      return { categoria: 'Cartao e compras', natureza: 'operacional' }
    }

    if (tipoNorm.includes('pix enviado') || tipoNorm.includes('qr code pix enviado')) {
      if (descNorm.includes('mais.mobi') || descNorm.includes('drogarias') || descNorm.includes('pacheco') || descNorm.includes('farmaceutic')) {
        return { categoria: 'Taxas e servicos', natureza: 'operacional' }
      }
      if (descNorm.includes('municipio') || descNorm.includes('rio de janeiro')) {
        return { categoria: 'Impostos e taxas', natureza: 'operacional' }
      }
      if (descNorm.includes('condominio') || descNorm.includes('edificio')) {
        return { categoria: 'Moradia', natureza: 'pessoal' }
      }
      return { categoria: 'Transferencia', natureza: 'pessoal' }
    }

    return {
      categoria: valorNum >= 0 ? 'Outras entradas' : 'Outras saidas',
      natureza: valorNum >= 0 ? 'entrada' : 'operacional'
    }
  }

  function getHashDuplicidadeFinanceiro({ data, valor, tipo, descricao }) {
    const base = [
      data,
      Number(valor || 0).toFixed(2),
      normalizarTextoFinanceiro(tipo),
      normalizarTextoFinanceiro(descricao)
    ].join('|')
    let hash = 2166136261
    for (let i = 0; i < base.length; i++) {
      hash ^= base.charCodeAt(i)
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }
    return `fin-${(hash >>> 0).toString(36)}-${base}`
  }

  function normalizarLancamentoFinanceiro(dados = {}) {
    const data = String(dados.data || '').slice(0, 10)
    const valor = Number(dados.valor || 0)
    const tipoLegado = !dados.tipo && !dados.categoria && valor > 0 ? 'Pix recebido' : ''
    const tipo = String(dados.tipo || tipoLegado).trim()
    const descricao = String(dados.descricao || '').trim()
    const classificacao = classificarLancamentoFinanceiro({ tipo, descricao, valor })
    const mes_ref = dados.mes_ref || getMesRef(data)
    const hash_duplicidade = dados.hash_duplicidade || getHashDuplicidadeFinanceiro({ data, valor, tipo, descricao })

    return {
      data,
      valor,
      tipo,
      descricao,
      categoria: dados.categoria || classificacao.categoria,
      natureza: dados.natureza || classificacao.natureza,
      mes_ref,
      hash_duplicidade
    }
  }

  function failValidation(message) {
    notify(message, 'error')
    const error = new Error(message)
    error.validation = true
    throw error
  }

  function hasDuplicateName(items, nome, uuid) {
    const nomeNorm = normalizar(nome)
    return items.some(item => item.uuid !== uuid && normalizar(item.nome) === nomeNorm)
  }

  function contarUsoProduto(uuid) {
    const emReceitas = receitas.value.filter(r =>
      (r.ingredientes || []).some(ing => ing.tipo === 'produto' && ing.id === uuid)
    ).length

    const emProducoes = producoes.value.filter(p =>
      (p.ingredientes_snapshot || []).some(ing => ing.tipo === 'produto' && ing.id === uuid)
    ).length

    return { emReceitas, emProducoes, total: emReceitas + emProducoes }
  }

  function contarUsoReceita(uuid) {
    const emReceitas = receitas.value.filter(r =>
      r.uuid !== uuid && (r.ingredientes || []).some(ing => ing.tipo === 'receita' && ing.id === uuid)
    ).length

    const emProducoes = producoes.value.filter(p =>
      p.receita_id === uuid || (p.ingredientes_snapshot || []).some(ing => ing.tipo === 'receita' && ing.id === uuid)
    ).length

    return { emReceitas, emProducoes, total: emReceitas + emProducoes }
  }

  function formatarUso({ emReceitas, emProducoes }) {
    const partes = []
    if (emReceitas) partes.push(`${emReceitas} receita${emReceitas > 1 ? 's' : ''}`)
    if (emProducoes) partes.push(`${emProducoes} producao${emProducoes > 1 ? 'oes' : ''}`)
    return partes.join(' e ')
  }

  // ── UI Actions ────────────────────────────
  function setTab(t) { tab.value = t }

  function openModal(id, props = {}) { modal.value = { id, props } }
  function closeModal() { modal.value = null }

  let _toastTimer = null
  function notify(msg, tipo = 'success', ms = 3000) {
    clearTimeout(_toastTimer)
    toast.value = { msg, tipo, id: Date.now() }
    if (ms > 0) _toastTimer = setTimeout(() => toast.value = null, ms)
  }

  // ── INIT ──────────────────────────────────
  async function init() {
    await migrateLegacyDbIfNeeded()
    await garantirPersistencia()
    loading.value = true
    try {
      const [p, r, pr, fin, cfg] = await Promise.all([
        db.produtos.toArray(),
        db.receitas.toArray(),
        db.producoes.toArray(),
        db.financeiro.orderBy('data').reverse().toArray(),
        configGet('company')
      ])
      produtos.value  = p
      receitas.value  = r.map(receita => ({
        ...receita,
        categoria: normalizeReceitaCategoria(receita.categoria)
      }))
      producoes.value = pr
      financeiro.value = fin
      if (cfg) company.value = cfg
    } finally {
      loading.value = false
    }
  }

  // ── BACKUP ────────────────────────────────
  async function backupGeral() {
    const dados = await exportarDados()
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chocostoq-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    notify('Backup baixado com sucesso!')
  }

  async function backupGoogleDrive() {
    if (!googleDriveConfigured.value) {
      notify('Configure o Google Client ID para usar o backup no Drive', 'error')
      return
    }

    try {
      const dados = await exportarDados()
      await salvarBackupNoDrive(dados)
      notify('Backup enviado para o Google Drive!')
    } catch (error) {
      console.error(error)
      notify('Nao foi possivel enviar o backup para o Google Drive', 'error')
    }
  }

  async function restaurarGeral(arquivo) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const dados = JSON.parse(e.target.result)
        await importarDados(dados)
        notify('Dados restaurados! Recarregando…')
        setTimeout(() => location.reload(), 1500)
      } catch {
        notify('Erro ao restaurar backup', 'error')
      }
    }
    reader.readAsText(arquivo)
  }

  async function restaurarGoogleDrive() {
    if (!googleDriveConfigured.value) {
      notify('Configure o Google Client ID para usar a restauracao do Drive', 'error')
      return
    }

    try {
      const dados = await restaurarBackupDoDrive()
      await importarDados(dados)
      notify('Backup do Google Drive restaurado! Recarregando…')
      setTimeout(() => location.reload(), 1500)
    } catch (error) {
      console.error(error)
      notify(
        error?.message === 'Nenhum backup encontrado no Google Drive'
          ? 'Nenhum backup encontrado no Google Drive'
          : 'Nao foi possivel restaurar o backup do Google Drive',
        'error'
      )
    }
  }

  // ── PRODUÇÕES ─────────────────────────────
  async function carregarProducoes(dias = 7) {
    if (dias <= 0) {
      producoes.value = await db.producoes.toArray()
    } else {
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)
      const iso = desde.toISOString().slice(0, 10)
      producoes.value = await db.producoes
        .where('data_producao')
        .aboveOrEqual(iso)
        .toArray()
    }
  }

  async function carregarFinanceiro() {
    financeiro.value = await db.financeiro.orderBy('data').reverse().toArray()
  }

  async function importarLancamentosFinanceiros(lancamentos = []) {
    const preparadosBase = lancamentos
      .map(normalizarLancamentoFinanceiro)
      .filter(item => item.data && item.descricao && Number.isFinite(item.valor) && item.tipo)

    const preparados = []
    const hashesNoArquivo = new Set()

    for (const item of preparadosBase) {
      if (hashesNoArquivo.has(item.hash_duplicidade)) continue
      hashesNoArquivo.add(item.hash_duplicidade)
      preparados.push(item)
    }

    if (!preparados.length) {
      return {
        recebidos: lancamentos.length,
        validos: 0,
        importados: 0,
        duplicados: 0,
        totalImportado: 0
      }
    }

    const hashes = [...new Set(preparados.map(item => item.hash_duplicidade))]
    const existentes = hashes.length
      ? await db.financeiro.where('hash_duplicidade').anyOf(hashes).toArray()
      : []
    const hashesExistentes = new Set(existentes.map(item => item.hash_duplicidade))
    const novos = preparados.filter(item => !hashesExistentes.has(item.hash_duplicidade))

    if (novos.length) {
      await db.financeiro.bulkAdd(novos)
      await carregarFinanceiro()
    }

    return {
      recebidos: lancamentos.length,
      validos: preparados.length,
      importados: novos.length,
      duplicados: preparados.length - novos.length,
      totalImportado: novos.reduce((acc, item) => acc + Number(item.valor || 0), 0),
      receitasImportadas: novos
        .filter(item => item.natureza === 'entrada')
        .reduce((acc, item) => acc + Number(item.valor || 0), 0),
      saidasImportadas: novos
        .filter(item => item.valor < 0)
        .reduce((acc, item) => acc + Math.abs(Number(item.valor || 0)), 0)
    }
  }

  async function atualizarLancamentoFinanceiro(id, dadosAtualizacao) {
    const lancamento = await db.financeiro.get(id)
    if (!lancamento) {
      notify('Lançamento não encontrado.', 'error')
      return
    }

    const atualizado = {
      ...lancamento,
      ...dadosAtualizacao,
      editado_manualmente: true
    }

    await db.financeiro.put(atualizado)
    await carregarFinanceiro()
    notify('Categoria atualizada!')
  }

  async function deletarLancamentoFinanceiro(id) {
    await db.financeiro.delete(id)
    await carregarFinanceiro()
    notify('Lançamento removido!')
  }

  // ── CRUD: INGREDIENTES (produtos) ────────
  async function salvarProduto(dados) {
    const obj = clean(dados)
    obj.uuid = obj.uuid || crypto.randomUUID()
    obj.nome = String(obj.nome || '').trim()

    if (!obj.nome) failValidation('Informe o nome do ingrediente.')
    if (hasDuplicateName(produtos.value, obj.nome, obj.uuid)) failValidation('Ja existe um ingrediente com esse nome.')
    if (Number(obj.fator_conversao || 0) <= 0) failValidation('Informe uma quantidade valida na embalagem.')
    if (Number(obj.custo_por_unidade || 0) < 0) failValidation('O preco de compra nao pode ser negativo.')
    if (Number(obj.peso_unitario || 0) < 0) failValidation('O peso por unidade nao pode ser negativo.')
    if (Number(obj.estoque_atual || 0) < 0) failValidation('O estoque atual nao pode ser negativo.')
    if (Number(obj.estoque_minimo || 0) < 0) failValidation('O estoque minimo nao pode ser negativo.')

    await db.produtos.put(obj)
    const i = produtos.value.findIndex(p => p.uuid === obj.uuid)
    if (i >= 0) {
      produtos.value[i] = obj
      notify('Ingrediente atualizado!')
    } else {
      produtos.value.push(obj)
      notify('Ingrediente salvo!')
    }
    return obj
  }

  async function excluirProduto(uuid) {
    if (!uuid) return console.error('Tentativa de excluir produto sem UUID')
    const uso = contarUsoProduto(uuid)
    if (uso.total) failValidation(`Nao foi possivel excluir este ingrediente porque ele ainda esta em uso em ${formatarUso(uso)}.`)
    await db.produtos.delete(uuid)
    produtos.value = produtos.value.filter(p => p.uuid !== uuid)
    notify('Ingrediente removido!')
  }

  // ── CRUD: RECEITAS ────────────────────────
  async function salvarReceita(dados) {
    const obj = clean(dados)
    obj.uuid = obj.uuid || crypto.randomUUID()
    obj.nome = String(obj.nome || '').trim()
    obj.categoria = normalizeReceitaCategoria(obj.categoria)

    if (!obj.nome) failValidation('Informe o nome da receita.')
    if (hasDuplicateName(receitas.value, obj.nome, obj.uuid)) failValidation('Ja existe uma receita com esse nome.')
    if (Number(obj.rendimento || 0) <= 0) failValidation('Informe um rendimento maior que zero.')
    if (Number(obj.preco_sugerido || 0) < 0) failValidation('O preco sugerido nao pode ser negativo.')
    if (Number(obj.peso_unitario || 0) < 0) failValidation('O peso por unidade nao pode ser negativo.')

    const ingredientes = Array.isArray(obj.ingredientes) ? obj.ingredientes : []
    if (!ingredientes.length) failValidation('Adicione pelo menos um ingrediente a receita.')

    const temIngredienteInvalido = ingredientes.some(ing => !ing?.id || Number(ing.quantidade || 0) <= 0)
    if (temIngredienteInvalido) failValidation('Revise os ingredientes: cada item precisa ter nome e quantidade maior que zero.')

    await db.receitas.put(obj)
    const i = receitas.value.findIndex(r => r.uuid === obj.uuid)
    if (i >= 0) {
      receitas.value[i] = obj
      notify('Receita atualizada!')
    } else {
      receitas.value.push(obj)
      notify('Receita criada!')
    }
    return obj
  }

  async function excluirReceita(uuid) {
    if (!uuid) return console.error('Tentativa de excluir receita sem UUID')
    const uso = contarUsoReceita(uuid)
    if (uso.total) failValidation(`Nao foi possivel excluir esta receita porque ela ainda esta em uso em ${formatarUso(uso)}.`)
    await db.receitas.delete(uuid)
    receitas.value = receitas.value.filter(r => r.uuid !== uuid)
    notify('Receita removida!')
  }

  // ── PRODUÇÃO ──────────────────────────────
  async function registrarProducao(dados) {
    const obj = clean(dados)
    obj.uuid = obj.uuid || crypto.randomUUID()
    obj.data_producao = obj.data_producao || new Date().toISOString()
    // O campo ingredientes_snapshot deve vir preenchido da View
    await db.producoes.put(obj)
    producoes.value.unshift(obj)
    notify('Produção registrada!')
    return obj
  }

  async function registrarLoteProducao(itens) {
    for (const item of itens) await registrarProducao(item)
  }

  async function estornarProducao(uuid) {
    if (!uuid) return console.error('Tentativa de estornar produção sem UUID')
    await db.producoes.delete(uuid)
    producoes.value = producoes.value.filter(p => p.uuid !== uuid)
    notify('Produção estornada!')
  }

  // ── CONFIG ────────────────────────────────
  function saveCompany(data) {
    company.value = { ...company.value, ...data }
    configSet('company', company.value)
  }

  // ── LÓGICA DE NEGÓCIO (Cálculos de Custos e Pesos) ───────────

  /** Custo por unidade de medida (ex: preço por grama) */
  function getPrecoUnitarioInsumo(prod) {
    if (!prod || !prod.fator_conversao) return 0
    return (prod.custo_por_unidade || 0) / prod.fator_conversao
  }

  function getCustoTotal(recipe, visitados = new Set(), cache = new Map()) {
    if (!recipe || !recipe.ingredientes) return 0
    const uuid = recipe.uuid || 'temp'
    if (cache.has(uuid)) return cache.get(uuid)
    if (uuid !== 'temp' && visitados.has(uuid)) return 0
    if (uuid !== 'temp') visitados.add(uuid)

    let total = 0
    for (const ing of recipe.ingredientes) {
      const qtd = Number(ing.quantidade || 0)
      if (qtd <= 0) continue

      if (ing.tipo === 'receita') {
        const sub = receitas.value.find(x => x.uuid === ing.id)
        if (!sub || !sub.rendimento) continue
        total += (getCustoTotal(sub, visitados, cache) / sub.rendimento) * qtd
      } else {
        const prod = produtos.value.find(p => p.uuid === ing.id)
        total += getPrecoUnitarioInsumo(prod) * qtd
      }
    }

    if (uuid !== 'temp') cache.set(uuid, total)
    return total
  }

  /** 
   * Explode uma receita em seus insumos básicos de forma recursiva.
   * Útil para Dashboard e Cozinha.
   */
  function expandirIngredientes(ingredientes, fator, mapa = {}, visitados = new Set()) {
    for (const ing of ingredientes) {
      const qtdEscalada = (ing.quantidade || 0) * fator
      if (qtdEscalada <= 0) continue

      if (ing.tipo === 'receita') {
        const sub = receitas.value.find(x => x.uuid === ing.id)
        if (!sub || !sub.rendimento || visitados.has(sub.uuid)) continue
        
        const novosVisitados = new Set(visitados)
        novosVisitados.add(sub.uuid)
        
        expandirIngredientes(sub.ingredientes || [], qtdEscalada / sub.rendimento, mapa, novosVisitados)
      } else {
        const prod = produtos.value.find(p => p.uuid === ing.id)
        if (!prod) continue
        
        if (!mapa[prod.uuid]) {
          mapa[prod.uuid] = { id: prod.uuid, nome: prod.nome, total: 0, unidade: prod.unidade_base }
        }
        mapa[prod.uuid].total += qtdEscalada
      }
    }
    return mapa
  }

  /** Informações de lucratividade de uma receita */
  function getLucroInfo(recipe) {
    const custoTotal = getCustoTotal(recipe)
    const rendimento = Number(recipe.rendimento || 1) || 1
    const custoUnit = custoTotal / rendimento
    const venda = Number(recipe.preco_sugerido || 0)
    const valor = venda - custoUnit
    const percentual = venda > 0 ? (valor / venda) * 100 : 0
    return { valor, percentual, custoUnit, custoTotal }
  }

  /** Soma o peso físico de todos os ingredientes de uma receita */
  function getPesoTotal(recipe) {
    if (!recipe || !recipe.ingredientes) return 0
    return recipe.ingredientes.reduce((acc, ing) => {
      const qtd = Number(ing.quantidade || 0)
      if (qtd <= 0) return acc

      const alvo = ing.tipo === 'receita' 
        ? receitas.value.find(x => x.uuid === ing.id) 
        : produtos.value.find(x => x.uuid === ing.id)

      // Prioridade total à escolha manual (gera_peso), senão fallback por tipo/nome
      let soma = ing.gera_peso ?? true
      if (alvo?.tipo === 'embalagem') soma = false
      if (alvo && isInsumoSemPeso(alvo.nome)) soma = false
      
      if (!soma) return acc

      if (ing.tipo === 'produto') {
        // Se unidade e tem peso definido, soma peso. Senão assume que a qtd é o peso (g/ml)
        if (alvo?.unidade_base === 'un' && (alvo.peso_unitario || 0) > 0) {
          return acc + (qtd * alvo.peso_unitario)
        }
        return acc + qtd
      } else {
        const unit = String(alvo?.unidade_rendimento || '').toLowerCase()
        if (unit === 'g') return acc + qtd
        if (unit === 'kg') return acc + (qtd * 1000)
        if (unit === 'un') {
          const pw = Number(alvo?.peso_unitario || 0)
          return acc + (pw > 0 ? (qtd * pw) : qtd)
        }
        return acc + qtd
      }
    }, 0)
  }

  const resumoFinanceiroPorMes = computed(() => {
    const meses = new Map()

    financeiro.value.forEach(item => {
      const mesRef = item.mes_ref || getMesRef(item.data)
      if (!mesRef) return

      if (!meses.has(mesRef)) {
        meses.set(mesRef, {
          mes_ref: mesRef,
          total: 0,
          quantidade: 0,
          entradas: 0,
          receitas_mei: 0,
          saidas_operacionais: 0,
          saidas_pessoais: 0,
          rendimento_financeiro: 0
        })
      }

      const atual = meses.get(mesRef)
      const valor = Number(item.valor || 0)
      atual.total += valor
      atual.quantidade += 1

      if (item.natureza === 'entrada') atual.entradas += valor
      if (item.categoria === 'Receita') atual.receitas_mei += valor
      if (item.categoria === 'Rendimento financeiro') atual.rendimento_financeiro += valor
      if (item.natureza === 'operacional' && valor < 0) atual.saidas_operacionais += Math.abs(valor)
      if (item.natureza === 'pessoal' && valor < 0) atual.saidas_pessoais += Math.abs(valor)
    })

    return [...meses.values()].sort((a, b) => {
      const [mesA, anoA] = a.mes_ref.split('/')
      const [mesB, anoB] = b.mes_ref.split('/')
      return `${anoB}${mesB}`.localeCompare(`${anoA}${mesA}`)
    })
  })

  const totalRecebidoAnoAtual = computed(() => {
    const anoAtual = String(new Date().getFullYear())
    return resumoFinanceiroPorMes.value
      .filter(item => item.mes_ref.endsWith(`/${anoAtual}`))
      .reduce((acc, item) => acc + Number(item.receitas_mei || 0), 0)
  })

  const resumoFinanceiroCategorias = computed(() => {
    const categorias = new Map()

    financeiro.value.forEach(item => {
      const chave = item.categoria || 'Sem categoria'
      if (!categorias.has(chave)) {
        categorias.set(chave, {
          categoria: chave,
          total: 0,
          quantidade: 0,
          natureza: item.natureza || 'operacional'
        })
      }

      const atual = categorias.get(chave)
      atual.total += Math.abs(Number(item.valor || 0))
      atual.quantidade += 1
    })

    return [...categorias.values()].sort((a, b) => b.total - a.total)
  })

  const relatorioMensalMei = computed(() => {
    return resumoFinanceiroPorMes.value.map(item => ({
      ...item,
      saldo_operacional: Number(item.receitas_mei || 0) - Number(item.saidas_operacionais || 0)
    }))
  })

  return {
    // UI
    tab, loading, toast, modal,
    setTab, notify, openModal, closeModal,

    // Dados
    produtos, receitas, producoes, financeiro,

    // Config
    company, googleDriveConfigured, saveCompany,

    // Ações
    init, carregarProducoes, carregarFinanceiro, importarLancamentosFinanceiros,
    atualizarLancamentoFinanceiro, deletarLancamentoFinanceiro,
    getCustoTotal, getPrecoUnitarioInsumo, getLucroInfo, getPesoTotal,
    expandirIngredientes,
    resumoFinanceiroPorMes, resumoFinanceiroCategorias, relatorioMensalMei, totalRecebidoAnoAtual,
    salvarProduto, excluirProduto,
    salvarReceita, excluirReceita,
    registrarProducao, registrarLoteProducao, estornarProducao,
    backupGeral, restaurarGeral, backupGoogleDrive, restaurarGoogleDrive
  }
})
