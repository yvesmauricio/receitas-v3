<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-industry"></i> Produção</h2>
        <div class="tab-actions">
          <button class="btn btn-primary btn-sm" @click="s.setTab('cozinha')"><i class="fas fa-plus"></i> Produzir</button>
        </div>
      </div>
      <div class="search-wrap">
        <i class="fas fa-search search-icon"></i>
        <input v-model="busca" class="search-input" type="search" placeholder="Buscar por receita, categoria ou data..." />
      </div>
      <CategoryFilter v-model="filtroAtivo" :items="filtrosNorm" />
    </div>

    <div v-if="s.loading" class="loading-box">
      <div class="spinner spinner-sm"></div>
    </div>

    <template v-else-if="gruposProducao.length">
      <div class="production-groups">
        <div v-for="grupo in gruposProducao" :key="grupo.id" class="production-card">
          <button class="production-card-head" type="button" @click="toggleGrupo(grupo.id)">
            <div class="production-card-main">
              <div class="production-card-title">Lote de {{ dataHoraBR(grupo.data) }}</div>
              <div class="production-card-sub">
                <span class="prod-badge-mini"><span>Custo: </span>{{ R$(grupo.custoTotal) }}</span>
                <span v-if="grupo.lucroTotal > 0" class="prod-badge-mini profit">
                  <span>Lucro: </span>{{ R$(grupo.lucroTotal) }}
                </span>
                  <div class="spacer"></div>
              </div>
            </div>
            <div class="production-card-side">
              <button class="production-card-kitchen" type="button" title="Gerar etiquetas do lote"
                aria-label="Gerar etiquetas do lote" @click.stop="imprimirEtiquetasGrupo(grupo)">
                <i class="fas fa-tags"></i>
              </button>
              <button class="production-card-kitchen" type="button" title="Abrir histórico"
                aria-label="Abrir histórico" @click.stop="abrirCozinhaHistorica(grupo)">
                <i class="fas fa-eye"></i>
              </button>
              <i class="fas fa-chevron-down production-card-chevron" :class="{ open: isGrupoAberto(grupo.id) }"></i>
            </div>
          </button>

          <div v-if="isGrupoAberto(grupo.id)" class="production-card-body">
            <AppListRow
              v-for="p in grupo.itens"
              :key="p.uuid || p.id"
              :id="p.uuid || p.id"
              :actions-width="160"
              :chevron="false"
            >
              <template #icon>
                <div class="recipe-icon" :class="p.eh_intermediaria ? 'badge-blue' : 'badge-gold'">
                  <i :class="p.eh_intermediaria ? 'fas fa-blender' : 'fas fa-cookie-bite'"></i>
                </div>
              </template>
              <template #title>{{ limpar(p.nome_receita || p.receita_nome) }}</template>
              <template #sub>
                <span class="row-cost">Custo: {{ R$(getCustoProducao(p)) }}</span>
              </template>
              <template #right>
                <div class="row-val c-brown">{{ p.quantidade_produzida || p.quantidade }} {{ p.unidade_rendimento || 'un' }}</div>
              </template>

              <template #actions>
                <button class="swipe-btn print" @click="imprimirEtiqueta(p)">
                  <i class="fas fa-tag"></i>
                  <span>Etiqueta</span>
                </button>
                <button class="swipe-btn estornar" @click="estornar(p)">
                  <i class="fas fa-rotate-left"></i>
                  <span>Cancelar</span>
                </button>
              </template>
            </AppListRow>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="!s.loading" class="empty">
      <i class="fas fa-industry"></i>
      <h3>Nenhuma produção no período</h3>
      <button class="btn btn-primary mt-12" @click="s.setTab('cozinha')"><i class="fas fa-plus"></i> Iniciar Lote</button>
    </div>

    <BaseModal v-if="currentModal === 'cozinha-historico'" title="Lista de Preparo do Lote" @close="fecharModal">
      <div class="modal-inner">
      <div class="pesagem-header">
        <div class="pesagem-stat"><span>Itens:</span> <strong>{{ loteHistorico.length}}</strong></div>
        <div class="pesagem-stat"><span>Qtde:</span> <strong>{{ historicoGrupo?.quantidadeTotal || 0 }}</strong></div>
        <div class="pesagem-stat"><span>Custo:</span> <strong>{{ R$(historicoGrupo?.custoTotal || 0) }}</strong></div>
      </div>

      <div class="sheet-card mt-16">
        <div class="sheet-body">
          <template v-if="historicoInsumosGlobais.length">
            <div class="section-label group-title highlight-gold">
              <i class="fas fa-fill-drip"></i> Total para Cobertura / Uso Geral
            </div>
            <div class="global-summary mb-12">
              <div v-for="g in historicoInsumosGlobais" :key="g.id" class="global-item">
                <span>{{ g.nome }}</span>
                <strong>{{ fmtQ(g.total, g.unidade) }}</strong>
              </div>
            </div>
          </template>

          <div class="section-label">🥣 Total para pesar (Consolidado)</div>
          <div class="checklist">
            <div v-for="ing in historicoIngredientesAgrupados" 
                 :key="ing.id" 
                 class="check-item" 
                 :class="{ 'done': historicoChecklist[ing.id] }"
                 @click="historicoChecklist[ing.id] = !historicoChecklist[ing.id]">
              <div class="check-box">
                <i class="fas" :class="historicoChecklist[ing.id] ? 'fa-check-square' : 'fa-square'"></i>
              </div>
              <div class="check-info">
                <div class="check-main">
                  <div class="check-name">{{ ing.nome }}</div>
                  <div class="check-val">{{ fmtQ(ing.total, ing.unidade) }}</div>
                </div>
                <div v-if="ing.subIngredientes" class="plan-sub-list" style="margin-left:0; margin-top:6px;">
                  <div v-for="sub in ing.subIngredientes" :key="sub.nome" class="plan-sub-item">
                    <span>└ {{ sub.nome }}</span>
                    <span>{{ fmtQ(sub.total, sub.unidade) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="section-label">📋 Detalhes por Item</div>
          <div v-for="item in loteHistoricoComIngredientes" :key="item.uid" class="prep-card">
            <button class="prep-card-head" type="button" @click="toggleHistoricoItem(item.uid)">
              <div class="prep-card-summary">
                <div class="group-title">
                  <i class="fas fa-utensils"></i>
                  {{ item.nome }}
                </div>
                <div class="prep-meta">
                  <span>{{ fmtQ(item.qtd_produzir, item.unidade) }}</span>
                  <span v-if="item.qtdRecheio" class="prep-chip">Recheio {{ fmtQ(item.qtdRecheio, item.unidadeRecheio) }}</span>
                  <span v-if="item.qtdChocolate" class="prep-chip">Chocolate {{ fmtQ(item.qtdChocolate, item.unidadeChocolate) }}</span>
                </div>
              </div>
              <i class="fas fa-chevron-down prep-chevron" :class="{ open: isHistoricoItemAberto(item.uid) }"></i>
            </button>

            <div v-if="isHistoricoItemAberto(item.uid)" class="prep-card-body">
              <div v-if="item.ingredientes.length" class="prep-ingredient-list">
                <div v-for="ing in item.ingredientes" :key="ing.uid" class="prep-ingredient-row">
                  <div class="prep-ingredient-main">
                    <div class="prep-ingredient-name">{{ ing.nome }}</div>
                    <div class="prep-ingredient-qty">{{ fmtQ(ing.total, ing.unidade) }}</div>
                  </div>
                  <div v-if="ing.subIngredientes?.length" class="prep-sublist">
                    <div v-for="sub in ing.subIngredientes" :key="sub.uid" class="prep-subitem">
                      <span>{{ sub.nome }}</span>
                      <strong>{{ fmtQ(sub.total, sub.unidade) }}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="history-empty-ing mb-12">
                Receita não encontrada no cadastro atual para reconstruir os ingredientes desse item.
              </div>
            </div>
          </div>
        </div>
      </div>


      <div v-if="historicoComPreparo.length" class="mt-16">
        <div class="section-label">📝 Notas de Preparo</div>
        <div v-for="item in historicoComPreparo" :key="item.id" class="prep-note">
          <strong>{{ item.nome }}:</strong> {{ item.modo }}
        </div>
      </div>

      </div>
      <template #foot>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="fecharModal">Fechar</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import { useStore } from '../store.js'
import { R$, dataHoraBR, fmtQtd as fmtQ, nowLocal, normalizar } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'
import AppListRow from '../components/AppListRow.vue'
import CategoryFilter from '../components/CategoryFilter.vue'
import { useSwipe } from '../composables/useSwipe.js'
import { useModalStack } from '../composables/useModalStack.js'
import { useConfirm } from '../composables/useConfirm.js'
import { useListFilter } from '../composables/useListFilter.js'

const s = useStore()
const { closeAll } = useSwipe()
const { modal: currentModal, abrirModal, fecharModal } = useModalStack()
const confirm = useConfirm()

const filtroAtivo = ref('7dias')
const historicoGrupo = ref(null)
const historicoChecklist = reactive({})
const historicoAberto = ref({})
const gruposAbertos = ref({})

// Para produções, usamos o composable para busca e ordenação pré-agrupamento
const { busca, listaFiltrada } = useListFilter(
  computed(() => s.producoes.map(p => ({
    ...p,
    nome: p.nome_receita || p.receita_nome // Mapeia para o campo 'nome' que o composable busca
  }))),
  {},
  'Todas'
)

const filtros = [
  { v: 'hoje', l: 'Hoje' },
  { v: '7dias', l: '7 dias' },
  { v: '30dias', l: '30 dias' },
  { v: 'total', l: 'Tudo' }
]
const filtrosNorm = filtros.map(f => ({ value: f.v, label: f.l }))
const ETIQUETAS_POR_FOLHA = 77
const ETIQUETA_PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
const ETIQUETA_CONTATO = 'Bete (21)99943-0023'

function isInsumoOculto(nome) {
  const chave = normalizar(nome)
  return ['etiqueta', 'embalagem', 'rotulo', 'rótulo'].some(term => chave.includes(term))
}

function buildIngredientLine(ing, factor, idx) {
  // Respeita a configuração de peso (gera_peso) gravada ou sugerida
  const geraPeso = ing.gera_peso !== undefined ? ing.gera_peso : true

  const alvo = ing.tipo === 'receita'
    ? s.receitas.find(x => x.uuid === ing.id)
    : s.produtos.find(x => x.uuid === ing.id)

  const nome = (ing.tipo === 'receita' ? '🥣 ' : '') + (alvo?.nome || 'Item removido')
  const unidade = ing.tipo === 'receita' ? alvo?.unidade_rendimento : alvo?.unidade_base
  const total = Number(ing.quantidade || 0) * factor

  const subIngredientes = ing.tipo === 'receita' && alvo?.ingredientes
    ? (alvo.ingredientes || [])
      .filter(sub => {
        if (sub.gera_peso === false) return false
        const subAlvo = sub.tipo === 'receita' ? s.receitas.find(x => x.uuid === sub.id) : s.produtos.find(x => x.uuid === sub.id)
        return !isInsumoOculto(subAlvo?.nome || sub.id)
      })
      .map((sub, subIdx) => {
        const subAlvo = sub.tipo === 'receita'
          ? s.receitas.find(x => x.uuid === sub.id)
          : s.produtos.find(x => x.uuid === sub.id)
        const subUnidade = sub.tipo === 'receita' ? subAlvo?.unidade_rendimento : subAlvo?.unidade_base
        const subTotal = Number(sub.quantidade || 0) * total / (alvo.rendimento || 1)
        return {
          uid: `${idx}-${ing.id}-sub-${subIdx}`,
          nome: sub.nome || (subAlvo?.nome || 'Item removido'),
          total: subTotal,
          unidade: subUnidade || ''
        }
      })
    : []

  return {
    uid: `${idx}-${ing.id}`,
    id: ing.id,
    nome,
    unidade: unidade || '',
    total,
    tipo: ing.tipo,
    gera_peso: geraPeso,
    subIngredientes
  }
}

function toggleHistoricoItem(uid) {
  historicoAberto.value[uid] = !historicoAberto.value[uid]
}

function isHistoricoItemAberto(uid) {
  return historicoAberto.value[uid] ?? false
}

// ── Computados ────────────────────────────────────────────────
const listaPeriodo = computed(() => {
  const agora = new Date()
  return listaFiltrada.value
    .filter(p => {
      if (filtroAtivo.value === 'hoje') {
        return (p.data_producao || '').slice(0, 10) === agora.toISOString().slice(0, 10)
      }
      if (filtroAtivo.value === 'total') return true
      const dias = filtroAtivo.value === '7dias' ? 7 : 30
      const limite = new Date(); limite.setDate(agora.getDate() - dias)
      return new Date(p.data_producao) >= limite
    })
    .sort((a, b) => (b.data_producao || '').localeCompare(a.data_producao || ''))
})

const gruposProducao = computed(() => {
  const mapa = new Map()

  for (const item of listaPeriodo.value) {
    const key = item.data_producao || 'sem-data'
    if (!mapa.has(key)) {
      mapa.set(key, {
        id: key,
        data: item.data_producao,
        itens: [],
        custoTotal: 0,
        vendaTotal: 0,
        quantidadeTotalNum: 0,
        unidadeResumo: item.unidade_rendimento || 'un',
        temBase: false,
        temFinal: false
      })
    }

    const grupo = mapa.get(key)
    grupo.itens.push(item)
    grupo.custoTotal += getCustoProducao(item)
    grupo.vendaTotal += getVendaProducao(item)
    grupo.quantidadeTotalNum += Number(item.quantidade_produzida || item.quantidade || 0)
    if (item.eh_intermediaria) grupo.temBase = true
    else grupo.temFinal = true
  }

  return Array.from(mapa.values()).map(grupo => ({
    ...grupo,
    lucroTotal: grupo.vendaTotal - grupo.custoTotal,
    quantidadeTotal: `${fmtQ(grupo.quantidadeTotalNum, grupo.unidadeResumo)} total`
  }))
})

const historicoIngredientesAgrupados = computed(() => {
  const mapa = {}
  loteHistoricoComIngredientes.value.forEach(item => {
    item.ingredientes.forEach(ing => {
      const key = `${ing.tipo}-${ing.id}`
      if (!mapa[key]) {
        mapa[key] = {
          id: ing.id,
          tipo: ing.tipo,
          nome: ing.nome,
          unidade: ing.unidade,
          total: 0
        }
      }
      mapa[key].total += ing.total
    })
  })

  return Object.values(mapa).map(group => {
    if (group.tipo === 'receita') {
      const alvo = s.receitas.find(x => x.uuid === group.id)
      if (alvo?.ingredientes) {
        group.subIngredientes = alvo.ingredientes
          .map(sub => {
            const subAlvo = sub.tipo === 'receita' ? s.receitas.find(x => x.uuid === sub.id) : s.produtos.find(x => x.uuid === sub.id)
            return {
              nome: subAlvo?.nome || 'Item',
              total: (sub.quantidade * group.total) / (alvo.rendimento || 1),
              unidade: sub.tipo === 'receita' ? subAlvo?.unidade_rendimento : subAlvo?.unidade_base
            }
          })
      }
    }
    return group
  }).sort((a, b) => a.nome.localeCompare(b.nome))
})

const loteHistorico = computed(() => {
  if (!historicoGrupo.value) return []

  return historicoGrupo.value.itens.map((item, idx) => {
    const receita = s.receitas.find(r => r.uuid === item.receita_id)
    const qtd = Number(item.quantidade_produzida || item.quantidade || 0)

    return {
      uid: item.uuid || `${historicoGrupo.value.id}-${idx}`,
      id: item.receita_id,
      nome: limpar(item.nome_receita || item.receita_nome),
      categoria: receita?.categoria || '',
      qtd_produzir: qtd,
      unidade: item.unidade_rendimento || receita?.unidade_rendimento || 'un',
      ingredientes: item.ingredientes_snapshot || receita?.ingredientes || [],
      rendimento_base: receita?.rendimento || 1,
      modo_preparo: receita?.modo_preparo || '',
      receitaEncontrada: !!(item.ingredientes_snapshot || receita)
    }
  })
})

const loteHistoricoComIngredientes = computed(() =>
  loteHistorico.value.map(item => {
    const fator = item.qtd_produzir / (item.rendimento_base || 1)
    const ingredientes = (item.ingredientes || [])
      .filter(ing => ing.gera_peso !== false && !isInsumoOculto(ing.nome || ing.id))
      .map(ing => buildIngredientLine(ing, fator, item.uid))

    const chocolateIds = ingredientes.filter(ing => normalizar(ing.nome).match(/chocolate|cobertura|ganache/))
    const recheioIds = ingredientes.filter(ing => ing.tipo === 'receita' || normalizar(ing.nome).includes('recheio'))

    return {
      ...item,
      ingredientes,
      qtdChocolate: chocolateIds.reduce((acc, ing) => acc + ing.total, 0),
      unidadeChocolate: chocolateIds[0]?.unidade || 'g',
      qtdRecheio: recheioIds.reduce((acc, ing) => acc + ing.total, 0),
      unidadeRecheio: recheioIds[0]?.unidade || 'g'
    }
  }).sort((a, b) => {
    const ordem = ['Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']
    const idxA = ordem.indexOf(a.categoria)
    const idxB = ordem.indexOf(b.categoria)
    
    const posA = idxA === -1 ? 99 : idxA
    const posB = idxB === -1 ? 99 : idxB

    if (posA !== posB) return posA - posB
    return a.nome.localeCompare(b.nome)
  })
)

const historicoInsumosGlobais = computed(() => {
  const mapa = {}
  const nomesParaConsolidar = ['chocolate ao leite', 'cobertura', 'ganache']

  loteHistoricoComIngredientes.value.forEach(item => {
    item.ingredientes.forEach(ing => {
      const nomeBase = normalizar(ing.nome)
      if (nomesParaConsolidar.some(n => nomeBase.includes(n))) {
        if (!mapa[ing.id]) mapa[ing.id] = { id: ing.id, nome: ing.nome, total: 0, unidade: ing.unidade }
        mapa[ing.id].total += ing.total
      }
    })
  })

  return Object.values(mapa)
})

const historicoComPreparo = computed(() =>
  loteHistorico.value
    .map(item => ({ id: item.uid, nome: item.nome, modo: item.modo_preparo }))
    .filter(item => item.modo)
)

// ── Métodos ───────────────────────────────────────────────────
function setFiltro(v) {
  filtroAtivo.value = v
  const dias = v === 'hoje' ? 1 : v === '7dias' ? 7 : v === '30dias' ? 30 : 0
  s.carregarProducoes(dias)
}

function toggleGrupo(id) {
  gruposAbertos.value[id] = !gruposAbertos.value[id]
}

function isGrupoAberto(id) {
  if (busca.value.trim().length > 1) return true
  return gruposAbertos.value[id] ?? false
}

/**
 * Custo de uma produção histórica.
 * Usa snapshot salvo no registro (imune a reajustes futuros de preços).
 * Fallback dinâmico para registros antigos sem snapshot.
 */
function getCustoProducao(p) {
  const qtd = p.quantidade_produzida || p.quantidade || 0
  if (p.custo_unitario_snapshot != null) return p.custo_unitario_snapshot * qtd
  const r = s.receitas.find(rec => rec.uuid === p.receita_id)
  return r ? (s.getCustoTotal(r) / (r.rendimento || 1)) * qtd : 0
}

function getVendaProducao(p) {
  const qtd = p.quantidade_produzida || p.quantidade || 0
  const r = s.receitas.find(rec => rec.uuid === p.receita_id)
  return r ? (r.preco_sugerido || 0) * qtd : 0
}

function limpar(n) {
  return String(n || '').replace(/\s*[-–]\s*(base|final|intermediária|intermediaria)\s*$/i, '').replace(/\s*\(.*?\)\s*$/i, '').trim()
}

function limparApenasSabor(nome, categoria = '') {
  const nomeLimpo = limpar(nome)
  const prefixos = [categoria, 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo']
    .filter(Boolean)
    .map(item => String(item).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (!prefixos.length) return nomeLimpo

  return nomeLimpo.replace(new RegExp(`^\\s*(?:${prefixos.join('|')})\\s+`, 'i'), '').trim() || nomeLimpo
}

function escapeXml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getTextoEtiqueta(p) {
  const receita = s.receitas.find(rec => rec.uuid === p.receita_id)
  return receita?.nome_etiqueta?.trim()
    || limparApenasSabor(receita?.nome || p.nome_receita || p.receita_nome, receita?.categoria)
}

function montarXmlEtiquetas(templateXml, etiquetas, startPos = 0) {
  const bodyMatch = templateXml.match(/^([\s\S]*?<w:body>)([\s\S]*?)(<w:sectPr[\s\S]*?<\/w:sectPr>)([\s\S]*)$/)
  if (!bodyMatch) throw new Error('Estrutura do template de etiqueta nao reconhecida')

  const [, prefixoBody, conteudoBase, sectPr, sufixoBody] = bodyMatch
  const placeholdersPorFolha = (conteudoBase.match(/\{sabor\}/g) || []).length
  if (!placeholdersPorFolha) throw new Error('Template sem marcador {sabor}')
  if (!conteudoBase.includes('{contato}')) throw new Error('Template sem marcador {contato}')

  const totalEtiquetas = etiquetas.length
  const totalFolhas = Math.max(1, Math.ceil((startPos + totalEtiquetas) / placeholdersPorFolha))
  const paginas = []

  for (let folha = 0; folha < totalFolhas; folha++) {
    let idxNaFolhaSabor = 0
    let idxNaFolhaContato = 0
    const inicioGlobal = (folha * placeholdersPorFolha) - startPos

    const pagina = conteudoBase
      .replace(/\{sabor\}/g, () => {
        const idxEtiqueta = inicioGlobal + idxNaFolhaSabor
        idxNaFolhaSabor += 1
        return idxEtiqueta >= 0 && idxEtiqueta < totalEtiquetas ? escapeXml(etiquetas[idxEtiqueta]) : ''
      })
      .replace(/\{contato\}/g, () => {
        const idxEtiqueta = inicioGlobal + idxNaFolhaContato
        idxNaFolhaContato += 1
        return idxEtiqueta >= 0 && idxEtiqueta < totalEtiquetas ? escapeXml(ETIQUETA_CONTATO) : ''
      })

    paginas.push(pagina)
  }

  return `${prefixoBody}${paginas.join(ETIQUETA_PAGE_BREAK)}${sectPr}${sufixoBody}`
}

function expandirEtiquetasProducao(itens) {
  return itens.flatMap(item => {
    const texto = getTextoEtiqueta(item)
    const qtd = Number(item.quantidade_produzida || item.quantidade || 0)
    if (!texto || qtd <= 0) return []
    return Array.from({ length: qtd }, () => texto)
  })
}

async function gerarArquivoEtiquetas(etiquetas, nomeArquivoBase = 'etiquetas') {
  if (!etiquetas.length) {
    s.notify('Nao ha etiquetas validas para gerar', 'error')
    return
  }

  s.loading = true
  try {
    let startPos = Math.max(0, (Number(s.company.posicao_etiqueta || 1) || 1) - 1)
    if (startPos > 0) {
      s.loading = false
      const continuar = await confirm.ask(
        `A proxima etiqueta livre e a ${startPos + 1}. Toque em "Continuar" para reaproveitar a folha atual ou em "Nova folha" para recomecar da primeira etiqueta.`,
        {
          title: 'Como deseja imprimir?',
          icon: 'fas fa-tags',
          type: 'primary',
          confirmLabel: 'Continuar',
          cancelLabel: 'Nova folha'
        }
      )
      startPos = continuar ? startPos : 0
      s.loading = true
    }

    const response = await fetch(`${import.meta.env.BASE_URL}etiqueta.docx`)
    if (!response.ok) throw new Error('Template não encontrado na pasta public')

    const content = await response.arrayBuffer()
    const zip = new PizZip(content)
    const templateXml = zip.file('word/document.xml')?.asText()
    if (!templateXml) throw new Error('Conteudo principal do template nao encontrado')

    const xmlFinal = montarXmlEtiquetas(templateXml, etiquetas, startPos)
    zip.file('word/document.xml', xmlFinal)

    const out = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    saveAs(out, `${nomeArquivoBase}.docx`)
    s.company.posicao_etiqueta = ((startPos + etiquetas.length) % ETIQUETAS_POR_FOLHA) + 1
    s.saveCompany(s.company)
    const totalFolhas = Math.max(1, Math.ceil((startPos + etiquetas.length) / ETIQUETAS_POR_FOLHA))
    s.notify(`Etiqueta gerada! ${totalFolhas} folha${totalFolhas > 1 ? 's' : ''}. Proxima posicao: ${s.company.posicao_etiqueta}.`)
  } catch (err) {
    console.error(err)
    s.notify('Erro ao gerar etiqueta', 'error')
  } finally {
    s.loading = false
  }
}



async function estornar(p) {
  closeAll()
  const nome = limpar(p.nome_receita || p.receita_nome)
  const ok = await confirm.ask(
    `Deseja cancelar a produção de "${nome}"? O registro será removido do histórico.`,
    { title: 'Cancelar Produção', icon: 'fas fa-rotate-left', confirmLabel: 'Cancelar' }
  )
  if (!ok) return
  const id = p.uuid || p.id
  if (!id) return s.notify('Erro: identificador não encontrado', 'error')
  await s.estornarProducao(id)
}

async function imprimirEtiqueta(p) {
  const etiquetas = expandirEtiquetasProducao([p])
  const saborLimpo = getTextoEtiqueta(p)
  await gerarArquivoEtiquetas(etiquetas, `etiquetas-${normalizar(saborLimpo)}`)
}

async function imprimirEtiquetasGrupo(grupo) {
  const etiquetas = expandirEtiquetasProducao(grupo.itens || [])
  await gerarArquivoEtiquetas(etiquetas, `etiquetas-lote-${(grupo.data || '').slice(0, 16).replace(/[:T]/g, '-') || 'producao'}`)
}

function abrirCozinhaHistorica(grupo) {
  historicoGrupo.value = grupo
  Object.keys(historicoChecklist).forEach(k => delete historicoChecklist[k])
  abrirModal('cozinha-historico')
}

onMounted(() => setFiltro('7dias'))
</script>

<style scoped>
/* ── Cards de grupos de produção (exclusivos desta tela) ── */
.production-groups { display:flex; flex-direction:column; gap:10px; padding:8px 0 }

.production-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; box-shadow:var(--shadow-sm); margin:0 12px }

.production-card-head {
  width:100%; border:none; background:var(--surface); padding:14px 16px;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  text-align:left; min-height:72px; transition:background var(--t); cursor:pointer;
}
.production-card-head:active { background:var(--bg) }

.production-card-main  { min-width:0 }
.production-card-title { font-size:.95rem; font-weight:800; color:var(--brown-dark); letter-spacing:-.2px }
.production-card-sub   { display:flex; align-items:center; gap:8px; margin-top:6px; font-size:.76rem; color:var(--muted) }

.prod-badge-mini {
  padding:2px 8px;
  background:var(--bg); border:1px solid var(--border); border-radius:var(--r-full);
  font-weight:700; color:var(--brown-mid); font-size:.7rem;
}
.prod-badge-mini.profit { background:var(--green-bg); border-color:var(--green-dim); color:var(--green) }

.production-card-side    { display:flex; align-items:center; gap:8px; flex-shrink:0 }
.production-card-kitchen { width:42px; height:42px; border:1.5px solid var(--border); border-radius:var(--r-md); background:var(--cream); color:var(--brown-mid); display:flex; align-items:center; justify-content:center; font-size:1rem; transition:all var(--t) }
.production-card-kitchen:active { background:var(--gold-bg); color:var(--gold-dark); border-color:var(--gold); transform:scale(.92) }

.production-card-chevron      { color:var(--border2); font-size:.85rem; transition:transform var(--t) }
.production-card-chevron.open { transform:rotate(180deg) }

.production-card-body { border-top:1px solid var(--border); background:var(--bg); padding:0 }

/* Swipe rows dentro dos cards: sem margens laterais */
.production-card-body :deep(.swipe-wrap) {
  margin-left:0; margin-right:0; border-radius:0;
  border-left:none; border-right:none; margin-bottom:0;
  border-bottom:1px solid var(--border);
}

/* ── Linha interna do card (sobrepõe .list-row global apenas aqui) ── */
.recipe-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:.95rem; flex-shrink:0 }
.row-cost { font-weight:700; color:var(--orange) }

/* ── Cabeçalho de pesagem ── */
.pesagem-header { display:flex; gap:10px; padding:14px 16px 10px; background:var(--surface); border-bottom:1px solid var(--border) }
.pesagem-stat          { font-size:.85rem; color:var(--muted) }
.pesagem-stat strong   { color:var(--brown); font-weight:800 }

/* ── Sheet card interno ── */
.sheet-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; box-shadow:var(--shadow-sm); margin:0 16px }
.sheet-body { padding:14px }

/* ── Card de preparo por receita ── */
.prep-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; margin-bottom:12px; box-shadow:var(--shadow-sm) }

