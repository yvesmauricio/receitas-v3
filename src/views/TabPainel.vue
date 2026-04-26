<template>
  <div class="tab-painel">
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-chart-pie"></i> Painel de Negócio</h2>
      </div>
      <CategoryFilter v-model="periodoAtivo" :items="periodosNorm" />
    </div>

    <div class="painel-content">
      <div v-if="s.loading" class="loading-box"><div class="spinner spinner-sm"></div></div>

      <template v-else>
        <!-- Cards de Resumo Financeiro -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Produção Final</span>
            <span class="stat-val">{{ stats.totalQtd }} <small>un</small></span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Custo Total</span>
            <span class="stat-val c-orange">{{ R$(stats.totalCusto) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Faturamento</span>
            <span class="stat-val c-green">{{ R$(stats.totalVenda) }}</span>
          </div>
          <div class="stat-card highlight">
            <span class="stat-label">Resultado</span>
            <span class="stat-val" :class="stats.totalLucro >= 0 ? 'c-green' : 'c-red'">
              {{ R$(stats.totalLucro) }}
            </span>
          </div>
        </div>

        <!-- 💡 Sugestão de Combo Estratégico (Acima de Produção por Categoria) -->
        <section v-if="autoCombo" class="sheet-card auto-combo-card mb-16">
          <div class="sheet-body">
            <div class="flex-hdr mb-10">
              <div class="section-label" style="margin-bottom:0"><i class="fas fa-wand-magic-sparkles"></i> Sugestão de Combo</div>
              <button class="btn btn-secondary btn-sm" @click="compartilharCombo">
                <i class="fab fa-whatsapp"></i> Enviar
              </button>
            </div>
            
            <div class="auto-combo-header">
              <div class="auto-combo-title">{{ autoCombo.nome }}</div>
              <p class="auto-combo-desc">
                Unimos seu item <strong>mais vendido</strong> com um de <strong>alta margem</strong> para maximizar seu retorno.
              </p>
            </div>

            <div class="auto-combo-items">
              <div class="ac-item">
                <span class="ac-qtd">2x</span> {{ autoCombo.itemPopular.nome }}
              </div>
              <div class="ac-item">
                <span class="ac-qtd">1x</span> {{ autoCombo.itemLucro.nome }}
              </div>
            </div>

            <div class="price-ladder mt-12">
              <div class="ladder-grid">
                <div v-for="p in autoCombo.escala" :key="p.qtd" class="ladder-item">
                  <span class="l-qtd">{{ p.qtd }} kit{{ p.qtd > 1 ? 's' : '' }}</span>
                  <strong class="l-val">{{ R$(p.total) }}</strong>
                  <small class="l-unit">({{ R$(p.unitario) }}/un)</small>
                </div>
              </div>
            </div>

            <div class="auto-combo-footer mt-10">
              <span>Lucro p/ Kit: <strong>{{ R$(autoCombo.lucroUnitario) }}</strong></span>
              <span class="badge badge-green">{{ autoCombo.margem.toFixed(0) }}% margem</span>
            </div>
          </div>
        </section>

        <!-- Gráfico de Categorias -->
        <div class="section-label">📊 Produção por Categoria</div>
        <div class="sheet-card mb-16">
          <div class="sheet-body">
            <div v-if="!stats.porCategoria.length" class="empty-mini">Sem produções no período</div>
            <div v-for="cat in stats.porCategoria" :key="cat.nome" class="chart-row">
              <div class="chart-info">
                <span>{{ cat.nome }}</span>
                <strong>{{ cat.qtd }} un</strong>
              </div>
              <div class="chart-bar-bg">
                <div class="chart-bar-fill" :style="{ width: cat.percent + '%', backgroundColor: avatarColor(cat.nome) }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Ranking de Receitas -->
        <div class="section-label">🏆 Ranking de Receitas</div>
        <div class="sheet-card mb-16">
          <div class="sheet-body p-0">
            <div v-if="!stats.topReceitas.length" class="empty-mini">Sem dados no período</div>
            <div v-for="(item, idx) in stats.topReceitas" :key="item.nome" class="list-row">
              <div class="row-rank">{{ idx + 1 }}º</div>
              <div class="row-info">
                <div class="row-name">{{ item.nome }}</div>
                <div class="row-sub">{{ item.qtd }} {{ item.unidade }} produzidas</div>
              </div>
              <div class="row-right">
                <div class="row-val c-green">{{ R$(item.lucroTotal) }}</div>
                <div class="row-sub">lucro est.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Ingredientes Consumidos -->
        <div class="section-label">🥣 Ingredientes Consumidos</div>
        <div class="sheet-card mb-16">
          <div class="sheet-body">
            <div v-if="!stats.consumoInsumos.length" class="empty-mini">Sem dados no período</div>
            <template v-else>
              <div class="flex-hdr mb-10">
                <p class="hint">Total estimado para reposição:</p>
                <button class="btn btn-secondary btn-sm" @click="compartilharLista">
                  <i class="fas fa-share-nodes"></i> Compartilhar
                </button>
              </div>
              <div class="insumo-list">
                <div v-for="ins in stats.consumoInsumos" :key="ins.nome" class="chart-row">
                  <div class="chart-info">
                    <span class="usage-name">{{ ins.nome }}</span>
                    <strong class="usage-val">{{ fmtQ(ins.total, ins.unidade) }}</strong>
                  </div>
                  <div class="chart-bar-bg">
                    <div class="chart-bar-fill" :style="{
                      width: (ins.total / stats.consumoInsumos[0].total * 100).toFixed(1) + '%',
                      backgroundColor: avatarColor(ins.nome)
                    }"></div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStore } from '../store.js'
import CategoryFilter from '../components/CategoryFilter.vue'
import { R$, avatarColor, fmtQtd as fmtQ } from '../utils.js'

const s = useStore()
const periodoAtivo = ref('30dias')
const periodos = [
  { v: '7dias', l: '7 Dias' },
  { v: '30dias', l: '30 Dias' },
  { v: 'total', l: 'Tudo' }
]
const periodosNorm = periodos.map(p => ({ value: p.v, label: p.l }))

const atualizarDados = () => {
  const dias = periodoAtivo.value === '7dias' ? 7 : periodoAtivo.value === '30dias' ? 30 : 0
  s.carregarProducoes(dias)
}

watch(periodoAtivo, atualizarDados)
onMounted(atualizarDados)

function compartilharCombo() {
  if (!autoCombo.value) return
  const combo = autoCombo.value
  let texto = `🍫 *Sugestão do Dia: ${combo.nome}* 🍫\n\n`
  texto += `*O que vem no kit:*\n`
  texto += `• 2x ${combo.itemPopular.nome}\n`
  texto += `• 1x ${combo.itemLucro.nome}\n\n`
  texto += `🚀 *Oferta Especial:*\n`
  combo.escala.forEach(p => {
    texto += `• ${p.qtd} kit${p.qtd > 1 ? 's' : ''}: *R$ ${R$(p.total)}* _(${R$(p.unitario)}/un)_\n`
  })
  texto += `\n_Peça agora clicando aqui!_`
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
}

const producoesFiltradas = computed(() => {
  const agora = new Date()
  return s.producoes.filter(p => {
    if (periodoAtivo.value === 'total') return true
    const dataProd = new Date(p.data_producao)
    const dias = periodoAtivo.value === '7dias' ? 7 : 30
    const limite = new Date().setDate(agora.getDate() - dias)
    return dataProd >= limite
  })
})

const stats = computed(() => {
  const filtradas = producoesFiltradas.value

  let totalQtd = 0, totalCusto = 0, totalVenda = 0
  const catMap = {}, recMap = {}, insumoMap = {}

  filtradas.forEach(p => {
    const r = s.receitas.find(rec => rec.uuid === p.receita_id)
    if (!r) return

    const qtd = p.quantidade_produzida || 0
    // Usa snapshot salvo no registro; fallback dinâmico para registros antigos
    const custoUnitario  = p.custo_unitario_snapshot != null
      ? p.custo_unitario_snapshot
      : (s.getCustoTotal(r) / (r.rendimento || 1))
    const custoTotalItem = custoUnitario * qtd
    const vendaTotalItem = (r.preco_sugerido || 0) * qtd

    if (!r.eh_intermediaria) {
      totalQtd += qtd
      totalCusto += custoTotalItem
      totalVenda += vendaTotalItem
      const cat = r.categoria || 'Outros'
      catMap[cat] = (catMap[cat] || 0) + qtd
    }

    if (!recMap[r.uuid]) recMap[r.uuid] = { nome: r.nome, qtd: 0, custoTotal: 0, vendaTotal: 0, unidade: r.unidade_rendimento }
    recMap[r.uuid].qtd += qtd
    recMap[r.uuid].custoTotal += custoTotalItem
    recMap[r.uuid].vendaTotal += vendaTotalItem

    const fatorBase = qtd / (r.rendimento || 1)
    s.expandirIngredientes(r.ingredientes || [], fatorBase, insumoMap)
  })

  const porCategoria = Object.entries(catMap).map(([nome, qtd]) => ({
    nome, qtd, percent: (qtd / (totalQtd || 1)) * 100
  })).sort((a,b) => b.qtd - a.qtd)

  const topReceitas = Object.values(recMap).map(item => ({
    ...item,
    lucroTotal: item.vendaTotal - item.custoTotal
  })).sort((a,b) => b.qtd - a.qtd).slice(0, 5)

  const consumoInsumos = Object.values(insumoMap).sort((a,b) => b.total - a.total).slice(0, 8)

  return { totalQtd, totalCusto, totalVenda, totalLucro: totalVenda - totalCusto, porCategoria, topReceitas, consumoInsumos }
})

/* ── Inteligência de Auto-Combo ── */
const popularidadeMap = computed(() => {
  const map = {}
  producoesFiltradas.value.forEach(p => { map[p.receita_id] = (map[p.receita_id] || 0) + 1 })
  return map
})

function arredondarPreco(v) {
  if (!v || v <= 0) return 0
  return Math.ceil(v * 2) / 2
}

const autoCombo = computed(() => {
  if (s.receitas.length < 2 || !producoesFiltradas.value.length) return null

  const itemPopular = [...s.receitas]
    .filter(r => !r.eh_intermediaria)
    .sort((a, b) => (popularidadeMap.value[b.uuid] || 0) - (popularidadeMap.value[a.uuid] || 0))[0]

  // 2. Encontrar o campeão de lucro que TAMBÉM tenha sido produzido no período
  const itemLucro = [...s.receitas]
    .filter(r => !r.eh_intermediaria && r.uuid !== itemPopular?.uuid && (popularidadeMap.value[r.uuid] || 0) > 0)
    .sort((a, b) => s.getLucroInfo(b).percentual - s.getLucroInfo(a).percentual)[0]

  if (!itemPopular || !itemLucro || (popularidadeMap.value[itemPopular.uuid] || 0) === 0) return null

  const custoPop = s.getCustoTotal(itemPopular) / (itemPopular.rendimento || 1)
  const custoLuc = s.getCustoTotal(itemLucro) / (itemLucro.rendimento || 1)
  const custoTotal = (custoPop * 2) + custoLuc
  
  const precoBase = arredondarPreco(custoTotal * 3)
  const lucroUnitario = precoBase - custoTotal
  const margem = (lucroUnitario / precoBase) * 100

  return {
    nome: `${itemPopular.nome.split(' ')[0]} & ${itemLucro.nome.split(' ')[0]}`,
    itemPopular, itemLucro, lucroUnitario, margem,
    escala: [
      { qtd: 1, total: precoBase, unitario: precoBase },
      { qtd: 2, total: arredondarPreco((precoBase * 2) * 0.92), unitario: (arredondarPreco((precoBase * 2) * 0.92) / 2) },
      { qtd: 3, total: arredondarPreco((precoBase * 3) * 0.88), unitario: (arredondarPreco((precoBase * 3) * 0.88) / 3) },
      { qtd: 5, total: arredondarPreco((precoBase * 5) * 0.84), unitario: (arredondarPreco((precoBase * 5) * 0.84) / 5) }
    ]
  }
})
</script>

<style scoped>
.tab-painel { display: flex; flex-direction: column; }

.painel-content { padding: 16px 16px 100px; }

/* ── KPI cards do painel (layout exclusivo desta tela) ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--surface);
  padding: 14px 12px;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}
.stat-card.highlight { background: var(--gold-bg); border-color: var(--gold); }
.stat-label {
  font-size: .65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
  letter-spacing: .5px;
}
.stat-val { font-size: 1.1rem; font-weight: 800; color: var(--brown); font-family: var(--mono); }
.stat-val small { font-size: .8rem; font-weight: 400; }

.flex-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
/* ── Ranking ── */
.row-rank { width: 28px; font-weight: 800; color: var(--gold); font-size: .8rem; flex-shrink: 0; }

/* ── Gráfico de barras ── */
.chart-row { margin-bottom: 12px; }
.chart-row:last-child { margin-bottom: 0; }
.chart-info { display: flex; justify-content: space-between; font-size: .85rem; margin-bottom: 5px; color: var(--text); }
.chart-info strong { font-family: var(--mono); }
.chart-bar-bg { height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.chart-bar-fill { height: 100%; border-radius: 4px; transition: width .5s ease-out; }

/* ── Lista de insumos consumidos ── */
.insumo-list { display: flex; flex-direction: column; gap: 8px; }
.insumo-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--bg);
  border-radius: var(--r-sm);
  border-left: 3px solid var(--gold);
}
.usage-name { font-size: .83rem; font-weight: 600; color: var(--brown); }
.usage-val { font-size: .85rem; font-family: var(--mono); font-weight: 700; color: var(--muted); }

