<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-industry"></i> Produção</h2>
        <button class="btn-primary-sm" @click="abrirMontagem"><i class="fas fa-plus"></i> Produzir</button>
      </div>
      <div class="chips">
        <button v-for="f in filtros" :key="f.v" class="chip" :class="{ active: filtroAtivo === f.v }" @click="setFiltro(f.v)">{{ f.l }}</button>
      </div>
    </div>

    <div v-if="s.loading" class="loading-box"><div class="spinner spinner-sm"></div></div>

    <template v-else-if="lista.length">
      <div v-for="p in lista" :key="p.id||p.uuid" class="list-row">
        <div class="action-ico flex-no-shrink mt-4" :class="p.eh_intermediaria ? 'ico-blue' : 'ico-gold'">
          <i :class="p.eh_intermediaria ? 'fas fa-blender' : 'fas fa-cookie-bite'"></i>
        </div>
        <div class="row-info">
          <div class="row-name">
            {{ limpar(p.nome_receita || p.receita_nome) }}
            <span class="badge" :class="p.eh_intermediaria ? 'badge-blue' : 'badge-gold'">{{ p.eh_intermediaria ? 'Base' : 'Final' }}</span>
          </div>
          <div class="row-sub">
            <span>{{ dataHoraBR(p.data_producao) }} • <span class="row-cost">Custo: {{ R$(getCustoProducao(p)) }}</span></span>
          </div>
        </div>
        <div class="row-right">
          <div class="row-val c-brown">{{ p.quantidade_produzida || p.quantidade }} {{ p.unidade_rendimento || 'un' }}</div>
          <button class="btn-icon danger mt-3" title="Estornar" @click.stop="estornar(p)"><i class="fas fa-rotate-left"></i></button>
        </div>
      </div>
    </template>

    <div v-else-if="!s.loading" class="empty">
      <i class="fas fa-industry"></i>
      <h3>Nenhuma produção no período</h3>
      <button class="btn btn-primary mt-12" @click="abrirMontagem"><i class="fas fa-plus"></i> Iniciar Lote</button>
    </div>

   <!-- ─── Modal Etapa 1: Montagem de Lote ───────────────────── -->
    <BaseModal v-if="currentModal === 'montagem'" title="Montar Lote" @close="currentModal = null">
      <!-- Filtro por Categorias (Horizontal Scroll) -->
      <div class="cat-filter-wrap">
        <div class="cat-chips">
          <button 
            v-for="c in listaCategorias" :key="c" 
            class="cat-chip" :class="{ active: catAtiva === c }"
            @click="catAtiva = c"
          >{{ c }}</button>
        </div>
      </div>

      <div class="batch-planning mt-12">
        <div class="section-label">📋 Selecione as Receitas</div>
        <div class="planned-items">
          <div v-for="r in receitasFiltradas" :key="r.id" class="plan-card">
            <div class="plan-info">
              <div class="plan-name">{{ r.nome }}</div>
              <div class="plan-sub">
                Rende: {{ r.rendimento }}{{ r.unidade_rendimento }}
                <span v-if="getQtdNoLote(r.id) > 0 && r.peso_unitario > 0" class="plan-total">
                  • {{ fmtQ((getQtdNoLote(r.id) / r.rendimento) * r.peso_unitario, 'g') }} total
                </span>
              </div>
            </div>
            <div class="qty-ctrl-sm">
              <button class="btn-qty-sm" @click="alterarQtdNoLote(r, -1)"><i class="fas fa-minus"></i></button>
              <span class="qty-val" :class="{ 'qty-zero': !getQtdNoLote(r.id) }">{{ getQtdNoLote(r.id) }}</span>
              <button class="btn-qty-sm" @click="alterarQtdNoLote(r, 1)"><i class="fas fa-plus"></i></button>
            </div>
          </div>
        </div>
      </div>

      <template #foot>
        <button class="btn btn-secondary" @click="currentModal = null">Cancelar</button>
        <button class="btn btn-primary" :disabled="!lote.length" @click="currentModal = 'cozinha'">
          Cozinha <i class="fas fa-utensils ml-4"></i>
        </button>
      </template>
    </BaseModal>

    <!-- ─── Modal Etapa 2: Ficha de Cozinha (Pesagem) ─────────── -->
    <BaseModal v-if="currentModal === 'cozinha'" title="Ficha de Pesagem" @close="currentModal = 'montagem'">
      <div class="pesagem-header">
        <div class="pesagem-stat"><span>Lote:</span> <strong>{{ lote.length }} itens</strong></div>
        <div class="pesagem-stat"><span>Custo Est.:</span> <strong>{{ R$(custoTotalLote) }}</strong></div>
      </div>

      <div class="sheet-card mt-12">
        <div class="sheet-body">
          <div class="section-label">🥣 Ingredientes Consolidados</div>
          <div class="checklist">
            <div v-for="ing in insumosConsolidados" :key="ing.id" 
                 class="check-item" :class="{ 'done': checklist[ing.id] }"
                 @click="checklist[ing.id] = !checklist[ing.id]">
              <div class="check-box"><i class="fas" :class="checklist[ing.id] ? 'fa-check-square' : 'fa-square'"></i></div>
              <div class="check-info">
                <div class="check-name">{{ ing.nome }}</div>
                <div class="check-val">{{ fmtQ(ing.total, ing.unidade) }}</div>
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

      <template #foot>
        <button class="btn btn-secondary" @click="currentModal = 'montagem'"><i class="fas fa-arrow-left"></i> Voltar</button>
        <button class="btn btn-primary" :disabled="saving" @click="confirmarLote">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <span v-else>Registrar Produção <i class="fas fa-check-double ml-4"></i></span>
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useStore } from '../store.js'
import { R$, dataHoraBR, fmtQtd as fmtQ, nowLocal, normalizar } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'