.plan-sub-list { margin-top:6px; display:flex; flex-direction:column; gap:2px }
.plan-sub-item { display:flex; justify-content:space-between; gap:10px; font-size:.78rem; color:var(--muted) }

.prep-card-head {
  width:100%; border:none; background:var(--surface); padding:16px 14px;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  text-align:left; transition:background var(--t);
}
.prep-card-head:active { background:var(--gold-bg) }

.prep-card-summary { flex:1; min-width:0 }
.prep-card-summary .group-title { font-size:.92rem; font-weight:800; display:flex; align-items:center; gap:8px; flex-wrap:wrap }

.prep-badge { background:var(--cream); color:var(--brown-mid); border:1px solid var(--border); border-radius:var(--r-full); padding:4px 10px; font-size:.72rem; font-weight:700 }

.prep-meta  { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; font-size:.78rem; color:var(--muted); align-items:center }
.prep-chip  { background:var(--cream); color:var(--muted); border:1px solid var(--border); border-radius:var(--r-full); padding:5px 10px; font-size:.74rem; font-weight:700 }

.prep-chevron      { font-size:.88rem; color:var(--muted); transition:transform var(--t) }
.prep-chevron.open { transform:rotate(180deg) }

.prep-card-body { background:var(--cream); padding:12px 14px 16px; border-top:1px solid var(--border) }

