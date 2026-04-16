<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-industry"></i> Produção</h2>
        <button class="btn-primary-sm" @click="abrirMontagem"><i class="fas fa-plus"></i> Produzir</button>
      </div>
      <div class="chips">
        <button v-for="f in filtros" :key="f.v" class="chip" :class="{ active: filtroAtivo === f.v }"
          @click="setFiltro(f.v)">{{ f.l }}</button>
      </div>
    </div>

    <div v-if="s.loading" class="loading-box">
      <div class="spinner spinner-sm"></div>
    </div>

    <template v-else-if="gruposProducao.length">
      <div class="production-groups">
        <div v-for="grupo in gruposProducao" :key="grupo.id" class="production-card">
          <button class="production-card-head" @click="toggleGrupo(grupo.id)">
            <div class="production-card-main">
              <div class="production-card-title">Lote de {{ dataHoraBR(grupo.data) }}</div>
              <div class="production-card-sub">
                <span>{{ grupo.itens.length }} item(ns)</span>
                <span>{{ grupo.quantidadeTotal }}</span>
                <span class="row-cost">Custo: {{ R$(grupo.custoTotal) }}</span>
              </div>
            </div>
            <div class="production-card-side">
              <button class="production-card-kitchen" type="button" title="Abrir lista de preparo"
                aria-label="Abrir lista de preparo" @click.stop="abrirCozinhaHistorica(grupo)">
                <i class="fas fa-utensils"></i>
              </button>
              <i class="fas fa-chevron-down production-card-chevron" :class="{ open: isGrupoAberto(grupo.id) }"></i>
            </div>
          </button>

          <div v-if="isGrupoAberto(grupo.id)" class="production-card-body">
            <SwipeRow v-for="p in grupo.itens" :key="p.uuid || p.id" :row-id="p.uuid || p.id" :width="90">
              <div class="list-row">
                <div class="action-ico flex-no-shrink mt-4" :class="p.eh_intermediaria ? 'ico-blue' : 'ico-gold'">
                  <i :class="p.eh_intermediaria ? 'fas fa-blender' : 'fas fa-cookie-bite'"></i>
                </div>
                <div class="row-info">
                  <div class="row-name">
                    {{ limpar(p.nome_receita || p.receita_nome) }}
                    <span class="badge" :class="p.eh_intermediaria ? 'badge-blue' : 'badge-gold'">
                      {{ p.eh_intermediaria ? 'Base/Recheio' : 'Produto final' }}
                    </span>
                  </div>
                  <div class="row-sub">
                                        <span class="row-cost">Custo: {{ R$(getCustoProducao(p)) }}</span>
                  </div>
                </div>
                <div class="row-right">
                  <div class="row-val c-brown">{{ p.quantidade_produzida || p.quantidade }} {{ p.unidade_rendimento ||
                    'un' }}</div>
                </div>
              </div>

              <template #actions>
                <button class="swipe-btn estornar" @click="estornar(p)">
                  <i class="fas fa-rotate-left"></i>
                  <span>Cancelar</span>
                </button>
              </template>
            </SwipeRow>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="!s.loading" class="empty">
      <i class="fas fa-industry"></i>
      <h3>Nenhuma produção no período</h3>
      <button class="btn btn-primary mt-12" @click="abrirMontagem"><i class="fas fa-plus"></i> Iniciar Lote</button>
    </div>

    <!-- ─── Modal Etapa 1: Montagem de Lote ───────────────────── -->
    <BaseModal v-if="currentModal === 'montagem'" title="Novo Lote" @close="fecharModal">
      <!-- Filtros sticky, colados nas laterais -->
      <div class="modal-filter-bar">
        <div class="modal-chips">
          <button v-for="c in listaCategorias" :key="c" class="chip" :class="{ active: catAtiva === c }"
            @click="catAtiva = c">{{ c }}</button>
        </div>
      </div>
      <!-- Conteúdo com padding -->
      <div class="montagem-body">
      <div class="batch-planning">
        <div class="section-label">📋 Selecione as Receitas</div>
        <div class="planned-items">
          <div v-for="r in receitasFiltradas" :key="r.uuid" class="plan-card">
            <div class="plan-info">
              <div class="plan-head">
                <div class="plan-name">{{ r.nome }}</div>
                <div class="plan-tags">
                  <button v-if="getCavidades(r)" class="badge-shortcut" @click.stop="addForma(r)">
                    +1 Forma ({{ getCavidades(r) }} un)
                  </button>
                  <button v-if="r.eh_intermediaria" class="badge-shortcut is-blue" @click.stop="addMeiaReceita(r)">
                    1/2 Receita
                  </button>
                </div>
              </div>
              <div class="plan-sub">
                <span>Rende: {{ r.rendimento }} {{ r.unidade_rendimento }}</span>
                <span v-if="getQtdNoLote(r.uuid) > 0 && r.peso_unitario > 0" class="plan-total">
                  Total: {{ fmtQ((getQtdNoLote(r.uuid) / r.rendimento) * r.peso_unitario, 'g') }}
                </span>
              </div>
            </div>
            <div class="qty-ctrl-sm">
              <button v-if="getQtdNoLote(r.uuid) > 0" class="btn-qty-sm btn-clear btn-qty-inline" type="button"
                title="Remover" @click="limparQtdNoLote(r)" aria-label="Remover item do lote">
                <i class="fas fa-trash-alt"></i>
              </button>
              <button class="btn-qty-sm" type="button" @click="alterarQtdNoLote(r, -1)"
                aria-label="Diminuir quantidade">
                <i class="fas fa-minus"></i>
              </button>
              <input class="qty-input" :class="{ 'qty-zero': !getQtdNoLote(r.uuid) }"
                :value="formatQtdNoLote(getQtdNoLote(r.uuid))" inputmode="decimal" type="text"
                @change="setQtdNoLote(r, $event.target.value)" @blur="setQtdNoLote(r, $event.target.value)" />
              <button class="btn-qty-sm btn-qty-primary" type="button" @click="alterarQtdNoLote(r, 1)"
                aria-label="Aumentar quantidade">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      <template #foot>
        <button class="btn btn-secondary" @click="fecharModal">Cancelar</button>
        <button class="btn btn-primary" :disabled="!lote.length" @click="abrirModal('cozinha')">
          Cozinha <i class="fas fa-utensils ml-4"></i>
        </button>
      </template>
    </BaseModal>

    <!-- ─── Modal Etapa 2: Ficha de Cozinha (Pesagem) ─────────── -->
    <BaseModal v-if="currentModal === 'cozinha'" title="Lista de Preparo" @close="fecharModal">
      <div class="modal-inner">
      <div class="pesagem-header">
        <div class="pesagem-stat"><span>Lote:</span> <strong>{{ lote.length }} itens</strong></div>
        <div class="pesagem-stat"><span>Custo Est.:</span> <strong>{{ R$(custoTotalLote) }}</strong></div>
      </div>

      
      <div class="sheet-card mt-16">
        <div class="sheet-body">
          
          <div v-for="(item, idx) in loteComIngredientes" :key="item.uid" class="prep-card">
            <button class="prep-card-head" type="button" @click="togglePreparoItem(item.uid)">
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
              <i class="fas fa-chevron-down prep-chevron" :class="{ open: isPreparoItemAberto(item.uid) }"></i>
            </button>

            <div v-if="isPreparoItemAberto(item.uid)" class="prep-card-body">
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
          </div>


        </div>
      </div>

      <div v-if="loteComPreparo.length" class="mt-16">
        <div class="section-label">📝 Notas de Preparo</div>
        <div v-for="item in loteComPreparo" :key="item.id" class="prep-note">
          <strong>{{ item.nome }}:</strong> {{ item.modo }}
        </div>
      </div>

            </div>
      <template #foot>
        <button class="btn btn-secondary" @click="fecharModal"><i class="fas fa-arrow-left"></i> Voltar</button>
        <button class="btn btn-primary" :disabled="saving" @click="confirmarLote">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <span v-else>Registrar Produção <i class="fas fa-check-double ml-4"></i></span>
        </button>
      </template>
    </BaseModal>

    <BaseModal v-if="currentModal === 'cozinha-historico'" title="Lista de Preparo do Lote" @close="fecharModal" class="modal-cozinha-historico">
      <div class="modal-inner">
      <div class="pesagem-header">
        <div class="pesagem-stat"><span>Lote:</span> <strong>{{ loteHistorico.length }} itens</strong></div>
        <div class="pesagem-stat"><span>Custo Est.:</span> <strong>{{ R$(historicoGrupo?.custoTotal || 0) }}</strong></div>
      </div>

      <div class="sheet-card mt-16">
        <div class="sheet-body">
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

          <template v-if="historicoInsumosGlobais.length">
            <div class="section-label group-title mt-16 highlight-gold">
              <i class="fas fa-fill-drip"></i> Total para Cobertura / Uso Geral
            </div>
            <div class="global-summary">
              <div v-for="g in historicoInsumosGlobais" :key="g.id" class="global-item">
                <span>{{ g.nome }}</span>
                <strong>{{ fmtQ(g.total, g.unidade) }}</strong>
              </div>
            </div>
          </template>
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
        <button class="btn btn-secondary" @click="fecharModal">Fechar</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useStore } from '../store.js'