const s = useStore()
const filtroAtivo = ref('7dias')
const currentModal = ref(null) // 'montagem' | 'cozinha' | null
const saving = ref(false)
// Lote e Pesagem
const lote = ref([])
const checklist = reactive({})
const catAtiva = ref('Todas')
const listaCategorias = ['Todas', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']
const filtros = [{ v:'hoje', l:'Hoje' }, { v:'7dias', l:'7 dias' }, { v:'30dias', l:'30 dias' }]

// Computados
const lista = computed(() => [...s.producoes].sort((a, b) => (b.data_producao||'').localeCompare(a.data_producao||'')))

const receitasFiltradas = computed(() => {
  let r = s.receitas
  if (catAtiva.value === 'Base') return r.filter(x => x.eh_intermediaria)
  if (catAtiva.value !== 'Todas') return r.filter(x => x.categoria === catAtiva.value)
  return r
})

const insumosConsolidados = computed(() => {
  const mapa = {}
  lote.value.forEach(item => {
    const fator = item.qtd_produzir / (item.rendimento_base || 1)
    item.ingredientes.forEach(ing => {
      const key = `${ing.tipo}-${ing.id}`
      if (!mapa[key]) {
        const alvo = ing.tipo === 'receita' ? s.receitas.find(x => x.id === ing.id) : s.produtos.find(x => x.id === ing.id)
        mapa[key] = { 
          id: key, 
          nome: (ing.tipo === 'receita' ? '🥣 ' : '') + (alvo?.nome || 'Item'),
          unidade: ing.tipo === 'receita' ? alvo?.unidade_rendimento : alvo?.unidade_base,
          total: 0 
        }
      }
      mapa[key].total += (ing.quantidade * fator)
    })
  })
  return Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome))
})

const custoTotalLote = computed(() => {
  return lote.value.reduce((acc, i) => acc + (s.getCustoTotal(i) / (i.rendimento_base || 1)) * i.qtd_produzir, 0)
})

const loteComPreparo = computed(() => lote.value.map(i => ({ id: i.receita_id, nome: i.nome, modo: s.receitas.find(r => r.id === i.receita_id)?.modo_preparo })).filter(x => x.modo))

// Métodos
function setFiltro(v) { filtroAtivo.value = v; s.carregarProducoes(v === 'hoje' ? 0 : v === '7dias' ? 7 : 30) }
function getCustoProducao(p) {
  const r = s.receitas.find(rec => rec.id === p.receita_id)
  return r ? (s.getCustoTotal(r) / (r.rendimento || 1)) * (p.quantidade_produzida || p.quantidade || 0) : 0
}
function limpar(n) { return String(n||'').replace(/\s*[-–]\s*(base|final|intermediária|intermediaria)\s*$/i,'').replace(/\s*\(.*?\)\s*$/i,'').trim() }
async function estornar(p) { if (confirm(`Estornar produção de "${limpar(p.nome_receita || p.receita_nome)}"?`)) await s.estornarProducao(p.id) }

function abrirMontagem() {
  lote.value = []
  Object.keys(checklist).forEach(k => delete checklist[k])
  currentModal.value = 'montagem'
}

function getQtdNoLote(id) {
  return lote.value.find(i => i.receita_id === id)?.qtd_produzir || 0
}

function alterarQtdNoLote(r, delta) {
  const idx = lote.value.findIndex(i => i.receita_id === r.id)
  const step = r.rendimento || 1
  if (idx > -1) {
    const it = lote.value[idx]
    it.qtd_produzir = Math.max(0, it.qtd_produzir + (delta * step))
    it.peso_total = (it.qtd_produzir / step) * (r.peso_unitario || 0)
    if (it.qtd_produzir <= 0) lote.value.splice(idx, 1)
  } else if (delta > 0) {
    lote.value.push({
      receita_id: r.id, nome: r.nome, qtd_produzir: step, rendimento_base: step,
      unidade: r.unidade_rendimento, peso_unitario: r.peso_unitario || 0, peso_total: r.peso_unitario || 0,
      ingredientes: r.ingredientes || []
    })
  }
}

