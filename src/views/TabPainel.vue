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

        <!-- Gráfico de Categorias -->
        <div class="section-label"><i class="fas fa-chart-bar"></i> Produção por Categoria</div>
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
        <div class="section-label"><i class="fas fa-trophy"></i> Ranking de Receitas</div>
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
        <div class="section-label"><i class="fas fa-blender"></i> Ingredientes Consumidos</div>
        <div class="sheet-card mb-16">
          <div class="sheet-body">
            <div v-if="!stats.consumoInsumos.length" class="empty-mini">Sem dados no período</div>
            <p v-else class="hint mb-10">Estimativa baseada nas receitas produzidas:</p>
            <div class="insumo-list">
              <div v-for="ins in stats.consumoInsumos" :key="ins.nome" class="insumo-row">
                <span class="usage-name">{{ ins.nome }}</span>
                <span class="usage-val">{{ fmtQ(ins.total, ins.unidade) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStore } from '../store.js'
import { R$, avatarColor, fmtQtd as fmtQ } from '../utils.js'

const s = useStore()
const periodoAtivo = ref('7dias')
const periodos = [
  { v: '7dias', l: '7 Dias' },
  { v: '30dias', l: '30 Dias' },
  { v: 'total', l: 'Tudo' }
]

const atualizarDados = () => {
  const dias = periodoAtivo.value === '7dias' ? 7 : periodoAtivo.value === '30dias' ? 30 : 0
  s.carregarProducoes(dias)
}

watch(periodoAtivo, atualizarDados)
onMounted(atualizarDados)

// Explode recursivamente todos os insumos de uma receita (e suas sub-receitas)
function explodirInsumos(receita, fatorAcumulado, mapa, visitados = new Set()) {
  if (!receita || visitados.has(receita.uuid)) return
  visitados.add(receita.uuid)

  const ingredientes = receita.ingredientes || []
  for (const ing of ingredientes) {
    const qtdEscalada = (ing.quantidade || 0) * fatorAcumulado

    if (ing.tipo === 'produto') {
      const prod = s.produtos.find(px => px.uuid === ing.id)
      if (!prod) continue
      if (!mapa[prod.uuid]) mapa[prod.uuid] = { nome: prod.nome, total: 0, unidade: prod.unidade_base }
      mapa[prod.uuid].total += qtdEscalada

    } else if (ing.tipo === 'receita') {
      // Expandir a sub-receita recursivamente
      const sub = s.receitas.find(rx => rx.uuid === ing.id)
      if (!sub || !sub.rendimento) continue
      const fatorSub = qtdEscalada / sub.rendimento
      explodirInsumos(sub, fatorSub, mapa, new Set(visitados))
    }
  }
}

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
    explodirInsumos(r, fatorBase, insumoMap)
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
.tab-painel { display: flex; flex-direction: column; }

.painel-content {
  padding: 16px 16px 100px;
}

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
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.stat-val { font-size: 1.1rem; font-weight: 800; color: var(--brown); font-family: var(--mono); }
.stat-val small { font-size: 0.8rem; font-weight: 400; }
.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--bg);
}
.list-row:last-child { border-bottom: none; }
.row-rank { width: 28px; font-weight: 800; color: var(--gold); font-size: 0.8rem; flex-shrink: 0; }
.row-info { flex: 1; min-width: 0; }
.row-name { font-size: 0.88rem; font-weight: 700; color: var(--brown); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-sub { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
.row-right { text-align: right; flex-shrink: 0; }
.row-val { font-size: 0.9rem; font-weight: 800; font-family: var(--mono); }

.chart-row { margin-bottom: 12px; }
.chart-row:last-child { margin-bottom: 0; }
.chart-info { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 5px; color: var(--text); }
.chart-info strong { font-family: var(--mono); }
.chart-bar-bg { height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.chart-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease-out; }

/* Insumos: lista vertical no lugar de grid-2 colunas */
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
.usage-name { font-size: 0.83rem; font-weight: 600; color: var(--brown); }
.usage-val { font-size: 0.85rem; font-family: var(--mono); font-weight: 700; color: var(--muted); }

.hint { font-size: 0.75rem; color: var(--muted); font-style: italic; }
.empty-mini { text-align: center; color: var(--muted); padding: 20px; font-size: 0.8rem; }
</style>