import { R$, dataHoraBR, fmtQtd as fmtQ, nowLocal, normalizar } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'
import SwipeRow from '../components/SwipeRow.vue'
import { useConfirm } from '../composables/useConfirm.js'
import { useSwipe } from '../composables/useSwipe.js'
import { pushOverlayHistory, closeOverlayHistory, collapseOverlayHistory } from '../composables/overlayHistory.js'

const s = useStore()
const confirm = useConfirm()
const { closeAll } = useSwipe()

const filtroAtivo = ref('7dias')
const currentModal = ref(null)
const saving = ref(false)
const lote = ref([])
const checklist = reactive({})
const catAtiva = ref('Todas')
const gruposAbertos = ref({})
const modalHistory = []
const historicoGrupo = ref(null)
const historicoChecklist = reactive({})

const listaCategorias = ['Todas', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']
const filtros = [{ v: 'hoje', l: 'Hoje' }, { v: '7dias', l: '7 dias' }, { v: '30dias', l: '30 dias' }]

const preparoAberto = ref({})
const historicoAberto = ref({})

function isInsumoOculto(nome) {
  const chave = normalizar(nome)
  return ['etiqueta', 'embalagem', 'rotulo', 'rótulo'].some(term => chave.includes(term))
}

function buildIngredientLine(ing, factor, idx) {
  const alvo = ing.tipo === 'receita'
    ? s.receitas.find(x => x.uuid === ing.id)
    : s.produtos.find(x => x.uuid === ing.id)

  const nome = (ing.tipo === 'receita' ? '🥣 ' : '') + (alvo?.nome || 'Item removido')
  const unidade = ing.tipo === 'receita' ? alvo?.unidade_rendimento : alvo?.unidade_base
  const total = Number(ing.quantidade || 0) * factor

  const subIngredientes = ing.tipo === 'receita' && alvo?.ingredientes
    ? (alvo.ingredientes || [])
      .filter(sub => !isInsumoOculto(sub.nome || sub.id))
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
    subIngredientes
  }
}