.hint { font-size: .75rem; color: var(--muted); font-style: italic; }
.empty-mini { text-align: center; color: var(--muted); padding: 20px; font-size: .8rem; }

/* ── Auto Combo Styles ── */
.auto-combo-card { border: 2px solid var(--gold); background: linear-gradient(145deg, var(--gold-bg), var(--surface)); border-left-width: 5px; }
.auto-combo-title { font-size: 1.1rem; font-weight: 800; color: var(--brown-dark); margin-bottom: 4px; letter-spacing: -0.4px; }
.auto-combo-desc { font-size: 0.78rem; color: var(--muted); line-height: 1.4; margin-bottom: 12px; }
.auto-combo-desc strong { color: var(--brown-mid); }
.auto-combo-items { display: flex; flex-direction: column; gap: 4px; }
.ac-item { font-size: 0.85rem; font-weight: 700; color: var(--brown-dark); display: flex; align-items: center; gap: 8px; }
.ac-qtd { color: var(--gold-dark); background: #fff; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--gold-light); font-size: 0.75rem; font-family: var(--mono); }
.auto-combo-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border2); padding-top: 10px; font-size: 0.78rem; }
.auto-combo-footer strong { color: var(--green); font-size: 0.9rem; }

/* ── Price Ladder ── */
.price-ladder { background: var(--brown-dark); border-radius: var(--r-lg); padding: 12px; color: #fff; }
.ladder-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ladder-item { 
  display: flex; flex-direction: column; align-items: center; 
  background: rgba(255,255,255,0.1); padding: 8px 4px; border-radius: var(--r-md);
}
.l-qtd { font-size: 0.65rem; font-weight: 700; opacity: 0.8; }
.l-val { font-size: 0.9rem; font-weight: 800; color: var(--gold-light); margin: 2px 0; font-family: var(--mono); }
.l-unit { font-size: 0.55rem; opacity: 0.6; }

@media (max-width: 370px) {
  .ladder-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .ladder-item { padding: 10px 4px; }
}
</style>
