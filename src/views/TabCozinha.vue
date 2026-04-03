<template>
  <div class="tab-cozinha">
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-layer-group"></i> Lote de Produção</h2>
        <button v-if="lote.length" class="btn-sec-sm" @click="limparLote"><i class="fas fa-trash"></i> Limpar</button>
      </div>
    </div>

    <!-- Filtro por Categoria (Horizontal Scroll) -->
    <div class="cat-filter-wrap">
      <div class="cat-chips">
        <button 
          v-for="c in categorias" 
          :key="c" 
          class="cat-chip" 
          :class="{ active: catAtiva === c }"
          @click="catAtiva = c"
        >{{ c }}</button>
      </div>
    </div>

    <!-- Grade de Seleção Rápida (Otimizada para toque) -->
    <div class="quick-add-grid">
      <button v-for="r in receitasFiltradas" :key="r.id" class="qa-btn" @click="adicionarAoLote(r)">
        <span class="qa-name">{{ r.nome }}</span>
        <span class="qa-un">{{ r.rendimento }} {{ r.unidade_rendimento }}</span>
      </button>
    </div>

    <div v-if="lote.length" class="batch-content">
      <!-- Lista de itens planejados -->
      <div class="section-label">📋 Itens no Lote</div>
      <div class="planned-items">
        <div v-for="(item, idx) in lote" :key="idx" class="plan-card">
          <div class="plan-info">
            <div class="plan-name">{{ item.nome }}</div>
            <div class="plan-sub">{{ fmtQ(item.peso_total, 'g') }} total</div>
          </div>
          <div class="qty-ctrl-sm">
            <button class="btn-qty-sm" @click="ajustarQtd(idx, -1)">-</button>
            <span class="qty-val">{{ item.qtd_produzir }}</span>
            <button class="btn-qty-sm" @click="ajustarQtd(idx, 1)">+</button>
          </div>
        </div>
      </div>

      <!-- Pesagem Consolidada -->
      <div class="sheet-card mt-16">
        <div class="sheet-body">
          <div class="section-label">🥣 Total para pesar (Consolidado)</div>
          <div class="checklist">
            <div v-for="ing in ingredientesAgrupados" 
                 :key="ing.id" 
                 class="check-item" 
                 :class="{ 'done': checklist[ing.id] }"
                 @click="checklist[ing.id] = !checklist[ing.id]">
              <div class="check-box">
                <i class="fas" :class="checklist[ing.id] ? 'fa-check-square' : 'fa-square'"></i>
              </div>
              <div class="check-info">
                <div class="check-name">{{ ing.nome }}</div>
                <div class="check-val">{{ fmtQ(ing.total, ing.unidade) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-lg btn-full mt-16 mb-32" @click="finalizarLote">
        <i class="fas fa-check-double"></i> Registrar Produção do Lote
      </button>
    </div>

    <div v-else class="empty">
      <i class="fas fa-mortar-pestle"></i>
      <h3>Lote Vazio</h3>
      <p>Adicione receitas acima para calcular o preparo total.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useStore } from '../store.js'
import { fmtQtd as fmtQ, nowLocal } from '../utils.js'

const s = useStore()
const lote = ref([])
const checklist = reactive({})
const categorias = ['Todas', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo']
const catAtiva = ref('Todas')

const receitasFiltradas = computed(() => {
  if (catAtiva.value === 'Todas') return s.receitas
  return s.receitas.filter(r => r.categoria === catAtiva.value)
})

function adicionarAoLote(r) {
  const existente = lote.value.find(item => item.receita_id === r.id)
  if (existente) {
    existente.qtd_produzir += r.rendimento
    existente.peso_total = (existente.qtd_produzir / r.rendimento) * (r.peso_unitario || 0)
  } else {
    lote.value.push({
      receita_id: r.id,
      nome: r.nome,
      qtd_produzir: r.rendimento,
      rendimento_base: r.rendimento,
      unidade: r.unidade_rendimento,
      peso_unitario: r.peso_unitario || 0,
      peso_total: r.peso_unitario || 0,
      eh_intermediaria: r.eh_intermediaria,
      ingredientes: r.ingredientes || []
    })
  }
}

function ajustarQtd(idx, delta) {
  const item = lote.value[idx]
  const step = item.rendimento_base || 1
  item.qtd_produzir = Math.max(0, item.qtd_produzir + (delta * step))
  item.peso_total = (item.qtd_produzir / step) * (item.peso_unitario || 0)
  if (item.qtd_produzir === 0) lote.value.splice(idx, 1)
}

const ingredientesAgrupados = computed(() => {
  const mapa = {}
  lote.value.forEach(item => {
    const fator = item.qtd_produzir / (item.rendimento_base || 1)
    item.ingredientes.forEach(ing => {
      const key = `${ing.tipo}-${ing.id}`
      if (!mapa[key]) {
        const alvo = ing.tipo === 'receita' ? s.receitas.find(x => x.id === ing.id) : s.produtos.find(x => x.id === ing.id)
        mapa[key] = { 
          id: key, 
          nome: (ing.tipo === 'receita' ? '🥣 ' : '') + (alvo?.nome || 'Item removido'),
          unidade: ing.tipo === 'receita' ? alvo?.unidade_rendimento : alvo?.unidade_base,
          total: 0 
        }
      }
      mapa[key].total += (ing.quantidade * fator)
    })
  })
  return Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome))
})

