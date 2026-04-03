<template>
  <div class="tab-painel">
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-chart-pie"></i> Painel de Negócio</h2>
      </div>
      <div class="chips">
        <button v-for="p in periodos" :key="p.v" 
                class="chip" :class="{ active: periodoAtivo === p.v }" 
                @click="periodoAtivo = p.v">
          {{ p.l }}
        </button>
      </div>
    </div>

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
          <span class="stat-val c-red">{{ R$(stats.totalCusto) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Faturamento</span>
          <span class="stat-val c-green">{{ R$(stats.totalVenda) }}</span>
        </div>
        <div class="stat-card highlight">
          <span class="stat-label">Resultado</span>
          <span class="stat-val">{{ R$(stats.totalLucro) }}</span>
        </div>
      </div>

      <!-- Gráfico de Categorias -->
      <div class="section-label">📊 Produção por Categoria</div>
      <div class="sheet-card mb-20">
        <div class="sheet-body p-16">
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

      <!-- Itens mais produzidos -->
      <div class="section-label">🏆 Ranking de Receitas</div>
      <div class="sheet-card mb-20">
        <div class="sheet-body p-0">
          <div v-for="(item, idx) in stats.topReceitas" :key="item.id" class="list-row">
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

      <!-- Previsão de Consumo de Insumos -->
      <div class="section-label">🥣 Insumos Consumidos</div>
      <div class="sheet-card">
        <div class="sheet-body p-16">
          <p class="hint mb-12">Estimativa baseada nas receitas produzidas:</p>
          <div class="insumo-usage-grid">
            <div v-for="ins in stats.consumoInsumos" :key="ins.id" class="insumo-usage-item">
              <span class="usage-name">{{ ins.nome }}</span>
              <span class="usage-val">{{ fmtQ(ins.total, ins.unidade) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar, avatarColor, fmtQtd as fmtQ } from '../utils.js'

const s = useStore()
const periodoAtivo = ref('7dias')
const periodos = [
  { v: '7dias', l: '7 Dias' },
  { v: '30dias', l: '30 Dias' },
  { v: 'total', l: 'Tudo' }
]

const stats = computed(() => {
  const agora = new Date()
  const filtradas = s.producoes.filter(p => {
    if (periodoAtivo.value === 'total') return true
    const dataProd = new Date(p.data_producao)
    const dias = periodoAtivo.value === '7dias' ? 7 : 30
    const limite = new Date().setDate(agora.getDate() - dias)
    return dataProd >= limite
  })

  let totalQtd = 0, totalCusto = 0, totalVenda = 0
  const catMap = {}, recMap = {}, insumoMap = {}

  filtradas.forEach(p => {
    const r = s.receitas.find(rec => rec.uuid === p.receita_id)
    if (!r) return

    const qtd = p.quantidade_produzida || 0
    const custoTotalItem = (s.getCustoTotal(r) / (r.rendimento || 1)) * qtd
    const vendaTotalItem = (r.preco_sugerido || 0) * qtd

    // Só somamos faturamento e lucro de produtos FINAIS (para não duplicar com bases)
    if (!r.eh_intermediaria) {
      totalQtd += qtd
      totalCusto += custoTotalItem
      totalVenda += vendaTotalItem

      const cat = r.categoria || 'Outros'
      catMap[cat] = (catMap[cat] || 0) + qtd
    }

    // Ranking (todas as produções)
    if (!recMap[r.uuid]) recMap[r.uuid] = { nome: r.nome, qtd: 0, custoTotal: 0, vendaTotal: 0, unidade: r.unidade_rendimento }
    recMap[r.uuid].qtd += qtd
    recMap[r.uuid].custoTotal += custoTotalItem
    recMap[r.uuid].vendaTotal += vendaTotalItem

    // Consumo de Insumos (Explosão de materiais)
    const fator = qtd / (r.rendimento || 1)
    r.ingredientes?.forEach(ing => {
      if (ing.tipo === 'produto') {
        const prod = s.produtos.find(px => px.uuid === ing.id)
        if (prod) {
          if (!insumoMap[prod.uuid]) insumoMap[prod.uuid] = { nome: prod.nome, total: 0, unidade: prod.unidade_base }
          insumoMap[prod.uuid].total += (ing.quantidade * fator)
        }
      }
    })
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
</script>

<style scoped>
.tab-painel { padding: 0 0 100px 0; }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
.stat-card { background: #fff; padding: 12px; border-radius: var(--r-md); border: 1px solid var(--border); display: flex; flex-direction: column; }
.stat-card.highlight { background: var(--gold-bg); border-color: var(--gold); }
.stat-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.5px; }
.stat-val { font-size: 1.1rem; font-weight: 800; color: var(--brown); font-family: var(--mono); }
.stat-val small { font-size: 0.8rem; font-weight: 400; }
.c-red { color: var(--orange); }
.c-green { color: var(--green); }

.sheet-card { background: #fff; border-radius: var(--r-lg); border: 1px solid var(--border); box-shadow: var(--shadow-sm); overflow: hidden; }
.sheet-body { padding: 16px; }
.section-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--gold-dark); letter-spacing: 1px; margin: 20px 0 10px 0; }

.p-16 { padding: 16px; }
.p-0 { padding: 0; }
.mb-12 { margin-bottom: 12px; }
.mb-20 { margin-bottom: 20px; }

.list-row { border-bottom: 1px solid var(--bg); padding: 12px; }
.list-row:last-child { border-bottom: none; }

.chart-row { margin-bottom: 12px; }
.chart-info { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; }
.chart-bar-bg { height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.chart-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease-out; }

.row-rank { width: 30px; font-weight: 800; color: var(--gold); font-size: 0.8rem; }
.insumo-usage-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.insumo-usage-item { display: flex; flex-direction: column; border-left: 2px solid var(--gold-bg); padding-left: 8px; }
.usage-name { font-size: 0.75rem; font-weight: 600; color: var(--brown); }
.usage-val { font-size: 0.85rem; font-family: var(--mono); font-weight: 700; color: var(--muted); }

.hint { font-size: 0.75rem; color: var(--muted); font-style: italic; }
.empty-mini { text-align: center; color: var(--muted); padding: 20px; font-size: 0.8rem; }
</style>