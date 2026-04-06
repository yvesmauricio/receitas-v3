import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, configGet, configSet, exportarDados, importarDados, garantirPersistencia } from './db.js'

export const useStore = defineStore('choco', () => {

  // ── UI ─────────────────────────────────────
  const tab     = ref('receitas')
  const loading = ref(false)
  const toast   = ref(null)
  const modal   = ref(null)

  // ── Dados ─────────────────────────────────
  const produtos  = ref([])
  const receitas  = ref([])
  const producoes = ref([])

  // ── Config ────────────────────────────────
  const company = ref({
    nome: 'Meu Caderno de Receitas',
    slogan: 'Registro de Produção'
  })

  const clean = (obj) => JSON.parse(JSON.stringify(obj))

  // ── Computados ────────────────────────────
  const baixoEstoque = computed(() =>
    produtos.value.filter(p => +(p.estoque_atual || 0) <= +(p.estoque_minimo || 0) && +(p.estoque_minimo || 0) > 0)
  )

  const producaoSemana = computed(() => {
    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
    return producoes.value.filter(p => new Date(p.data_producao) >= seteDiasAtras)
  })

  // ── UI Actions ────────────────────────────
  function setTab(t) { tab.value = t }

  let _toastTimer = null
  function notify(msg, tipo = 'success', ms = 3000) {
    clearTimeout(_toastTimer)
    toast.value = { msg, tipo, id: Date.now() }
    if (ms > 0) _toastTimer = setTimeout(() => toast.value = null, ms)
  }

  function openModal(id, props = {}) { modal.value = { id, props } }
  function closeModal() { modal.value = null }

  // ── INIT ──────────────────────────────────
  async function init() {
    await garantirPersistencia()
    loading.value = true
    try {
      const [p, r, pr, cfg] = await Promise.all([
        db.produtos.toArray(),
        db.receitas.toArray(),
        db.producoes.toArray(),
        configGet('company')
      ])
      produtos.value  = p
      receitas.value  = r
      producoes.value = pr
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

  // ── PRODUÇÕES ─────────────────────────────
  async function carregarProducoes(dias = 7) {
    const desde = new Date()
    if (dias > 0) desde.setDate(desde.getDate() - dias)
    const iso = desde.toISOString().slice(0, 10)
    producoes.value = await db.producoes
      .where('data_producao')
      .aboveOrEqual(iso)
      .toArray()
  }

  // ── CRUD: INGREDIENTES (produtos) ────────
  async function salvarProduto(dados) {
    const obj = clean(dados)
    obj.uuid = obj.uuid || crypto.randomUUID()
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
    await db.produtos.delete(uuid)
    produtos.value = produtos.value.filter(p => p.uuid !== uuid)
    notify('Ingrediente removido!')
  }

  // ── CRUD: RECEITAS ────────────────────────
  async function salvarReceita(dados) {
    const obj = clean(dados)
    obj.uuid = obj.uuid || crypto.randomUUID()
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
    await db.receitas.delete(uuid)
    receitas.value = receitas.value.filter(r => r.uuid !== uuid)
    notify('Receita removida!')
  }

  // ── PRODUÇÃO ──────────────────────────────
  async function registrarProducao(dados) {
    const obj = clean(dados)
    obj.uuid = obj.uuid || crypto.randomUUID()
    obj.data_producao = obj.data_producao || new Date().toISOString()
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

  // ── CUSTO (ao vivo — usado para pré-visualização) ────────────
  function getCustoTotal(recipe, visitados = new Set(), cache = new Map()) {
    if (!recipe || !recipe.ingredientes) return 0
    if (cache.has(recipe.uuid)) return cache.get(recipe.uuid)
    if (visitados.has(recipe.uuid)) return 0
    visitados.add(recipe.uuid)

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
        if (!prod || !prod.fator_conversao) continue
        total += ((prod.custo_por_unidade || 0) / prod.fator_conversao) * qtd
      }
    }

    cache.set(recipe.uuid, total)
    return total
  }

  return {
    // UI
    tab, loading, toast, modal,
    setTab, notify, openModal, closeModal,

    // Dados
    produtos, receitas, producoes,

    // Computados
    producaoSemana, baixoEstoque,

    // Config
    company, saveCompany,

    // Ações
    init, carregarProducoes, getCustoTotal,
    salvarProduto, excluirProduto,
    salvarReceita, excluirReceita,
    registrarProducao, registrarLoteProducao, estornarProducao,
    backupGeral, restaurarGeral
  }
})