function buildResumoItem(item, ingredientes) {
  const chocolateIds = ingredientes.filter(ing => normalizar(ing.nome).match(/chocolate|cobertura|ganache/))
  const recheioIds = ingredientes.filter(ing => ing.tipo === 'receita' || normalizar(ing.nome).includes('recheio'))

  return {
    ...item,
    ingredientes,
    qtdChocolate: chocolateIds.reduce((acc, ing) => acc + ing.total, 0),
    unidadeChocolate: chocolateIds[0]?.unidade || 'g',
    qtdRecheio: recheioIds.reduce((acc, ing) => acc + ing.total, 0),
    unidadeRecheio: recheioIds[0]?.unidade || 'g',
    prepItemsCount: ingredientes.length
  }
}

function togglePreparoItem(uid) {
  preparoAberto.value[uid] = !preparoAberto.value[uid]
}

function isPreparoItemAberto(uid) {
  return preparoAberto.value[uid] ?? false
}

function toggleHistoricoItem(uid) {
  historicoAberto.value[uid] = !historicoAberto.value[uid]
}

function isHistoricoItemAberto(uid) {
  return historicoAberto.value[uid] ?? false
}

// ── Computados ────────────────────────────────────────────────
const lista = computed(() => {
  const agora = new Date()
  return [...s.producoes]
    .filter(p => {
      if (filtroAtivo.value === 'hoje') return (p.data_producao || '').slice(0, 10) === agora.toISOString().slice(0, 10)
      const dias = filtroAtivo.value === '7dias' ? 7 : 30
      const limite = new Date(agora); limite.setDate(agora.getDate() - dias)
      return new Date(p.data_producao) >= limite
    })
    .sort((a, b) => (b.data_producao || '').localeCompare(a.data_producao || ''))
})