.prep-ingredient-row          { padding:12px 0; border-bottom:1px solid var(--border) }
.prep-ingredient-row:last-child { border-bottom:none }
.prep-ingredient-main         { display:flex; align-items:center; justify-content:space-between; gap:16px }
.prep-ingredient-name         { font-size:.88rem; font-weight:700; color:var(--brown-dark); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1 }
.prep-ingredient-qty          { font-size:.88rem; font-weight:700; font-family:var(--mono); color:var(--brown) }

.prep-sublist { margin-top:8px; padding-left:16px; display:grid; gap:6px }
.prep-subitem { display:flex; justify-content:space-between; gap:10px; font-size:.82rem; color:var(--muted) }
.prep-subitem strong { color:var(--brown); font-family:var(--mono) }

/* ── Resumo global de insumos ── */
.global-summary { display:flex; flex-direction:column; gap:6px; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:var(--r-md); margin-top:4px }
.global-item    { display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border-radius:var(--r-sm); border:1px solid var(--border) }
.global-item span   { font-size:.86rem; font-weight:700; color:var(--brown) }
.global-item strong { font-size:.95rem; font-weight:800; font-family:var(--mono); color:var(--gold-dark) }

/* ── Checklist de pesagem ── */
.checklist  { display:flex; flex-direction:column; gap:10px; margin-bottom:16px }
.check-item { display:flex; align-items:center; padding:14px; background:var(--bg); border-radius:var(--r-md); cursor:pointer; border:1px solid transparent; transition:all var(--t) }
.check-item.done { opacity:.5; background:#f8fafc; border-color:var(--border) }

.check-box { font-size:1.4rem; margin-right:15px; color:var(--gold); flex-shrink:0 }
.done .check-box { color:var(--green) }

.check-info { flex:1; display:flex; flex-direction:column; min-width:0 }
.check-main { display:flex; justify-content:space-between; align-items:center; width:100% }
.check-name { font-weight:700; font-size:.95rem; color:var(--brown); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1 }
.done .check-name { text-decoration:line-through; color:var(--muted) }
.check-val  { font-family:var(--mono); font-weight:800; font-size:.9rem; color:var(--brown-dark); background:#fff; padding:2px 8px; border-radius:var(--r-sm); border:1px solid var(--border); flex-shrink:0; margin-left:8px }

/* ── Modal de confirmar lote ── */
.modal-inner { display:flex; flex-direction:column; gap:12px }
</style>