async function confirmarLote() {
  if (!confirm('Registrar este lote de produção no histórico?')) return
  saving.value = true
  try {
    const data = nowLocal()
    const itens = lote.value.map(i => ({
      receita_id: i.receita_id, receita_nome: i.nome, quantidade_produzida: i.qtd_produzir,
      unidade_rendimento: i.unidade, data_producao: data, eh_intermediaria: s.receitas.find(r => r.id === i.receita_id)?.eh_intermediaria
    }))
    await s.registrarLoteProducao(itens)
    currentModal.value = null
    s.notify('Lote registrado com sucesso!')
  } finally { saving.value = false }
}

onMounted(() => setFiltro('7dias'))
</script>


<style scoped>
.loading-box { display: flex; justify-content: center; padding: 40px; }
.flex-no-shrink { flex-shrink: 0; }
.row-right { text-align: right; flex-shrink: 0; }
.mt-3 { margin-top: 3px; }
.mt-4 { margin-top: 4px; }
.mt-12 { margin-top: 12px; }
.mb-12 { margin-bottom: 12px; }
.mt-16 { margin-top: 16px; }
.ml-4 { margin-left: 4px; }
.row-cost { font-weight: 700; color: var(--orange); }

/* Estilos Lote */
.cat-filter-wrap { margin: -10px -16px 12px; padding: 10px 0; background: var(--bg); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
.cat-chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px; scrollbar-width: none; }
.cat-chips::-webkit-scrollbar { display: none; }
.cat-chip { flex-shrink: 0; padding: 7px 14px; border-radius: 20px; border: 1px solid var(--border); background: #fff; font-size: 0.75rem; font-weight: 700; color: var(--muted); cursor: pointer; }
.cat-chip.active { background: var(--brown); color: #fff; border-color: var(--brown); }

.quick-add-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.qa-btn { background: #fff; border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 6px; text-align: center; cursor: pointer; }
.qa-btn:active { background: var(--gold-bg); transform: scale(0.96); }
.qa-name { font-size: 0.78rem; font-weight: 700; color: var(--brown); line-height: 1.2; margin-bottom: 2px; }
.qa-un { font-size: 0.65rem; color: var(--gold-dark); font-weight: 600; }

.planned-items { display: flex; flex-direction: column; gap: 6px; }
.plan-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-md); padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; }
.plan-name { font-weight: 700; font-size: 0.85rem; color: var(--brown); }
.plan-sub { font-size: 0.7rem; color: var(--muted); }
.qty-ctrl-sm { display: flex; align-items: center; gap: 10px; }
.btn-qty-sm { border: 1px solid var(--border); background: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--gold-dark); }
.qty-val { font-family: var(--mono); font-weight: 800; font-size: 0.95rem; min-width: 20px; text-align: center; }
.qty-zero { opacity: 0.25; font-weight: 400; }
.plan-total { color: var(--gold-dark); font-weight: 600; }

/* Ficha de Cozinha */
.pesagem-header { display: flex; justify-content: space-between; background: var(--cream); padding: 10px 14px; border-radius: var(--r-md); font-size: 0.85rem; }
.sheet-card { background: #fff; border-radius: var(--r-lg); border: 1px solid var(--border); box-shadow: var(--shadow-sm); overflow: hidden; }
.sheet-body { padding: 16px; }
.section-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--gold-dark); letter-spacing: 1px; margin-bottom: 10px; }
.checklist { display: flex; flex-direction: column; gap: 8px; }
.check-item { display: flex; align-items: center; padding: 10px; background: var(--bg); border-radius: var(--r-md); cursor: pointer; }
.check-item.done { opacity: 0.5; background: #f1f5f9; }
.check-item.done .check-name { text-decoration: line-through; }
.check-box { font-size: 1.2rem; margin-right: 12px; color: var(--gold); }
.check-info { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.check-name { font-weight: 700; font-size: 0.9rem; color: var(--brown); }
.check-val { font-family: var(--mono); font-weight: 800; font-size: 0.95rem; color: var(--brown-dark); }

.prep-note { background: var(--cream); padding: 8px 12px; border-radius: var(--r-sm); font-size: 0.8rem; margin-bottom: 6px; border-left: 3px solid var(--gold); }
.empty-mini { text-align: center; padding: 30px 0; color: var(--muted); }
.empty-mini i { font-size: 1.5rem; margin-bottom: 8px; display: block; }
</style>