const gruposProducao = computed(() => {
  const mapa = new Map()

  for (const item of lista.value) {
    const key = item.data_producao || 'sem-data'
    if (!mapa.has(key)) {
      mapa.set(key, {
        id: key,
        data: item.data_producao,
        itens: [],
        custoTotal: 0,
        quantidadeTotalNum: 0,
        unidadeResumo: item.unidade_rendimento || 'un',
        temBase: false,
        temFinal: false
      })
    }

    const grupo = mapa.get(key)
    grupo.itens.push(item)
    grupo.custoTotal += getCustoProducao(item)
    grupo.quantidadeTotalNum += Number(item.quantidade_produzida || item.quantidade || 0)
    if (item.eh_intermediaria) grupo.temBase = true
    else grupo.temFinal = true
  }

  return Array.from(mapa.values()).map(grupo => ({
    ...grupo,
    quantidadeTotal: `${fmtQ(grupo.quantidadeTotalNum, grupo.unidadeResumo)} total`
  }))
})

const receitasFiltradas = computed(() => {
  let r = s.receitas
  if (catAtiva.value === 'Base') return r.filter(x => x.eh_intermediaria)
  if (catAtiva.value !== 'Todas') return r.filter(x => x.categoria === catAtiva.value)
  return r
})

const loteComIngredientes = computed(() =>
  lote.value.map((item, idx) => {
    const fator = item.qtd_produzir / (item.rendimento_base || 1)
    const ingredientes = (item.ingredientes || [])
      .filter(ing => !isInsumoOculto(ing.nome || ing.id))
      .map(ing => buildIngredientLine(ing, fator, idx))

    return buildResumoItem({ ...item, uid: `${item.receita_id}-${idx}` }, ingredientes)
  })
)