async function finalizarLote() {
  if (!confirm('Deseja registrar toda essa produção no histórico?')) return
  const data = nowLocal()
  const producoes = lote.value.map(item => ({
    receita_id: item.receita_id,
    receita_nome: item.nome,
    quantidade_produzida: item.qtd_produzir,
    unidade_rendimento: item.unidade,
    eh_intermediaria: item.eh_intermediaria,
    data_producao: data
  }))
  await s.registrarLoteProducao(producoes)
  limparLote()
  s.notify('Produção registrada!')
  s.setTab('producao')
}

function limparLote() {
  lote.value = []
  Object.keys(checklist).forEach(k => delete checklist[k])
}
</script>

<style scoped>
.tab-cozinha { padding-bottom: 100px; }

.cat-filter-wrap { padding: 0 0 12px 0; margin-bottom: 12px; border-bottom: 1px solid var(--border); }
.cat-chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px; scrollbar-width: none; }
.cat-chips::-webkit-scrollbar { display: none; }
.cat-chip { flex-shrink: 0; padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border); background: #fff; font-size: 0.8rem; font-weight: 700; color: var(--muted); cursor: pointer; transition: all 0.2s; }
.cat-chip.active { background: var(--brown); color: #fff; border-color: var(--brown); }

.quick-add-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; padding: 0 16px 16px; border-bottom: 1px solid var(--border); }
.qa-btn { background: #fff; border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; box-shadow: var(--shadow-sm); cursor: pointer; }
.qa-btn:active { background: var(--gold-bg); transform: scale(0.95); }
.qa-name { font-size: .85rem; font-weight: 700; color: var(--brown); text-align: center; line-height: 1.2; }
.qa-un { font-size: .7rem; color: var(--gold-dark); font-weight: 600; }

.batch-content { padding: 16px; }
.planned-items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.plan-card { background: #fff; border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
.plan-name { font-weight: 700; font-size: .9rem; color: var(--brown); }
.plan-sub { font-size: .75rem; color: var(--muted); }

.qty-ctrl-sm { display: flex; align-items: center; gap: 12px; background: var(--bg); border-radius: 20px; padding: 4px; border: 1px solid var(--border); }
.btn-qty-sm { border: none; background: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; font-weight: bold; color: var(--gold-dark); box-shadow: var(--shadow-sm); cursor: pointer; }
.qty-val { font-family: var(--mono); font-weight: 800; font-size: 1rem; min-width: 24px; text-align: center; }

.mt-16 { margin-top: 16px; }
.mb-32 { margin-bottom: 32px; }

.sheet-card { background: #fff; border-radius: var(--r-lg); border: 1px solid var(--border); box-shadow: var(--shadow-sm); overflow: hidden; }
.sheet-body { padding: 20px; }
.section-label { font-size: .7rem; font-weight: 800; text-transform: uppercase; color: var(--gold-dark); letter-spacing: 1px; margin-bottom: 15px; }

.checklist { display: flex; flex-direction: column; gap: 10px; }
.check-item { display: flex; align-items: center; padding: 14px; background: var(--bg); border-radius: var(--r-md); cursor: pointer; border: 1px solid transparent; }
.check-item.done { opacity: 0.5; background: #f8fafc; border-color: var(--border); }
.check-box { font-size: 1.4rem; margin-right: 15px; color: var(--gold); }
.done .check-box { color: var(--green); }
.check-info { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.check-name { font-weight: 700; font-size: 1rem; color: var(--brown); }
.done .check-name { text-decoration: line-through; }
.check-val { font-family: var(--mono); font-weight: 800; font-size: 1.1rem; color: var(--brown-dark); background: #fff; padding: 4px 8px; border-radius: var(--r-sm); border: 1px solid var(--border); }

@media (max-width: 400px) {
  .check-info { flex-direction: column; align-items: flex-start; gap: 4px; }
  .check-val { width: 100%; text-align: center; }
}
</style>