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
  const contasFinanceiras = ref([])

  // ── Config ────────────────────────────────
  const company = ref({
    nome: 'ChocoBete Produção',
    slogan: 'Registro de Produção',
    posicao_etiqueta: 0,
    razao_social: '',
    cnpj: '',
    cpf: '',
    municipio: '',
    uf: '',
    cnae: '',
    teto_mei_anual: 81000,
    pessoas_familia: 1
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

  const normalizarTextoDuplicidadeFinanceiro = (texto) =>
    normalizarTextoFinanceiro(texto)
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  function gerarContaId() {
    return `conta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function normalizarContaFinanceira(conta = {}) {
    return {
      id: conta.id || gerarContaId(),
      nome: String(conta.nome || '').trim(),
      banco: normalizarTextoFinanceiro(conta.banco || ''),
      titular: String(conta.titular || '').trim(),
      natureza: conta.natureza === 'empresarial' ? 'empresarial' : 'pessoal',
      papel: String(conta.papel || '').trim()
    }
  }

  function getContaFinanceiraById(id) {
    return contasFinanceiras.value.find(conta => conta.id === id) || null
  }

  function getContasFinanceirasPorBanco(banco) {
    const bancoNorm = normalizarTextoFinanceiro(banco || '')
    return contasFinanceiras.value.filter(conta => conta.banco === bancoNorm)
  }

  function resolverContaFinanceira(dados = {}) {
    if (dados.conta_id) {
      const conta = getContaFinanceiraById(dados.conta_id)
      if (conta) return conta
    }

    const contasMesmoBanco = getContasFinanceirasPorBanco(dados.banco || '')
    if (contasMesmoBanco.length === 1) return contasMesmoBanco[0]
    return null
  }

  function getMesRef(dataIso) {
    const [ano, mes] = String(dataIso || '').split('-')
    return ano && mes ? `${mes}/${ano}` : ''
  }

  function normalizarTipoFinanceiro(tipo) {
    return normalizarTextoFinanceiro(tipo)
  }

  // ─────────────────────────────────────────────────────────────
  // CATEGORIAS MEI — padrão contábil simplificado
  // natureza: 'entrada' | 'operacional' | 'pessoal' | 'interna'
  // ─────────────────────────────────────────────────────────────
  //
  // Conta PJ → PagBank   (banco: 'pagbank')
  // Conta PF → Itaú / BB (banco: 'itau' | 'bb')
  // REGRA: TODO pix recebido = Receita de Vendas (empresa),
  //        mesmo vindo do Itaú (período de migração PF→PJ).
  //
  // Transferências entre contas PRÓPRIAS (Itaú→PagBank ou PagBank→Itaú):
  //   natureza 'interna' → excluída dos totais de receita e despesa.

  const CATEGORIAS_MEI = [
    // ── RECEITAS ──────────────────────────────────────────────
    { nome: 'Receita de Vendas',        natureza: 'entrada',      grupo: 'Receitas',           icon: 'fa-arrow-trend-up' },
    { nome: 'Outras Receitas',           natureza: 'entrada',      grupo: 'Receitas',           icon: 'fa-plus-circle' },
    { nome: 'Rendimento Financeiro',     natureza: 'entrada',      grupo: 'Receitas',           icon: 'fa-piggy-bank' },
    { nome: 'Renda Pessoal',             natureza: 'pessoal',      grupo: 'Receitas Pessoais',  icon: 'fa-hand-holding-heart' },
    // ── CUSTOS OPERACIONAIS (dedutíveis MEI) ──────────────────
    { nome: 'Insumos e Matéria-Prima',   natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-basket-shopping' },
    { nome: 'Embalagens e Materiais',    natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-box' },
    { nome: 'Manutenção e Reparos',      natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-screwdriver-wrench' },
    { nome: 'Serviços e Assinaturas',    natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-receipt' },
    { nome: 'Transporte e Entrega',      natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-truck' },
    { nome: 'Tarifas Bancárias',         natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-landmark' },
    { nome: 'Impostos e Contribuições',  natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-file-invoice-dollar' },
    { nome: 'Outras Despesas',           natureza: 'operacional',  grupo: 'Custos Operacionais', icon: 'fa-minus-circle' },
    // ── DESPESAS PESSOAIS (não dedutíveis) ────────────────────
    { nome: 'Pró-labore / Retirada',    natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-user-tie' },
    { nome: 'Moradia',                   natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-house' },
    { nome: 'Condomínio',                natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-building' },
    { nome: 'Energia Elétrica',          natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-bolt' },
    { nome: 'Gás',                       natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-fire-flame-simple' },
    { nome: 'Internet e Telefonia',      natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-wifi' },
    { nome: 'Alimentação Pessoal',       natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-utensils' },
    { nome: 'Padaria e Lanchonete',      natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-utensils' },
    { nome: 'Mercado',                   natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-utensils' },
    { nome: 'Saúde e Bem-Estar',         natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-heart-pulse' },
    { nome: 'Vestuário e Compras',       natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-shirt' },
    { nome: 'Compras no Débito',         natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-credit-card' },
    { nome: 'Lazer e Outros Pessoais',   natureza: 'pessoal',      grupo: 'Despesas Pessoais',  icon: 'fa-star' },
    // ── ESPECIAL ──────────────────────────────────────────────
    { nome: 'Transferência Interna',     natureza: 'interna',      grupo: 'Especial',           icon: 'fa-arrow-right-arrow-left' },
  ]

  // Termos que identificam remetente/destinatário como conta própria
  const TERMOS_CONTA_PROPRIA = [
    'pagbank', 'pagseguro', 'banco inter', 'nubank', 'c6 bank',
    'itau', 'itaú', 'banco itau', 'banco do brasil', 'bradesco',
    'transf propria', 'transferencia propria', 'conta propria'
  ]
  const TERMOS_ESTRITOS_INTERNA = ['transf propria', 'transferencia propria', 'conta propria', 'entre contas', 'mesmo titular']

  const NOMES_PROPRIETARIOS = [
    'yves',
    'yves mauricio',
    'elisabete',
    'elisabete batista',
    'bete'
  ]

  // PIX recebidos de Evelyn Ribeiro não compõem receita MEI (renda pessoal separada do negócio)
  const NOMES_RENDA_PESSOAL = ['evelyn', 'evelyn ribeiro']

  function hasNomeRendaPessoal(descNorm) {
    return NOMES_RENDA_PESSOAL.some(nome => descNorm.includes(nome))
  }

  function isMovimentoTransferenciaSaida(tipoNorm, valorNum) {
    return valorNum < 0 && (
      tipoNorm.includes('pix enviado') ||
      tipoNorm.includes('qr code pix enviado') ||
      tipoNorm.includes('pix transf') ||
      tipoNorm.includes('ted') ||
      tipoNorm.includes('doc')
    )
  }

  function isMovimentoTransferenciaEntrada(tipoNorm, valorNum) {
    return valorNum > 0 && (
      tipoNorm.includes('pix recebido') ||
      tipoNorm.includes('qr code pix recebido') ||
      tipoNorm.includes('pix transf') ||
      tipoNorm.includes('ted recebido')
    )
  }

  function hasNomeProprietario(descNorm) {
    return NOMES_PROPRIETARIOS.some(nome => descNorm.includes(nome))
  }

  function isTransferenciaInterna(descNorm, tipoNorm, valorNum) {
    if (!isMovimentoTransferenciaSaida(tipoNorm, valorNum)) return false
    // Só é interna se houver termo explícito de "propria" ou banco conhecido.
    return TERMOS_ESTRITOS_INTERNA.some(t => descNorm.includes(t)) || TERMOS_CONTA_PROPRIA.some(t => descNorm.includes(t))
  }

  // PIX recebido vindo de conta própria (ex: PagBank recebendo do Itaú)
  function isPixRecebidoInterno(descNorm, tipoNorm, valorNum) {
    if (!isMovimentoTransferenciaEntrada(tipoNorm, valorNum)) return false
    // IMPORTANTE: Evitar que PIX de cliente vindo de "Itaú" caia aqui.
    // Exigimos que a descrição seja explicitamente de transferência própria ou contenha seu nome.
    return TERMOS_ESTRITOS_INTERNA.some(t => descNorm.includes(t)) || 
           hasNomeProprietario(descNorm) ||
           (TERMOS_CONTA_PROPRIA.some(t => descNorm.includes(t)) && hasNomeProprietario(descNorm))
  }

  function diferencaDias(dataA, dataB) {
    const a = new Date(`${String(dataA || '').slice(0, 10)}T00:00:00`)
    const b = new Date(`${String(dataB || '').slice(0, 10)}T00:00:00`)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return Infinity
    return Math.abs(a.getTime() - b.getTime()) / 86400000
  }

  function isParTransferenciaInterna(origem, destino) {
    if (!origem || !destino) return false
    if ((origem.banco || '') === (destino.banco || '')) return false

    const valorOrigem = Number(origem.valor || 0)
    const valorDestino = Number(destino.valor || 0)
    if (!(valorOrigem < 0 && valorDestino > 0)) return false
    if (Math.abs(Math.abs(valorOrigem) - Math.abs(valorDestino)) > 0.009) return false
    if (diferencaDias(origem.data, destino.data) > 3) return false

    const origemTipo = normalizarTipoFinanceiro(origem.tipo)
    const destinoTipo = normalizarTipoFinanceiro(destino.tipo)
    if (!isMovimentoTransferenciaSaida(origemTipo, valorOrigem)) return false
    if (!isMovimentoTransferenciaEntrada(destinoTipo, valorDestino)) return false

    const origemDesc = normalizarTextoFinanceiro(origem.descricao)
    const destinoDesc = normalizarTextoFinanceiro(destino.descricao)

    return (
      isPixRecebidoInterno(destinoDesc, destinoTipo, valorDestino) ||
      TERMOS_ESTRITOS_INTERNA.some(t => origemDesc.includes(t)) ||
      TERMOS_ESTRITOS_INTERNA.some(t => destinoDesc.includes(t))
    )
  }

  function reconciliarTransferenciasInternas(lancamentos = []) {
    const atualizados = lancamentos.map(item => ({ ...item }))
    const entradasPorValor = new Map()

    atualizados.forEach((item, index) => {
      const valor = Number(item.valor || 0)
      const tipoNorm = normalizarTipoFinanceiro(item.tipo)
      if (!isMovimentoTransferenciaEntrada(tipoNorm, valor)) return
      const chave = Math.abs(valor).toFixed(2)
      const bucket = entradasPorValor.get(chave) || []
      bucket.push({ item, index })
      entradasPorValor.set(chave, bucket)
    })

    atualizados.forEach((item, index) => {
      if (item.editado_manualmente) return

      const valor = Number(item.valor || 0)
      const tipoNorm = normalizarTipoFinanceiro(item.tipo)
      if (!isMovimentoTransferenciaSaida(tipoNorm, valor)) return

      const candidatos = entradasPorValor.get(Math.abs(valor).toFixed(2)) || []
      const par = candidatos.find(({ item: entrada }) => isParTransferenciaInterna(item, entrada))
      if (!par) return

      atualizados[index] = {
        ...atualizados[index],
        categoria: 'Transferência Interna',
        natureza: 'interna'
      }

      if (!atualizados[par.index].editado_manualmente) {
        atualizados[par.index] = {
          ...atualizados[par.index],
          categoria: 'Transferência Interna',
          natureza: 'interna'
        }
      }
    })

    return atualizados
  }

  function classificarLancamentoFinanceiro({ tipo, descricao, valor, banco, conta = null }) {
    const tipoNorm = normalizarTipoFinanceiro(tipo)
    const descNorm = normalizarTextoFinanceiro(descricao)
    const valorNum = Number(valor || 0)
    const contaEmpresarial = conta?.natureza === 'empresarial'
    const contaPessoal = conta?.natureza === 'pessoal'

    // ── 1. Transferência de saída entre contas próprias ──────
    if (isTransferenciaInterna(descNorm, tipoNorm, valorNum)) {
      return { categoria: 'Transferência Interna', natureza: 'interna' }
    }

    // ── 2. PIX recebido de conta própria (ex: repasse Itaú→PagBank) ──
    if (isPixRecebidoInterno(descNorm, tipoNorm, valorNum)) {
      return { categoria: 'Transferência Interna', natureza: 'interna' }
    }

    // ── 3. RECEITAS — PIX de terceiros ─────────────────────────────
    // 3a. PIX de Evelyn Ribeiro → renda pessoal separada da receita MEI
    if (
      (tipoNorm.includes('pix recebido') || tipoNorm.includes('qr code pix recebido') ||
      (tipoNorm.includes('pix transf') && valorNum > 0)) &&
      hasNomeRendaPessoal(descNorm)
    ) {
      return { categoria: 'Renda Pessoal', natureza: 'pessoal' }
    }

    // 3b. Demais PIX recebidos de clientes → Receita de Vendas MEI
    if (
      (tipoNorm.includes('pix recebido') || tipoNorm.includes('qr code pix recebido') ||
      tipoNorm.includes('pix transf')) && valorNum > 0
    ) {
      return { categoria: 'Receita de Vendas', natureza: 'entrada' }
    }

    // ── 4. Rendimentos de aplicação ──────────────────────────
    if (tipoNorm.includes('rendimento') || tipoNorm.includes('rend pago') || descNorm.includes('aplic aut')) {
      return { categoria: 'Rendimento Financeiro', natureza: 'entrada' }
    }

    // ── 5. Tarifas e anuidades bancárias ────────────────────
    if (tipoNorm.includes('tarifa') || tipoNorm.startsWith('tar ') || descNorm.includes('anuidade')) {
      return { categoria: 'Tarifas Bancárias', natureza: 'operacional' }
    }

    // ── 6. Impostos e contribuições (DAS MEI, ISS, INSS) ────
    if (
      descNorm.includes('das mei') || descNorm.includes('contrib mei') ||
      descNorm.includes('municipio') || descNorm.includes('prefeitura') ||
      descNorm.includes('receita federal') || descNorm.includes('inss') ||
      descNorm.includes('issqn') || descNorm.includes('iss ')
    ) {
      return { categoria: 'Impostos e Contribuições', natureza: 'operacional' }
    }

    // ── 7. Insumos e matéria-prima (compras para produção) ──
    if (
      descNorm.includes('supermerc') || descNorm.includes('mercado') ||
      descNorm.includes('acougue') || descNorm.includes('biscoito') ||
      descNorm.includes('casas pedro') || descNorm.includes('superdoce') ||
      descNorm.includes('tarita doces') || descNorm.includes('atacado')
    ) {
      if (contaPessoal) return { categoria: 'Alimentação Pessoal', natureza: 'pessoal' }
      return { categoria: 'Insumos e Matéria-Prima', natureza: 'operacional' }
    }

    // ── 8. Embalagens e materiais ────────────────────────────
    if (
      descNorm.includes('embalagem') || descNorm.includes('caixa') ||
      descNorm.includes('sacola') || descNorm.includes('descartav') ||
      descNorm.includes('plastico') || descNorm.includes('pote')
    ) {
      return { categoria: 'Embalagens e Materiais', natureza: 'operacional' }
    }

    // ── 9. Manutenção e reparos ──────────────────────────────
    if (
      descNorm.includes('manutenc') || descNorm.includes('reparo') ||
      descNorm.includes('conserto') || descNorm.includes('tecnico') ||
      descNorm.includes('assistencia') || descNorm.includes('boa casa') ||
      descNorm.includes('cumani') || descNorm.includes('madeira')
    ) {
      return { categoria: 'Manutenção e Reparos', natureza: 'operacional' }
    }

    // ── 10. Serviços e assinaturas ───────────────────────────
    if (
      descNorm.includes('mais.mobi') || descNorm.includes('google') ||
      descNorm.includes('meta ') || descNorm.includes('instagram') ||
      descNorm.includes('canva') || descNorm.includes('assinatura') ||
      descNorm.includes('mensalidade')
    ) {
      if (
        contaPessoal &&
        (
          descNorm.includes('internet') || descNorm.includes('fibra') ||
          descNorm.includes('claro') || descNorm.includes('vivo') ||
          descNorm.includes('tim') || descNorm.includes('oi ')
        )
      ) {
        return { categoria: 'Internet e Telefonia', natureza: 'pessoal' }
      }
      return { categoria: 'Serviços e Assinaturas', natureza: 'operacional' }
    }

    // ── 11. Transporte e entrega ─────────────────────────────
    if (
      descNorm.includes('uber') || descNorm.includes('99pop') || descNorm.includes('grab') ||
      descNorm.includes('correios') || descNorm.includes('jadlog') || descNorm.includes('loggi') ||
      descNorm.includes('combustivel') || descNorm.includes('posto ') || descNorm.includes('estacion')
    ) {
      return { categoria: 'Transporte e Entrega', natureza: 'operacional' }
    }

    // ── 12. Moradia (conta PF / pessoal) ────────────────────
    if (descNorm.includes('condominio') || descNorm.includes('edificio')) {
      return { categoria: 'Condomínio', natureza: 'pessoal' }
    }

    if (
      descNorm.includes('light') || descNorm.includes('enel') ||
      descNorm.includes('energia eletrica') || descNorm.includes('eletric')
    ) {
      return { categoria: 'Energia Elétrica', natureza: 'pessoal' }
    }

    if (
      descNorm.includes('ceg') || descNorm.includes('naturgy') ||
      descNorm.includes('gas ')
    ) {
      return { categoria: 'Gás', natureza: 'pessoal' }
    }

    if (
      descNorm.includes('internet') || descNorm.includes('fibra') ||
      descNorm.includes('claro') || descNorm.includes('vivo') ||
      descNorm.includes('tim') || descNorm.includes('oi ')
    ) {
      return { categoria: 'Internet e Telefonia', natureza: 'pessoal' }
    }

    if (
      descNorm.includes('aluguel') || descNorm.includes('iptu')
    ) {
      return { categoria: 'Moradia', natureza: 'pessoal' }
    }

    // ── 13. Saúde (pessoal) ──────────────────────────────────
    if (
      descNorm.includes('drogaria') || descNorm.includes('farmac') ||
      descNorm.includes('pacheco') || descNorm.includes('medico') ||
      descNorm.includes('hospital') || descNorm.includes('clinica')
    ) {
      return { categoria: 'Saúde e Bem-Estar', natureza: 'pessoal' }
    }

    // ── 14. Alimentação pessoal ──────────────────────────────
    if (
      descNorm.includes('padaria') || descNorm.includes('restaurante') ||
      descNorm.includes('lanchonete') || descNorm.includes('burger') ||
      descNorm.includes('le depan') || descNorm.includes('ifd ') ||
      descNorm.includes('ifood')
    ) {
      return { categoria: 'Alimentação Pessoal', natureza: 'pessoal' }
    }

    // ── 15. Vestuário e compras pessoais ────────────────────
    if (
      descNorm.includes('marisa') || descNorm.includes('lojas ame') ||
      descNorm.includes('shopping') || descNorm.includes('riachuelo') ||
      descNorm.includes('renner') || descNorm.includes('hering')
    ) {
      return { categoria: 'Vestuário e Compras', natureza: 'pessoal' }
    }

    // ── 16. Pró-labore / Retirada (PIX enviado conta PJ) ────
    if (
      (tipoNorm.includes('pix enviado') || tipoNorm.includes('ted')) &&
      (contaEmpresarial || banco === 'pagbank') && valorNum < 0
    ) {
      return { categoria: 'Pró-labore / Retirada', natureza: 'pessoal' }
    }

    // ── 17. Compras débito (conta PF = pessoal) ──────────────
    if (tipoNorm.includes('cartao de debito') || tipoNorm.includes('rshop')) {
      if (contaEmpresarial) return { categoria: 'Outras Despesas', natureza: 'operacional' }
      return { categoria: 'Compras no Débito', natureza: 'pessoal' }
    }

    // ── 18. Lazer e outros pessoais ──────────────────────────
    if (tipoNorm.includes('pix enviado') && valorNum < 0 && (contaPessoal || banco !== 'pagbank')) {
      return { categoria: 'Lazer e Outros Pessoais', natureza: 'pessoal' }
    }

    // ── fallback ─────────────────────────────────────────────
    return {
      categoria: valorNum >= 0 ? 'Outras Receitas' : 'Outras Despesas',
      natureza: valorNum >= 0 ? 'entrada' : 'operacional'
    }
  }

  function getAssinaturasDuplicidadeFinanceiro({ data, valor, tipo, descricao, banco }) {
    const valorNormalizado = Number(valor || 0).toFixed(2)
    const dataNormalizada = String(data || '').slice(0, 10)
    const bancoNormalizado = normalizarTextoFinanceiro(banco || 'pagbank')
    const tipoNormalizado = normalizarTextoDuplicidadeFinanceiro(tipo)
    const descricaoNormalizada = normalizarTextoDuplicidadeFinanceiro(descricao)

    return [
      [dataNormalizada, valorNormalizado, tipoNormalizado, descricaoNormalizada].join('|'),
      [bancoNormalizado, dataNormalizada, valorNormalizado, descricaoNormalizada].join('|'),
      [dataNormalizada, valorNormalizado, descricaoNormalizada].join('|')
    ]
  }

  function getHashDuplicidadeFinanceiro({ data, valor, tipo, descricao, banco }) {
    const base = [
      normalizarTextoFinanceiro(banco || 'pagbank'),
      String(data || '').slice(0, 10),
      Number(valor || 0).toFixed(2),
      normalizarTextoDuplicidadeFinanceiro(descricao)
    ].join('|')
    let hash = 2166136261
    for (let i = 0; i < base.length; i++) {
      hash ^= base.charCodeAt(i)
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }
    return `fin-${(hash >>> 0).toString(36)}-${base}`
  }

  function normalizarLancamentoFinanceiro(dados = {}) {
    const conta = resolverContaFinanceira(dados)
    const data = String(dados.data || '').slice(0, 10)
    const valor = Number(dados.valor || 0)
    const tipoLegado = !dados.tipo && !dados.categoria && valor > 0 ? 'Pix recebido' : ''
    const tipo = String(dados.tipo || tipoLegado).trim()
    const descricao = String(dados.descricao || '').trim()
    const banco = conta?.banco || dados.banco || 'pagbank'
    const classificacao = classificarLancamentoFinanceiro({ tipo, descricao, valor, banco, conta })
    const mes_ref = dados.mes_ref || getMesRef(data)
    const hash_duplicidade = dados.hash_duplicidade || getHashDuplicidadeFinanceiro({ data, valor, tipo, descricao, banco })

    // banco_tipo: 'pj' = conta empresarial, 'pf' = conta física (migração)
    const banco_tipo = banco === 'pagbank' ? 'pj' : 'pf'

    return {
      data,
      valor,
      tipo,
      descricao,
      banco,
      banco_tipo,
      conta_id: conta?.id || dados.conta_id || '',
      conta_nome: conta?.nome || dados.conta_nome || '',
      conta_titular: conta?.titular || dados.conta_titular || '',
      conta_natureza: conta?.natureza || dados.conta_natureza || '',
      conta_papel: conta?.papel || dados.conta_papel || '',
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
      const [p, r, pr, fin, cfg, contasCfg] = await Promise.all([
        db.produtos.toArray(),
        db.receitas.toArray(),
        db.producoes.toArray(),
        db.financeiro.orderBy('data').reverse().toArray(),
        configGet('company'),
        configGet('contas_financeiras')
      ])
      produtos.value  = p
      receitas.value  = r.map(receita => ({
        ...receita,
        categoria: normalizeReceitaCategoria(receita.categoria)
      }))
      producoes.value = pr
      financeiro.value = fin
      if (cfg) company.value = cfg
      contasFinanceiras.value = Array.isArray(contasCfg)
        ? contasCfg.map(normalizarContaFinanceira).filter(conta => conta.nome)
        : []

      const reclassificados = fin.map(item => {
        if (item.editado_manualmente) return item
        const conta = resolverContaFinanceira(item)
        const cl = classificarLancamentoFinanceiro({
          tipo: item.tipo,
          descricao: item.descricao,
          valor: item.valor,
          banco: item.banco || 'pagbank',
          conta
        })
        return {
          ...item,
          banco: conta?.banco || item.banco || 'pagbank',
          conta_id: conta?.id || item.conta_id || '',
          conta_nome: conta?.nome || item.conta_nome || '',
          conta_titular: conta?.titular || item.conta_titular || '',
          conta_natureza: conta?.natureza || item.conta_natureza || '',
          conta_papel: conta?.papel || item.conta_papel || '',
          categoria: cl.categoria,
          natureza: cl.natureza
        }
      })
      const reconciliados = reconciliarTransferenciasInternas(reclassificados)
      const alterados = reconciliados.filter((item, index) => {
        const atual = fin[index]
        return atual && (
          atual.banco !== item.banco ||
          atual.conta_id !== item.conta_id ||
          atual.conta_nome !== item.conta_nome ||
          atual.conta_titular !== item.conta_titular ||
          atual.conta_natureza !== item.conta_natureza ||
          atual.conta_papel !== item.conta_papel ||
          atual.categoria !== item.categoria ||
          atual.natureza !== item.natureza
        )
      })

      if (alterados.length) {
        await db.financeiro.bulkPut(alterados)
        financeiro.value = await db.financeiro.orderBy('data').reverse().toArray()
      }
    } finally {
      loading.value = false
    }
  }

  // ── BACKUP ────────────────────────────────
  async function backupGeral() {
    try {
      const dados = await exportarDados()
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chocostoq-backup-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a) // Temporariamente anexa para maior compatibilidade de navegador
      a.click()
      document.body.removeChild(a) // Limpa o elemento
      setTimeout(() => URL.revokeObjectURL(url), 100) // Revoga a URL após um pequeno atraso para garantir que o download comece
      notify('Backup baixado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar backup local:', error)
      notify('Erro ao gerar backup local. Tente novamente.', 'error')
    }
  }

  async function backupGoogleDrive() {
    if (!googleDriveConfigured.value) {
      notify('Drive não configurado', 'error')
      return
    }

    try {
      const dados = await exportarDados()
      await salvarBackupNoDrive(dados)
      notify('Backup salvo no Drive!')
    } catch (error) {
      console.error(error)
      notify('Erro ao salvar no Drive', 'error')
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
      notify('Drive não configurado', 'error')
      return
    }

    try {
      const dados = await restaurarBackupDoDrive()
      await importarDados(dados)
      notify('Backup restaurado! Recarregando…')
      setTimeout(() => location.reload(), 1500)
    } catch (error) {
      console.error(error)
      notify(
        error?.message === 'Nenhum backup encontrado no Google Drive'
          ? 'Backup não encontrado no Drive'
          : 'Erro ao restaurar do Drive',
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
    const assinaturasNoArquivo = new Set()

    for (const item of preparadosBase) {
      const assinaturas = getAssinaturasDuplicidadeFinanceiro(item)
      if (assinaturas.some(assinatura => assinaturasNoArquivo.has(assinatura))) continue
      assinaturas.forEach(assinatura => assinaturasNoArquivo.add(assinatura))
      preparados.push(item)
    }

    if (!preparados.length) {
      return {
        recebidos: lancamentos.length,
        validos: 0,
        importadosCount: 0,
        duplicados: 0,
        totalImportado: 0
      }
    }

    const existentes = await db.financeiro.toArray()
    const assinaturasExistentes = new Set()

    for (const item of existentes) {
      getAssinaturasDuplicidadeFinanceiro(item).forEach(assinatura => assinaturasExistentes.add(assinatura))
      if (item.hash_duplicidade) assinaturasExistentes.add(item.hash_duplicidade)
    }

    const novos = preparados.filter(item => {
      const assinaturas = getAssinaturasDuplicidadeFinanceiro(item)
      const ehDuplicado = assinaturas.some(assinatura => assinaturasExistentes.has(assinatura))
      if (ehDuplicado || (item.hash_duplicidade && assinaturasExistentes.has(item.hash_duplicidade))) {
        return false
      }
      assinaturas.forEach(assinatura => assinaturasExistentes.add(assinatura))
      if (item.hash_duplicidade) assinaturasExistentes.add(item.hash_duplicidade)
      return true
    })

    if (novos.length) {
      await db.financeiro.bulkAdd(novos)
    }

    const todos = await db.financeiro.toArray()
    const reconciliados = reconciliarTransferenciasInternas(todos)
    const alterados = reconciliados.filter((item, index) => {
      const atual = todos[index]
      return atual && (
        atual.categoria !== item.categoria ||
        atual.natureza !== item.natureza
      )
    })

    if (alterados.length) {
      await db.financeiro.bulkPut(alterados)
    }

    if (novos.length || alterados.length) await carregarFinanceiro()

    return {
      recebidos: lancamentos.length,
      validos: preparados.length,
      importadosCount: novos.length,
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
      natureza: dadosAtualizacao.categoria
        ? (CATEGORIAS_MEI.find(c => c.nome === dadosAtualizacao.categoria)?.natureza ?? lancamento.natureza)
        : (dadosAtualizacao.natureza ?? lancamento.natureza),
      editado_manualmente: true
    }
    await db.financeiro.put(atualizado)
    await carregarFinanceiro()
    notify('Categoria atualizada!')
  }

  async function atualizarLancamentosEmLote(ids, dadosAtualizacao) {
    if (!ids.length) return
    const lancamentos = await db.financeiro.where('id').anyOf(ids).toArray()
    const naturezaCategoria = dadosAtualizacao.categoria
      ? (CATEGORIAS_MEI.find(c => c.nome === dadosAtualizacao.categoria)?.natureza ?? null)
      : null
    const atualizados = lancamentos.map(item => ({
      ...item,
      ...dadosAtualizacao,
      natureza: naturezaCategoria ?? dadosAtualizacao.natureza ?? item.natureza,
      editado_manualmente: true
    }))
    await db.financeiro.bulkPut(atualizados)
    await carregarFinanceiro()
    notify(`${ids.length} lançamento(s) atualizados!`)
  }

  async function limparFinanceiro() {
    loading.value = true
    try {
      await db.financeiro.clear()
      financeiro.value = []
      notify('Todo o histórico financeiro foi removido.')
    } finally {
      loading.value = false
    }
  }

  async function limparFinanceiroPorBanco(banco) {
    loading.value = true
    try {
      if (banco === 'todos') {
        await db.financeiro.clear()
        financeiro.value = []
        notify('Todo o histórico financeiro foi removido.')
      } else {
        const ids = financeiro.value
          .filter(i => (i.banco || 'pagbank') === banco)
          .map(i => i.id)
        if (!ids.length) { notify('Nenhum lançamento encontrado para este banco.'); return }
        await db.financeiro.bulkDelete(ids)
        financeiro.value = financeiro.value.filter(i => (i.banco || 'pagbank') !== banco)
        const labels = { pagbank: 'PagBank', itau: 'Itaú', bb: 'BB' }
        notify(`Extrato ${labels[banco] || banco} removido — ${ids.length} lançamento(s) excluído(s).`)
      }
    } finally {
      loading.value = false
    }
  }

  async function reclassificarTodosFinanceiro() {
    // Reclassifica apenas lançamentos que não foram editados manualmente
    const todos = await db.financeiro.toArray()
    const paraAtualizar = todos.filter(i => !i.editado_manualmente)
    if (!paraAtualizar.length) {
      notify('Todos os lançamentos já estão no padrão atual.', 'warning')
      return 0
    }
    const reclassificados = paraAtualizar.map(item => {
      const conta = resolverContaFinanceira(item)
      const cl = classificarLancamentoFinanceiro({
        tipo: item.tipo,
        descricao: item.descricao,
        valor: item.valor,
        banco: item.banco || 'pagbank',
        conta
      })
      return {
        ...item,
        banco: conta?.banco || item.banco || 'pagbank',
        conta_id: conta?.id || item.conta_id || '',
        conta_nome: conta?.nome || item.conta_nome || '',
        conta_titular: conta?.titular || item.conta_titular || '',
        conta_natureza: conta?.natureza || item.conta_natureza || '',
        conta_papel: conta?.papel || item.conta_papel || '',
        categoria: cl.categoria,
        natureza: cl.natureza
      }
    })
    const porId = new Map(reclassificados.map(item => [item.id, item]))
    const consolidados = reconciliarTransferenciasInternas(
      todos.map(item => porId.get(item.id) || item)
    )
    const atualizados = consolidados.filter(item => !item.editado_manualmente)
    await db.financeiro.bulkPut(atualizados)
    await carregarFinanceiro()
    notify(`${atualizados.length} lançamento(s) reclassificados!`)
    return atualizados.length
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

  function saveContasFinanceiras(contas = []) {
    const normalizadas = contas
      .map(normalizarContaFinanceira)
      .filter(conta => conta.nome && conta.banco)
    contasFinanceiras.value = normalizadas
    configSet('contas_financeiras', normalizadas)
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
          renda_pessoal: 0,
          saidas_operacionais: 0,
          saidas_pessoais: 0,
          rendimento_financeiro: 0
        })
      }

      const atual = meses.get(mesRef)
      const valor = Number(item.valor || 0)
      
      // Para conciliação, total e quantidade incluem tudo
      atual.total += valor
      atual.quantidade += 1
      
      if (item.natureza === 'interna') return

      if (item.natureza === 'entrada') {
        atual.entradas += valor
        if (item.categoria === 'Rendimento Financeiro') {
          atual.rendimento_financeiro += valor
        } else {
          atual.receitas_mei += valor
        }
      }
      else if (item.natureza === 'operacional') {
        // Cálculo Líquido: Subtrai valores positivos (estornos) do total de saídas
        // Se valor é -100, 0 - (-100) = 100. Se há estorno de 20, 100 - 20 = 80.
        atual.saidas_operacionais -= valor 
      }
      else if (item.natureza === 'pessoal') {
        if (valor > 0) {
          atual.entradas += valor
          atual.renda_pessoal += valor
        } else {
          atual.saidas_pessoais += Math.abs(valor)
        }
      }
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
      // Tudo que entrou mas NÃO é receita MEI nem rendimento financeiro (ex: Renda Pessoal, pensão, etc.)
      outras_entradas_nao_mei: Math.max(0,
        Number(item.entradas || 0) - Number(item.receitas_mei || 0) - Number(item.rendimento_financeiro || 0)
      ),
      saldo_operacional: Number(item.receitas_mei || 0) - Number(item.saidas_operacionais || 0),
      saldo_mes: Number(item.entradas || 0) - Number(item.saidas_operacionais || 0) - Number(item.saidas_pessoais || 0),
      get renda_per_capita() {
        const num = Math.max(1, company.value.pessoas_familia || 1)
        const familiarTotal = this.saldo_operacional + this.outras_entradas_nao_mei
        return familiarTotal / num
      }
    }))
  })

  return {
    // UI
    tab, loading, toast, modal,
    setTab, notify, openModal, closeModal,

    // Dados
    produtos, receitas, producoes, financeiro, contasFinanceiras,

    // Config
    company, googleDriveConfigured, saveCompany, saveContasFinanceiras,

    // Ações
    init, carregarProducoes, carregarFinanceiro, importarLancamentosFinanceiros,
    atualizarLancamentoFinanceiro, atualizarLancamentosEmLote,
    reclassificarTodosFinanceiro,
    limparFinanceiro, limparFinanceiroPorBanco, getCustoTotal, getPrecoUnitarioInsumo, getLucroInfo, getPesoTotal,
    expandirIngredientes,
    resumoFinanceiroPorMes, resumoFinanceiroCategorias, relatorioMensalMei, totalRecebidoAnoAtual,
    CATEGORIAS_MEI,
    getContaFinanceiraById, getContasFinanceirasPorBanco,
    salvarProduto, excluirProduto,
    salvarReceita, excluirReceita,
    registrarProducao, registrarLoteProducao, estornarProducao,
    backupGeral, restaurarGeral, backupGoogleDrive, restaurarGoogleDrive
  }
})