const insumosGlobais = computed(() => {
  const mapa = {}
  const nomesParaConsolidar = ['chocolate ao leite', 'cobertura', 'ganache']
  loteComIngredientes.value.forEach(item => {
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

const custoTotalLote = computed(() =>
  lote.value.reduce((acc, i) => acc + (s.getCustoTotal(i) / (i.rendimento_base || 1)) * i.qtd_produzir, 0)
)

const loteComPreparo = computed(() =>
  lote.value
    .map(i => ({ id: i.receita_id, nome: i.nome, modo: s.receitas.find(r => r.uuid === i.receita_id)?.modo_preparo }))
    .filter(x => x.modo)
)

const loteHistorico = computed(() => {
  if (!historicoGrupo.value) return []

  return historicoGrupo.value.itens.map((item, idx) => {
    const receita = s.receitas.find(r => r.uuid === item.receita_id)
    const qtd = Number(item.quantidade_produzida || item.quantidade || 0)

    return {
      uid: item.uuid || `${historicoGrupo.value.id}-${idx}`,
      id: item.receita_id,
      nome: limpar(item.nome_receita || item.receita_nome),
      qtd_produzir: qtd,
      unidade: item.unidade_rendimento || receita?.unidade_rendimento || 'un',
      ingredientes: receita?.ingredientes || [],
      rendimento_base: receita?.rendimento || 1,
      modo_preparo: receita?.modo_preparo || '',
      receitaEncontrada: !!receita
    }
  })
})

const loteHistoricoComIngredientes = computed(() =>
  loteHistorico.value.map(item => {
    const fator = item.qtd_produzir / (item.rendimento_base || 1)
    const ingredientes = (item.ingredientes || [])
      .filter(ing => !isInsumoOculto(ing.nome || ing.id))
      .map(ing => buildIngredientLine(ing, fator, item.uid))

    return buildResumoItem(item, ingredientes)
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

const historicoAviso = computed(() => {
  if (!historicoGrupo.value) return ''
  if (loteHistorico.value.some(item => !item.receitaEncontrada)) {
    return 'Alguns itens nao foram encontrados nas receitas atuais e podem aparecer sem ingredientes.'
  }
  return 'Esta lista foi reconstruida a partir das receitas atuais cadastradas.'
})

// ── Métodos ───────────────────────────────────────────────────
function setFiltro(v) {
  filtroAtivo.value = v
  s.carregarProducoes(30)
}

function toggleGrupo(id) {
  gruposAbertos.value[id] = !gruposAbertos.value[id]
}

function isGrupoAberto(id) {
  return gruposAbertos.value[id] ?? true
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

function getCavidades(r) {
  const n = normalizar(r.nome)
  if (n.includes('trufa')) {
    const p = Number(r.peso_unitario)
    if (p === 30) return 8
    if (p === 19) return 12
  }
  return 0
}

function addForma(r) {
  const cav = getCavidades(r)
  if (!cav) return
  const idx = lote.value.findIndex(i => i.receita_id === r.uuid)
  const step = r.rendimento || 1
  if (idx > -1) {
    const it = lote.value[idx]
    it.qtd_produzir += cav
    it.peso_total = (it.qtd_produzir / (it.rendimento_base || 1)) * (it.peso_unitario || 0)
  } else {
    lote.value.push({
      receita_id: r.uuid, nome: r.nome, qtd_produzir: cav, rendimento_base: step,
      unidade: r.unidade_rendimento, peso_unitario: r.peso_unitario || 0,
      peso_total: (cav / step) * (r.peso_unitario || 0), ingredientes: r.ingredientes || []
    })
  }
}

function addMeiaReceita(r) {
  const valor = (r.rendimento || 0) * 0.5
  if (valor <= 0) return
  const idx = lote.value.findIndex(i => i.receita_id === r.uuid)
  const step = r.rendimento || 1
  if (idx > -1) {
    const it = lote.value[idx]
    it.qtd_produzir += valor
    it.peso_total = (it.qtd_produzir / (it.rendimento_base || 1)) * (it.peso_unitario || 0)
  } else {
    lote.value.push({
      receita_id: r.uuid, nome: r.nome, qtd_produzir: valor, rendimento_base: step,
      unidade: r.unidade_rendimento, peso_unitario: r.peso_unitario || 0,
      peso_total: (valor / step) * (r.peso_unitario || 0), ingredientes: r.ingredientes || []
    })
  }
}

function limparQtdNoLote(r) {
  const idx = lote.value.findIndex(i => i.receita_id === r.uuid)
  if (idx > -1) lote.value.splice(idx, 1)
}

function formatQtdNoLote(valor) {
  if (!valor) return '0'
  return Number.isInteger(valor) ? String(valor) : String(valor).replace('.', ',')
}

function setQtdNoLote(r, raw) {
  const valor = Number(String(raw || '').replace(',', '.'))
  if (!Number.isFinite(valor) || valor <= 0) {
    limparQtdNoLote(r)
    return
  }

  const idx = lote.value.findIndex(i => i.receita_id === r.uuid)
  const step = r.rendimento || 1
  const pesoTotal = (valor / step) * (r.peso_unitario || 0)

  if (idx > -1) {
    const it = lote.value[idx]
    it.qtd_produzir = valor
    it.peso_total = pesoTotal
    return
  }

  lote.value.push({
    receita_id: r.uuid,
    nome: r.nome,
    qtd_produzir: valor,
    rendimento_base: step,
    unidade: r.unidade_rendimento,
    peso_unitario: r.peso_unitario || 0,
    peso_total: pesoTotal,
    ingredientes: r.ingredientes || []
  })
}

function limpar(n) {
  return String(n || '').replace(/\s*[-–]\s*(base|final|intermediária|intermediaria)\s*$/i, '').replace(/\s*\(.*?\)\s*$/i, '').trim()
}

function abrirModal(next) {
  const previous = currentModal.value
  const token = pushOverlayHistory(() => {
    modalHistory.pop()
    currentModal.value = previous
  })
  modalHistory.push({ token, previous })
  currentModal.value = next
}

function fecharModal() {
  const current = modalHistory.at(-1)
  if (!current) {
    currentModal.value = null
    return
  }
  closeOverlayHistory(current.token, () => {
    modalHistory.pop()
    currentModal.value = current.previous
  })
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

function abrirMontagem() {
  lote.value = []
  Object.keys(checklist).forEach(k => delete checklist[k])
  abrirModal('montagem')
}

function abrirCozinhaHistorica(grupo) {
  historicoGrupo.value = grupo
  Object.keys(historicoChecklist).forEach(k => delete historicoChecklist[k])
  abrirModal('cozinha-historico')
}

function getQtdNoLote(id) { return lote.value.find(i => i.receita_id === id)?.qtd_produzir || 0 }

function alterarQtdNoLote(r, delta) {
  const idx = lote.value.findIndex(i => i.receita_id === r.uuid)
  const step = r.rendimento || 1
  if (idx > -1) {
    const it = lote.value[idx]
    it.qtd_produzir = Math.max(0, it.qtd_produzir + (delta * step))
    it.peso_total = (it.qtd_produzir / step) * (r.peso_unitario || 0)
    if (it.qtd_produzir <= 0) lote.value.splice(idx, 1)
  } else if (delta > 0) {
    lote.value.push({
      receita_id: r.uuid, nome: r.nome, qtd_produzir: step, rendimento_base: step,
      unidade: r.unidade_rendimento, peso_unitario: r.peso_unitario || 0,
      peso_total: r.peso_unitario || 0, ingredientes: r.ingredientes || []
    })
  }
}

async function confirmarLote() {
  const ok = await confirm.ask(
    'Confirmar o registro deste lote de produção no histórico?',
    { title: 'Registrar Lote', icon: 'fas fa-industry', type: 'primary', confirmLabel: 'Registrar' }
  )
  if (!ok) return

  saving.value = true
  try {
    const data = nowLocal()
    // ── Snapshot de custo ────────────────────────────────────
    // O custo por unidade é fotografado no momento do registro.
    // Assim, reajustes futuros de ingredientes não afetam o histórico.
    const itens = lote.value.map(i => {
      const receita = s.receitas.find(r => r.uuid === i.receita_id)
      const custoTotal = receita ? s.getCustoTotal(receita) : 0
      const rendimento = receita?.rendimento || 1
      return {
        receita_id: i.receita_id,
        receita_nome: i.nome,
        quantidade_produzida: i.qtd_produzir,
        unidade_rendimento: i.unidade,
        data_producao: data,
        eh_intermediaria: receita?.eh_intermediaria,
        custo_unitario_snapshot: custoTotal / rendimento   // 📸 fotografia do custo atual
      }
    })
    await s.registrarLoteProducao(itens)
    collapseOverlayHistory(modalHistory.length, () => {
      modalHistory.length = 0
      currentModal.value = null
    })
    s.notify('Lote registrado com sucesso!')
  } finally { saving.value = false }
}

onMounted(() => setFiltro('7dias'))
</script>

<style scoped>
/* ── Utilitários ── */
.loading-box { display:flex; justify-content:center; padding:40px }
.flex-no-shrink { flex-shrink:0 }
.row-right { text-align:right; flex-shrink:0 }
.mt-4  { margin-top:4px }
.mt-12 { margin-top:12px }
.mb-12 { margin-bottom:12px }
.mt-16 { margin-top:16px }
.ml-4  { margin-left:4px }
.spacer { flex:1 }
.row-cost { font-weight:700; color:var(--orange) }

/* ── Produção: lista de grupos ── */
.production-groups { display:flex; flex-direction:column; gap:10px; padding:10px 12px 0 }

.production-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; box-shadow:var(--shadow-sm) }

.production-card-head { width:100%; border:none; background:var(--surface); padding:13px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; text-align:left; min-height:64px; transition:background var(--t) }
.production-card-head:active { background:var(--gold-bg) }

.production-card-main { min-width:0 }
.production-card-title { font-size:.92rem; font-weight:800; color:var(--brown-dark) }
.production-card-sub { display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; font-size:.76rem; color:var(--muted) }

.production-card-side { display:flex; align-items:center; gap:8px; flex-shrink:0 }
.production-card-kitchen { width:38px; height:38px; border:1.5px solid var(--border); border-radius:var(--r-sm); background:var(--cream); color:var(--brown-mid); display:flex; align-items:center; justify-content:center; font-size:.9rem; transition:all var(--t) }
.production-card-kitchen:active { background:var(--gold-bg); color:var(--gold-dark); border-color:var(--gold) }

.production-card-chevron { color:var(--muted); font-size:.85rem; transition:transform var(--t) }
.production-card-chevron.open { transform:rotate(180deg) }

.production-card-body { border-top:1px solid var(--border); background:var(--bg); padding: 10px 0; }

/* ── Formulário: Montagem de Lote ── */
.batch-planning { display:flex; flex-direction:column; gap:2px }

/* Linha de receita no planner */
.plan-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-md);
  margin-bottom: 6px;
  min-height: 68px;
  transition: border-color var(--t);
}
.plan-card:has(.qty-input:focus) { border-color: var(--brown-mid) }

.plan-info { flex:1; min-width:0 }
.plan-head { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:3px }
.plan-name { font-size:.9rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px }
.plan-tags { display:flex; gap:4px; flex-wrap:wrap }
.plan-sub { font-size:.76rem; color:var(--muted) }
.plan-total { color:var(--brown-mid); font-weight:700; font-family:var(--mono) }

/* Badge atalho (+1 Forma / ½ Receita) */
.badge-shortcut {
  padding: 3px 8px;
  border-radius: var(--r-full);
  background: var(--gold-bg);
  border: 1px solid #e8d5a0;
  color: var(--gold-dark);
  font-size: .68rem;
  font-weight: 700;
  white-space: nowrap;
  min-height: 28px;
  display: flex;
  align-items: center;
  transition: all var(--t);
}
.badge-shortcut.is-blue { background: var(--blue-bg); border-color: #bfdbfe; color: var(--blue) }
.badge-shortcut:active { transform: scale(.95) }

/* Controles de quantidade */
.qty-ctrl-sm {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.btn-qty-sm {
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  border: 1.5px solid var(--border);
  background: var(--cream);
  color: var(--brown-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .8rem;
  flex-shrink: 0;
  transition: all var(--t);
}
.btn-qty-sm:active { transform: scale(.9) }
.btn-qty-primary { background: var(--brown); border-color: var(--brown); color: #fff }
.btn-qty-primary:active { opacity: .8 }
.btn-clear { background: var(--red-bg); border-color: var(--red-bg); color: var(--red) }

.qty-input {
  width: 52px;
  padding: 8px 6px;
  text-align: center;
  font-size: .92rem;
  font-weight: 800;
  font-family: var(--mono);
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text);
  min-height: 36px;
  appearance: none;
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button { -webkit-appearance: none }
.qty-input.qty-zero { color: var(--border2) }
.qty-input:focus { outline: none; border-color: var(--brown-mid); box-shadow: 0 0 0 3px rgba(122,69,32,.1) }
.btn-qty-inline { margin-left: 2px }

/* ── Modal: Cozinha ── */

.pesagem-header {
  display: flex;
  gap: 10px;
  padding: 14px 16px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  margin-bottom: 0;
}
.pesagem-stat { font-size:.85rem; color:var(--muted) }
.pesagem-stat strong { color:var(--brown); font-weight:800 }

.sheet-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; box-shadow:var(--shadow-sm); margin:0 16px }
.sheet-body { padding:14px}

.batch-group { margin-bottom:16px }
.batch-group:last-child { margin-bottom:0 }
.group-title { color:var(--brown-mid) !important }

.prep-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
}

.prep-card-head {
  width: 100%;
  border: none;
  background: var(--surface);
  padding: 16px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  transition: background var(--t);
}

.prep-card-head:active { background: var(--gold-bg) }

.prep-card-summary { flex: 1; min-width: 0 }
.prep-card-summary .group-title {
  font-size: .92rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.prep-badge {
  background: var(--cream);
  color: var(--brown-mid);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  padding: 4px 10px;
  font-size: .72rem;
  font-weight: 700;
}

.prep-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  font-size: .78rem;
  color: var(--muted);
  align-items: center;
}

.prep-chip {
  background: var(--cream);
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  padding: 5px 10px;
  font-size: .74rem;
  font-weight: 700;
}

.prep-chevron {
  font-size: .88rem;
  color: var(--muted);
  transition: transform var(--t);
}

.prep-chevron.open { transform: rotate(180deg) }

.prep-card-body {
  background: var(--cream);
  padding: 12px 14px 16px;
  border-top: 1px solid var(--border);
}

.prep-ingredient-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.prep-ingredient-row:last-child { border-bottom: none }

.prep-ingredient-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.prep-ingredient-name {
  font-size: .88rem;
  font-weight: 700;
  color: var(--brown-dark);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prep-ingredient-qty {
  font-size: .88rem;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--brown);
}

.prep-sublist {
  margin-top: 8px;
  padding-left: 16px;
  display: grid;
  gap: 6px;
}

.prep-subitem {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: .82rem;
  color: var(--muted);
}

.prep-subitem strong {
  color: var(--brown);
  font-family: var(--mono);
}

.global-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  margin-top: 16px;
}

.global-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.global-item span {
  font-size: .88rem;
  font-weight: 700;
  color: var(--brown-dark);
}

.global-item strong {
  font-size: .88rem;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--brown);
}

.checklist { display:flex; flex-direction:column; gap:4px }
.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-radius: var(--r-sm);
  border: none;
  background: transparent;
  cursor: pointer;
  min-height: 52px;
  transition: all var(--t);
  border-bottom: 1px solid var(--border);
}
.check-item:active { background: var(--cream) }
.check-item.done { background: var(--green-bg); border-color: var(--green-dim) }

.check-box { font-size:1.15rem; flex-shrink:0 }
.check-item:not(.done) .check-box { color: var(--border2) }
.check-item.done .check-box { color: var(--green) }

.check-info { flex:1; min-width:0 }
.check-name { font-size:.88rem; font-weight:700; color:var(--text) }
.check-qty  { font-size:.8rem; font-family:var(--mono); font-weight:700; color:var(--brown-mid); margin-top:2px }
.check-item.done .check-name { color:var(--muted); text-decoration:line-through }

/* ── Modal: Registrar produção ── */
.reg-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 14px;
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  margin-bottom: 4px;
}
.reg-row { display:flex; justify-content:space-between; font-size:.85rem }
.reg-label { color:var(--muted) }
.reg-val   { font-weight:700; font-family:var(--mono); color:var(--brown) }

/* ── Seção label ── */
.section-label {
  font-size:.72rem;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.7px;
  color:var(--gold-dark);
  margin-bottom:8px;
  display:flex;
  align-items:center;
  gap:5px;
}

/* ── Misc ── */
.swipe-btn {
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  width:100%;
  height:100%;
}

.swipe-btn i { font-size:1.1rem }
.swipe-btn:active { filter:brightness(.85) }
.swipe-btn.estornar { background:var(--orange) }
/* ── Barra de filtros sticky (edge-to-edge) ── */
.modal-filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 10px 0 0;
}
.modal-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 16px 12px;
}
.modal-chips::-webkit-scrollbar { display: none }
.planned-items { display:flex; flex-direction:column }
.montagem-body { padding: 16px 16px 16px }
.empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:52px 24px; text-align:center; gap:10px }
.empty i { font-size:2.8rem; color:var(--border2); margin-bottom:4px }
.empty h3 { font-size:.95rem; font-weight:700; color:var(--muted) }
.mt-12-forced { margin-top:12px }

.modal-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
