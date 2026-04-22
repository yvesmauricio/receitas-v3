<template>
  <div class="tab-financeiro">

    <!-- ── Cabeçalho ───────────────────────────────────── -->
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-money-check-dollar"></i> Financeiro</h2>
        <div class="hdr-actions">
          <button class="btn-icon" :class="{ active: modoSelecao }" @click="toggleSelecao" title="Selecionar lançamentos">
            <i class="fas" :class="modoSelecao ? 'fa-xmark' : 'fa-list-check'"></i>
          </button>
          <button v-if="abaAtiva === 'lancamentos' && s.financeiro.length" class="btn-icon btn-danger-soft" @click="handleLimparFinanceiro" title="Zerar todos os lançamentos">
            <i class="fas fa-trash-can"></i>
          </button>
          <button class="btn-icon" @click="mostrarImportadores = !mostrarImportadores" title="Importar extratos">
            <i class="fas fa-file-import"></i>
          </button>
        </div>
      </div>
      <p class="tab-subtitle">
        Consolidação PagBank + Itaú · PIX recebidos · Relatório MEI
      </p>

      <!-- ── Navegação de abas ────────────────────────── -->
      <div class="aba-nav">
        <button v-for="aba in abas" :key="aba.id" class="aba-btn"
          :class="{ active: abaAtiva === aba.id }" @click="abaAtiva = aba.id">
          <i :class="aba.icon"></i> {{ aba.label }}
        </button>
      </div>
    </div>

    <!-- ── Importadores (colapsáveis) ─────────────────── -->
    <div v-if="mostrarImportadores" class="importadores-wrap">
      <div class="banco-tabs">
        <button class="banco-tab" :class="{ active: bancoImport === 'pagbank' }" @click="bancoImport = 'pagbank'">
          <i class="fas fa-file-csv"></i> PagBank CSV
        </button>
        <button class="banco-tab" :class="{ active: bancoImport === 'itau' }" @click="bancoImport = 'itau'">
          <i class="fas fa-file-pdf"></i> Itaú PDF
        </button>
        <button class="banco-tab" :class="{ active: bancoImport === 'bb' }" @click="bancoImport = 'bb'">
          <i class="fas fa-file-csv"></i> BB CSV
        </button>
      </div>
      <ImportadorExtrato v-if="bancoImport === 'pagbank'" @editar-lancamento="abrirModalEdicao" />
      <ImportadorItau v-else-if="bancoImport === 'itau'" />
      <ImportadorBancoBrasil v-else />
    </div>

    <!-- ═══ ABA: LANÇAMENTOS ═══ -->
    <template v-if="abaAtiva === 'lancamentos'">
      <!-- ── Filtros ─────────────────────────────────── -->
      <div class="filtros-bar">

        <!-- ① Período -->
        <div class="fsec" v-if="mesesDisponiveis.length">
          <div class="fsec-header">
            <span class="fsec-lbl"><i class="fas fa-calendar-days"></i> Período</span>
            <button v-if="filtroMes" class="fsec-clear-link" @click="mostrarTodosPeriodos">
              Ver todos os períodos
            </button>
          </div>
          <div class="periodo-nav">
            <button class="pnav-btn" :disabled="!temMesMaisNovo" @click="irParaMesMaisNovo" title="Mês mais recente">
              <i class="fas fa-chevron-left"></i>
            </button>
            <div class="pnav-centro">
              <select class="pnav-select" v-model="filtroMes">
                <option value="">Todos os períodos</option>
                <option v-for="m in mesesDisponiveis" :key="m" :value="m">{{ m }}</option>
              </select>
              <div class="pnav-display">
                <strong>{{ filtroMes || 'Todos os períodos' }}</strong>
              </div>
              <i class="fas fa-caret-down pnav-caret"></i>
            </div>
            <button class="pnav-btn" :disabled="!temMesMaisAntigo" @click="irParaMesMaisAntigo" title="Mês mais antigo">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <div class="fsep"></div>

        <!-- ② Banco + Categoria -->
        <div class="fsec-row">
          <div class="fsec fsec-grow" style="padding:0">
            <span class="fsec-lbl"><i class="fas fa-university"></i> Banco</span>
            <div class="fchips">
              <button v-for="b in filtrosBanco" :key="b.id" class="fchip"
                :class="{ active: filtroBanco === b.id }" @click="filtroBanco = b.id">
                {{ b.label }}
              </button>
            </div>
          </div>
          <div class="fsec" style="padding:0; flex-shrink:0; min-width:0">
            <span class="fsec-lbl"><i class="fas fa-tag"></i> Categoria</span>
            <button class="fcat-trigger" :class="{ ativo: mostrarFiltroCategorias || filtroCategoria }"
              @click="mostrarFiltroCategorias = !mostrarFiltroCategorias">
              <i class="fas fa-layer-group" v-if="!filtroCategoria"></i>
              <i class="fas fa-check" v-else style="color:var(--brown)"></i>
              <span class="fcat-label">{{ filtroCategoria ? filtroCategoria.split(' ')[0] : 'Todas' }}</span>
              <i class="fas" :class="mostrarFiltroCategorias ? 'fa-xmark' : 'fa-chevron-down'"></i>
            </button>
          </div>
        </div>

        <!-- Painel de categorias -->
        <div v-if="mostrarFiltroCategorias" class="filtro-categoria-sheet">
          <button class="cat-btn cat-btn-todas" :class="{ selected: !filtroCategoria }" @click="selecionarCategoria('')">
            <i class="fas fa-layer-group"></i>
            <span>Todas as categorias</span>
            <i v-if="!filtroCategoria" class="fas fa-check check-icon"></i>
          </button>
          <div v-for="grupo in gruposCategoriasFiltro" :key="grupo.nome" class="grupo">
            <div class="grupo-titulo">
              <span class="grupo-natureza" :class="'nat-' + grupo.natureza">{{ labelNatureza(grupo.natureza) }}</span>
              {{ grupo.nome }}
            </div>
            <div class="categoria-grid">
              <button v-for="cat in grupo.categorias" :key="cat.nome"
                class="cat-btn" :class="{ selected: filtroCategoria === cat.nome }"
                @click="selecionarCategoria(cat.nome)">
                <i class="fas" :class="cat.icon"></i>
                <span>{{ cat.nome }}</span>
                <i v-if="filtroCategoria === cat.nome" class="fas fa-check check-icon"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="fsep"></div>

        <!-- ③ Busca -->
        <div class="fsec">
          <span class="fsec-lbl"><i class="fas fa-magnifying-glass"></i> Busca</span>
          <div class="fbusca-row">
            <div class="fbusca-wrap">
              <i class="fas fa-magnifying-glass fbusca-icon"></i>
              <input v-model.trim="buscaDescricao" class="fbusca-input" type="search"
                placeholder="Descrição, nome, valor..." />
            </div>
            <button v-if="buscaDescricao" class="fchip scope-chip"
              :class="{ active: buscaNoExtratoInteiro }" @click="buscaNoExtratoInteiro = !buscaNoExtratoInteiro">
              {{ buscaNoExtratoInteiro ? 'Tudo' : 'Filtros' }}
            </button>
          </div>
        </div>

        <!-- Status de filtros ativos -->
        <div v-if="filtroBanco || filtroCategoria || buscaDescricao" class="filtro-status">
          <span class="filtro-count">{{ lancamentosFiltrados.length }} lançamento(s) encontrado(s)</span>
          <button class="btn-limpar" @click="limparFiltros">
            <i class="fas fa-xmark"></i> Limpar
          </button>
        </div>

      </div>

      <!-- Resumo do filtro -->
      <div class="resumo-filtro" v-if="lancamentosFiltrados.length">
        <div class="resumo-card">
          <span class="rl">Entradas</span>
          <strong class="c-green">{{ R$(totalEntradas) }}</strong>
        </div>
        <div class="resumo-card">
          <span class="rl">Saídas</span>
          <strong class="c-red">{{ R$(totalSaidas) }}</strong>
        </div>
        <div class="resumo-card">
          <span class="rl">Saldo</span>
          <strong :class="saldoFiltrado >= 0 ? 'c-green' : 'c-red'">{{ R$(saldoFiltrado) }}</strong>
        </div>
      </div>

      <!-- Barra de seleção em lote -->
      <div v-if="modoSelecao" class="selecao-bar">
        <button class="sel-all-btn" @click="toggleSelecionarTodos">
          <i class="fas" :class="todosSelecionados ? 'fa-square-check' : 'fa-square'"></i>
          {{ todosSelecionados ? 'Desmarcar todos' : `Selecionar todos (${lancamentosFiltrados.length})` }}
        </button>
        <span v-if="selecionados.size" class="sel-count">{{ selecionados.size }} selecionados</span>
      </div>

      <!-- Aviso de transferências internas -->
      <div v-if="transInternasCount && !filtroCategoria" class="aviso-interna" @click="selecionarCategoria('Transferência Interna')">
        <i class="fas fa-arrow-right-arrow-left"></i>
        <div class="aviso-body">
          <strong>{{ transInternasCount }} transferência(s) interna(s) detectada(s)</strong>
          <span>Itaú ↔ PagBank — excluídas da receita MEI. Toque para ver.</span>
        </div>
        <i class="fas fa-chevron-right aviso-arrow"></i>
      </div>

      <!-- Vazio -->
      <div v-if="!lancamentosFiltrados.length" class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>Nenhum lançamento encontrado.</p>
        <button class="btn-abrir-import" @click="mostrarImportadores = true">
          <i class="fas fa-file-import"></i> Importar extrato
        </button>
      </div>

      <!-- Lista -->
      <div v-else class="lancamentos-list">
        <div v-for="item in lancamentosFiltrados" :key="item.id"
          class="lancamento-row"
          :class="{ 'row-interna': item.natureza === 'interna', 'row-selected': selecionados.has(item.id) }"
          @click="modoSelecao ? toggleItem(item.id) : abrirModalEdicao(item)">
          <!-- Checkbox modo seleção -->
          <div v-if="modoSelecao" class="row-check">
            <i class="fas" :class="selecionados.has(item.id) ? 'fa-square-check' : 'fa-square'"></i>
          </div>
          <!-- Badge banco -->
          <div v-else class="row-banco-badge" :class="item.banco === 'itau' ? 'itau' : (item.banco === 'bb' ? 'bb' : 'pagbank')">
            {{ item.banco === 'itau' ? 'IT' : (item.banco === 'bb' ? 'BB' : 'PB') }}
          </div>
          <div class="row-left">
            <div class="row-title">{{ item.descricao }}</div>
            <div class="row-subtitle">
              {{ formatarData(item.data) }}
              <span class="badge">{{ item.categoria }}</span>
              <span v-if="item.conta_nome">· {{ item.conta_nome }}</span>
              · {{ item.tipo }}
            </div>
          </div>
          <div class="row-right" :class="item.valor >= 0 ? 'green' : 'red'">
            {{ R$(Math.abs(item.valor)) }}
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ ABA: MENSAL ═══ -->
    <template v-else-if="abaAtiva === 'mensal'">
      <div class="relatorio-wrap">
        <!-- Resumo por banco -->
        <section class="sheet-card">
          <div class="sheet-body">
            <div class="section-head">
              <h4><i class="fas fa-university"></i> Por banco</h4>
              <select class="filtro-select sm" v-model="anoFiltroMensal">
                <option v-for="a in anosDisponiveis" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
            <div class="banco-resumo-grid">
              <div class="banco-resumo-card pagbank">
                <div class="banco-nome"><i class="fas fa-mobile-alt"></i> PagBank</div>
                <div class="banco-linha"><span>Receitas PIX</span><strong class="c-green">{{ R$(resumoBancoPagbank.receitas) }}</strong></div>
                <div class="banco-linha"><span>Saídas</span><strong class="c-red">{{ R$(resumoBancoPagbank.saidas) }}</strong></div>
                <div class="banco-linha total"><span>Saldo</span><strong :class="resumoBancoPagbank.saldo >= 0 ? 'c-green' : 'c-red'">{{ R$(resumoBancoPagbank.saldo) }}</strong></div>
              </div>
              <div class="banco-resumo-card itau">
                <div class="banco-nome"><i class="fas fa-landmark"></i> Itaú</div>
                <div class="banco-linha"><span>Receitas PIX</span><strong class="c-green">{{ R$(resumoBancoItau.receitas) }}</strong></div>
                <div class="banco-linha"><span>Saídas</span><strong class="c-red">{{ R$(resumoBancoItau.saidas) }}</strong></div>
                <div class="banco-linha total"><span>Saldo</span><strong :class="resumoBancoItau.saldo >= 0 ? 'c-green' : 'c-red'">{{ R$(resumoBancoItau.saldo) }}</strong></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Cards mensais -->
        <section class="sheet-card" v-if="relatorioMensalFiltrado.length">
          <div class="sheet-body">
            <div class="section-head">
              <h4><i class="fas fa-calendar-days"></i> Mês a mês · {{ anoFiltroMensal }}</h4>
              <span class="badge badge-muted">{{ relatorioMensalFiltrado.length }} meses</span>
            </div>
            <div class="mei-grid">
              <article v-for="item in relatorioMensalFiltrado" :key="item.mes_ref" class="mei-card">
                <div class="mei-head">
                  <h4>{{ item.mes_ref }}</h4>
                  <span class="badge badge-muted">{{ item.quantidade }}</span>
                </div>
                <div class="mei-line"><span>Receita MEI (Vendas)</span><strong class="c-green">{{ R$(item.receitas_mei) }}</strong></div>
                <div class="mei-line renda-pessoal" v-if="item.outras_entradas_nao_mei">
                  <span><i class="fas fa-hand-holding-heart" style="font-size:.7rem;color:#7c3aed"></i> Outras entradas (não-MEI)</span>
                  <strong class="c-purple">{{ R$(item.outras_entradas_nao_mei) }}</strong>
                </div>
                <div class="mei-line"><span>Rendimento</span><strong>{{ R$(item.rendimento_financeiro) }}</strong></div>
                <div class="mei-line">
                  <span>Entrada Bruta (Banco)</span>
                  <strong class="c-blue">{{ R$(item.entradas) }}</strong>
                </div>
                <div class="mei-line"><span>Despesas operacionais</span><strong class="c-red">{{ R$(item.saidas_operacionais) }}</strong></div>
                <div class="mei-line">
                  <span>Saldo do negócio</span>
                  <strong :class="item.saldo_operacional >= 0 ? 'c-green' : 'c-red'">{{ R$(item.saldo_operacional) }}</strong>
                </div>
                <div class="mei-line"><span>Retiradas pessoais</span><strong class="c-red">{{ R$(item.saidas_pessoais) }}</strong></div>
                <div class="mei-line total">
                  <span>Sobrou no mês</span>
                  <strong :class="item.saldo_mes >= 0 ? 'c-green' : 'c-red'">{{ R$(item.saldo_mes) }}</strong>
                </div>
              </article>
            </div>
          </div>
        </section>

        <!-- Categorias no ano -->
        <section class="sheet-card">
          <div class="sheet-body">
            <div class="section-head">
              <h4><i class="fas fa-tags"></i> Por categoria · {{ anoFiltroMensal }}</h4>
              <span class="badge badge-gold">{{ categoriasPorAno.length }}</span>
            </div>
            <div v-if="!categoriasPorAno.length" class="empty-mini">Sem dados para o período.</div>
            <div v-else class="report-list">
              <div v-for="item in categoriasPorAno" :key="item.categoria" class="report-row">
                <div>
                  <div class="report-month">{{ item.categoria }}</div>
                  <div class="report-sub">{{ item.quantidade }} lançamento(s) · {{ item.natureza }}</div>
                </div>
                <strong class="report-value" :class="item.natureza === 'entrada' ? 'c-green' : 'c-red'">{{ R$(item.total) }}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- ═══ ABA: ANUAL ═══ -->
    <template v-else-if="abaAtiva === 'anual'">
      <div class="relatorio-wrap">
        <!-- Seletor de ano -->
        <div class="ano-selector-inline">
          <button v-for="a in anosDisponiveis" :key="a" class="ano-btn"
            :class="{ active: anoRelAnual === a }" @click="anoRelAnual = a">{{ a }}</button>
        </div>

        <!-- Totais -->
        <section class="sheet-card">
          <div class="sheet-body">
            <div class="section-head"><h4><i class="fas fa-chart-bar"></i> Resumo {{ anoRelAnual }}</h4></div>
            <div class="anual-totais">
              <div class="anual-item">
                <div class="anual-label">Receita Total MEI</div>
                <div class="anual-valor c-green">{{ R$(totalAnual.receitas) }}</div>
                <div class="anual-sub">PIX de clientes (excl. renda pessoal)</div>
              </div>
              <div class="anual-item" v-if="totalAnual.outras_entradas" style="border-color:#ddd6fe; background:#faf5ff;">
                <div class="anual-label" style="color:#6d28d9">Entradas Não-MEI</div>
                <div class="anual-valor c-purple">{{ R$(totalAnual.outras_entradas) }}</div>
                <div class="anual-sub">Renda pessoal, rendimentos (não conta no faturamento MEI)</div>
              </div>
              <div class="anual-item">
                <div class="anual-label">Despesas Operacionais</div>
                <div class="anual-valor c-red">{{ R$(totalAnual.operacional) }}</div>
                <div class="anual-sub">Insumos, mercado, serviços</div>
              </div>
              <div class="anual-item">
                <div class="anual-label">Saídas Pessoais</div>
                <div class="anual-valor">{{ R$(totalAnual.pessoal) }}</div>
                <div class="anual-sub">Moradia, transferências</div>
              </div>
              <div class="anual-item destaque" :class="totalAnual.saldo >= 0 ? 'positivo' : 'negativo'">
                <div class="anual-label">Saldo Operacional</div>
                <div class="anual-valor" :class="totalAnual.saldo >= 0 ? 'c-green' : 'c-red'">{{ R$(totalAnual.saldo) }}</div>
                <div class="anual-sub">Receita MEI − despesas operacionais</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Gráfico barras CSS -->
        <section class="sheet-card" v-if="relatorioAnualMeses.length">
          <div class="sheet-body">
            <div class="section-head"><h4><i class="fas fa-chart-simple"></i> Evolução mensal</h4></div>
            <div class="grafico-barras">
              <div v-for="item in relatorioAnualMeses" :key="item.mes_ref" class="barra-grupo">
                <div class="barra-labels">
                  <div class="barra entrada" :style="{ height: barraAltura(item.receitas_mei) + 'px' }" :title="'Receita: ' + R$(item.receitas_mei)"></div>
                  <div class="barra saida" :style="{ height: barraAltura(item.saidas_operacionais) + 'px' }" :title="'Saída: ' + R$(item.saidas_operacionais)"></div>
                </div>
                <div class="barra-mes">{{ item.mes_ref.split('/')[0] }}/{{ item.mes_ref.split('/')[1].slice(2) }}</div>
              </div>
            </div>
            <div class="grafico-legenda">
              <span class="leg-entrada"><i class="fas fa-square"></i> Receita MEI</span>
              <span class="leg-saida"><i class="fas fa-square"></i> Saída operacional</span>
            </div>
          </div>
        </section>

        <!-- Tabela mensal -->
        <section class="sheet-card" v-if="relatorioAnualMeses.length">
          <div class="sheet-body">
            <div class="section-head"><h4><i class="fas fa-table"></i> Detalhamento mensal</h4></div>
            <div class="tabela-anual">
              <div class="ta-hdr">
                <span>Mês</span><span>Receita</span><span>Saída op.</span><span>Saldo</span>
              </div>
              <div v-for="item in relatorioAnualMeses" :key="item.mes_ref" class="ta-row">
                <span class="ta-mes">{{ item.mes_ref }}</span>
                <span class="c-green">{{ R$(item.receitas_mei) }}</span>
                <span class="c-red">{{ R$(item.saidas_operacionais) }}</span>
                <span :class="item.saldo_operacional >= 0 ? 'c-green' : 'c-red'">{{ R$(item.saldo_operacional) }}</span>
              </div>
            </div>
          </div>
        </section>

        <div v-if="!relatorioAnualMeses.length" class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <p>Sem dados para {{ anoRelAnual }}.</p>
          <button class="btn-abrir-import" @click="mostrarImportadores = true; abaAtiva = 'lancamentos'">
            <i class="fas fa-file-import"></i> Importar extrato
          </button>
        </div>
      </div>
    </template>

    <!-- ── Barra flutuante de ações em lote ── -->
    <Transition name="barra-lote">
      <div v-if="modoSelecao && selecionados.size" class="barra-lote">
        <div class="barra-lote-info">
          <strong>{{ selecionados.size }}</strong>
          <span>selecionado{{ selecionados.size > 1 ? 's' : '' }}</span>
        </div>
        <button class="barra-btn cancel" @click="limparSelecao">
          <i class="fas fa-xmark"></i> Limpar
        </button>
        <button class="barra-btn primary" @click="abrirModalLote">
          <i class="fas fa-tag"></i> Categorizar
        </button>
      </div>
    </Transition>

    <!-- ── Modal edição unitária ── -->
    <EditarCategoriaModal
      v-if="lancamentoEmEdicao"
      :lancamento="lancamentoEmEdicao"
      @close="lancamentoEmEdicao = null"
      @salvo="lancamentoEmEdicao = null"
    />

    <!-- ── Modal edição em lote ── -->
    <EditarCategoriaModal
      v-if="modalLoteAberto"
      :ids="[...selecionados]"
      @close="modalLoteAberto = false"
      @salvo="onLoteSalvo"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ImportadorExtrato from '../components/ImportadorExtrato.vue'
import ImportadorItau from '../components/ImportadorItau.vue'
import ImportadorBancoBrasil from '../components/ImportadorBancoBrasil.vue'
import EditarCategoriaModal from '../components/EditarCategoriaModal.vue'
import { useStore } from '../store.js'
import { R$ } from '../utils.js'
import { useConfirm } from '../composables/useConfirm.js'

const s = useStore()
const confirm = useConfirm()
const lancamentoEmEdicao = ref(null)
const mostrarImportadores = ref(false)
const bancoImport = ref('pagbank')

const abas = [
  { id: 'lancamentos', label: 'Lançamentos', icon: 'fas fa-list' },
  { id: 'mensal',      label: 'Mensal',       icon: 'fas fa-calendar' },
  { id: 'anual',       label: 'Anual',         icon: 'fas fa-chart-bar' }
]
const abaAtiva = ref('lancamentos')

// ── Filtros ──
const filtroBanco     = ref('')
const filtroMes       = ref('')
const filtroCategoria = ref('')
const mostrarFiltroCategorias = ref(false)
const buscaDescricao = ref('')
const buscaNoExtratoInteiro = ref(false)

const filtrosBanco = [
  { id: '',        label: 'Todos' },
  { id: 'pagbank', label: 'PagBank' },
  { id: 'itau',    label: 'Itaú' },
  { id: 'bb',      label: 'BB' }
]

function limparFiltros() {
  filtroBanco.value = filtroCategoria.value = ''
  buscaDescricao.value = ''
  buscaNoExtratoInteiro.value = false
  mostrarFiltroCategorias.value = false
}

const mesNavegacaoInicializada = ref(false)

const lancamentosBaseFiltrados = computed(() =>
  s.financeiro.filter(item => {
    if (filtroBanco.value && (item.banco || 'pagbank') !== filtroBanco.value) return false
    if (filtroMes.value && (item.mes_ref || '') !== filtroMes.value) return false
    if (filtroCategoria.value && item.categoria !== filtroCategoria.value) return false
    return true
  })
)

const lancamentosFiltrados = computed(() => {
  const buscaNormalizada = normalizarTexto(buscaDescricao.value)
  const base = buscaNoExtratoInteiro.value && buscaNormalizada
    ? s.financeiro
    : lancamentosBaseFiltrados.value

  if (!buscaNormalizada) return base

  return base.filter(item => normalizarTexto(item.descricao).includes(buscaNormalizada))
})

const transInternasCount = computed(() =>
  s.financeiro.filter(i => i.natureza === 'interna').length
)

const totalEntradas  = computed(() =>
  lancamentosFiltrados.value
    .filter(i => i.valor > 0 && i.natureza !== 'interna')
    .reduce((a, i) => a + i.valor, 0)
)

const totalSaidas    = computed(() =>
  lancamentosFiltrados.value
    .filter(i => i.valor < 0 && i.natureza !== 'interna')
    .reduce((a, i) => a + Math.abs(i.valor), 0)
)

const saldoFiltrado  = computed(() =>
  lancamentosFiltrados.value
    .filter(i => i.natureza !== 'interna')
    .reduce((a, i) => a + i.valor, 0)
)

const mesesDisponiveis = computed(() => {
  const set = new Set(s.financeiro.map(i => i.mes_ref).filter(Boolean))
  return [...set].sort((a, b) => {
    const [ma, aa] = a.split('/'), [mb, ab] = b.split('/')
    return `${ab}${mb}`.localeCompare(`${aa}${ma}`)
  })
})

const indiceMesAtual = computed(() => mesesDisponiveis.value.indexOf(filtroMes.value))
const temMesMaisNovo = computed(() => indiceMesAtual.value > 0)
const temMesMaisAntigo = computed(() =>
  indiceMesAtual.value >= 0 && indiceMesAtual.value < (mesesDisponiveis.value.length - 1)
)

watch(mesesDisponiveis, (meses) => {
  if (!meses.length) return
  if (!mesNavegacaoInicializada.value) {
    filtroMes.value = meses[0]
    mesNavegacaoInicializada.value = true
    return
  }
  if (filtroMes.value && !meses.includes(filtroMes.value)) {
    filtroMes.value = meses[0]
  }
}, { immediate: true })

function irParaMesMaisNovo() {
  if (!temMesMaisNovo.value) return
  filtroMes.value = mesesDisponiveis.value[indiceMesAtual.value - 1]
}

function irParaMesMaisAntigo() {
  if (!temMesMaisAntigo.value) return
  filtroMes.value = mesesDisponiveis.value[indiceMesAtual.value + 1]
}

function mostrarTodosPeriodos() {
  filtroMes.value = ''
}

const gruposCategoriasFiltro = computed(() => {
  const map = new Map()
  for (const cat of s.CATEGORIAS_MEI) {
    if (!map.has(cat.grupo)) map.set(cat.grupo, { nome: cat.grupo, natureza: cat.natureza, categorias: [] })
    map.get(cat.grupo).categorias.push(cat)
  }
  return [...map.values()]
})

const anosDisponiveis = computed(() => {
  const set = new Set(s.financeiro.map(i => (i.data || '').slice(0, 4)).filter(Boolean))
  return [...set].sort((a, b) => b.localeCompare(a))
})

// ── Mensal ──
const anoFiltroMensal = ref(String(new Date().getFullYear()))

const relatorioMensalFiltrado = computed(() =>
  s.relatorioMensalMei.filter(item => item.mes_ref.endsWith(`/${anoFiltroMensal.value}`))
)

function resumoBancoPorAno(banco, ano) {
  const items = s.financeiro.filter(i => (i.banco || 'pagbank') === banco && (i.data || '').startsWith(ano))
  const receitas = items.filter(i => i.valor > 0 && i.natureza === 'entrada').reduce((a, i) => a + i.valor, 0)
  const saidas   = items.filter(i => i.valor < 0).reduce((a, i) => a + Math.abs(i.valor), 0)
  return { receitas, saidas, saldo: receitas - saidas }
}

const resumoBancoPagbank = computed(() => resumoBancoPorAno('pagbank', anoFiltroMensal.value))
const resumoBancoItau    = computed(() => resumoBancoPorAno('itau',    anoFiltroMensal.value))

const categoriasPorAno = computed(() => {
  const map = new Map()
  s.financeiro
    .filter(i => (i.data || '').startsWith(anoFiltroMensal.value))
    .forEach(i => {
      const chave = i.categoria || 'Sem categoria'
      if (!map.has(chave)) map.set(chave, { categoria: chave, total: 0, quantidade: 0, natureza: i.natureza || '' })
      const a = map.get(chave)
      a.total += Math.abs(i.valor)
      a.quantidade += 1
    })
  return [...map.values()].sort((a, b) => b.total - a.total)
})

// ── Anual ──
const anoRelAnual = ref(String(new Date().getFullYear()))

const relatorioAnualMeses = computed(() =>
  s.relatorioMensalMei
    .filter(i => i.mes_ref.endsWith(`/${anoRelAnual.value}`))
    .sort((a, b) => Number(a.mes_ref.split('/')[0]) - Number(b.mes_ref.split('/')[0]))
)

const totalAnual = computed(() => {
  const m = relatorioAnualMeses.value
  return {
    receitas:       m.reduce((a, i) => a + i.receitas_mei, 0),
    outras_entradas: m.reduce((a, i) => a + (i.outras_entradas_nao_mei || 0), 0),
    operacional:    m.reduce((a, i) => a + i.saidas_operacionais, 0),
    pessoal:        m.reduce((a, i) => a + i.saidas_pessoais, 0),
    saldo:          m.reduce((a, i) => a + i.saldo_operacional, 0)
  }
})

const maxBarraValor = computed(() =>
  Math.max(1, ...relatorioAnualMeses.value.flatMap(i => [i.receitas_mei, i.saidas_operacionais]))
)

function barraAltura(valor) {
  return Math.max(2, Math.round((valor / maxBarraValor.value) * 60))
}

function labelNatureza(n) {
  return { entrada: '↑ Receita', operacional: '↓ Operacional', pessoal: '↓ Pessoal', interna: '⇄ Interna' }[n] || n
}

function selecionarCategoria(categoria) {
  filtroCategoria.value = categoria
  mostrarFiltroCategorias.value = false
}

// ── Multi-seleção ──
const modoSelecao    = ref(false)
const selecionados   = ref(new Set())
const modalLoteAberto = ref(false)

function toggleSelecao() {
  modoSelecao.value = !modoSelecao.value
  if (!modoSelecao.value) selecionados.value = new Set()
}

function toggleItem(id) {
  const novo = new Set(selecionados.value)
  novo.has(id) ? novo.delete(id) : novo.add(id)
  selecionados.value = novo
}

const todosSelecionados = computed(() =>
  lancamentosFiltrados.value.length > 0 &&
  lancamentosFiltrados.value.every(i => selecionados.value.has(i.id))
)

function toggleSelecionarTodos() {
  if (todosSelecionados.value) {
    selecionados.value = new Set()
  } else {
    selecionados.value = new Set(lancamentosFiltrados.value.map(i => i.id))
  }
}

function limparSelecao() { selecionados.value = new Set() }

function abrirModalLote() { modalLoteAberto.value = true }

function onLoteSalvo() {
  modalLoteAberto.value = false
  selecionados.value = new Set()
  modoSelecao.value = false
}

async function handleLimparFinanceiro() {
  const ok = await confirm.ask(
    'Isso irá apagar permanentemente todos os lançamentos de todos os bancos. Deseja continuar?',
    { title: 'Zerar Extratos', icon: 'fas fa-trash-can', confirmLabel: 'Apagar tudo', type: 'danger' }
  )
  if (ok) await s.limparFinanceiro()
}

// ── Helpers ──
function formatarData(dataIso) {
  if (!dataIso) return ''
  const [ano, mes, dia] = dataIso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataIso
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function abrirModalEdicao(lancamento) { lancamentoEmEdicao.value = lancamento }

onMounted(() => s.carregarFinanceiro())
</script>

<style scoped>
.tab-financeiro { display: flex; flex-direction: column; width: 100%; }

/* ── Cabeçalho ─── */
.tab-hdr { 
  padding: 14px 16px 0; background: var(--surface); border-bottom: 1px solid var(--border); 
  flex-shrink: 0; 
  position: sticky; top: 0; z-index: 100;
}
.tab-hdr-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.tab-title { font-size: 1.2rem; font-weight: 700; color: var(--text); margin: 0; display: flex; align-items: center; gap: 8px; }
.hdr-actions { display: flex; gap: 6px; }
.btn-icon { width: 36px; height: 36px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--cream); color: var(--brown-mid); display: flex; align-items: center; justify-content: center; font-size: .9rem; transition: background var(--t), color var(--t); }
.btn-icon:active, .btn-icon.active { background: var(--brown); color: #fff; border-color: var(--brown); }
.btn-danger-soft { color: var(--red) !important; border-color: var(--red-dim) !important; background: var(--red-bg) !important; }
.tab-subtitle { font-size: .78rem; color: var(--muted); margin-bottom: 12px; }
.aba-nav { display: flex; margin: 0 -16px; border-top: 1px solid var(--border); overflow-x: auto; }
.aba-btn { flex: 1; padding: 10px 6px; border: none; background: transparent; color: var(--muted); font-size: .78rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; border-bottom: 2px solid transparent; transition: color var(--t), border-color var(--t); }
.aba-btn.active { color: var(--brown); border-bottom-color: var(--brown); background: var(--gold-bg); }

/* ── Importadores ─── */
.importadores-wrap { background: var(--bg); border-bottom: 1px solid var(--border); flex-shrink: 0; overflow-y: auto; max-height: 60vh; }
.banco-tabs { display: flex; padding: 10px 16px 0; gap: 8px; }
.banco-tab { flex: 1; padding: 8px; border: 1px solid var(--border); border-radius: var(--r-md) var(--r-md) 0 0; background: var(--bg); color: var(--muted); font-size: .8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all var(--t); border-bottom: none; }
.banco-tab.active { background: var(--surface); color: var(--brown); }

/* ── Filtros redesenhados ─────────────────────────────────── */
.filtros-bar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

/* Separador horizontal entre seções */
.fsep {
  height: 1px;
  background: var(--border);
  margin: 0 16px;
}

/* Seção genérica */
.fsec {
  padding: 9px 16px 7px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.fsec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fsec-lbl {
  font-size: .62rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .55px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.fsec-lbl i { font-size: .6rem; }

.fsec-clear-link {
  font-size: .72rem;
  color: var(--brown-mid);
  font-weight: 700;
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Linha dupla Banco + Categoria */
.fsec-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 9px 16px 7px;
}

.fsec-grow { flex: 1; min-width: 0; }

/* ── Período nav ─────────── */
.periodo-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pnav-btn {
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .8rem;
  flex-shrink: 0;
  transition: all var(--t);
}
.pnav-btn:disabled { opacity: .3; }
.pnav-btn:not(:disabled):active { background: var(--cream-deep); }

.pnav-centro {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 30px 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--cream);
  cursor: pointer;
  min-height: 38px;
}

.pnav-select {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  font-size: 1rem; /* evita zoom no iOS */
}

.pnav-display { text-align: center; }
.pnav-display strong {
  font-size: .86rem;
  color: var(--brown-dark);
  pointer-events: none;
}

.pnav-caret {
  position: absolute;
  right: 10px;
  color: var(--muted);
  font-size: .72rem;
  pointer-events: none;
}

/* ── Chips de banco ─────── */
.fchips { display: flex; gap: 5px; flex-wrap: wrap; }

.fchip {
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: var(--bg);
  color: var(--muted);
  font-size: .74rem;
  font-weight: 700;
  white-space: nowrap;
  transition: all var(--t);
  min-height: 30px;
}
.fchip.active {
  background: var(--brown);
  color: #fff;
  border-color: var(--brown);
  box-shadow: 0 2px 6px rgba(61,31,7,.18);
}

/* ── Trigger categoria ─── */
.fcat-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
  color: var(--muted);
  font-size: .76rem;
  font-weight: 600;
  transition: all var(--t);
  white-space: nowrap;
  min-height: 30px;
}
.fcat-label {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .76rem;
}
.fcat-trigger i { font-size: .7rem; }
.fcat-trigger.ativo {
  border-color: var(--brown);
  background: var(--gold-bg);
  color: var(--brown-dark);
}

/* ── Busca ─────────────── */
.fbusca-row { display: flex; align-items: center; gap: 8px; }

.fbusca-wrap { position: relative; flex: 1; }

.fbusca-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: .78rem;
  pointer-events: none;
}

.fbusca-input {
  width: 100%;
  padding: 8px 12px 8px 30px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
  color: var(--text);
  font-size: .84rem;
  transition: border-color var(--t);
}
.fbusca-input:focus {
  outline: none;
  border-color: var(--brown-mid);
  background: var(--surface);
}

.scope-chip { font-size: .72rem; padding: 5px 9px; min-height: 30px; }

/* ── Status de filtros ativos ─── */
.filtro-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--cream);
  border-top: 1px solid var(--border);
}
.filtro-count { font-size: .76rem; color: var(--muted); font-weight: 600; }
.btn-limpar {
  padding: 5px 10px;
  border: 1px solid var(--red);
  border-radius: var(--r-full);
  background: var(--red-bg);
  color: var(--red);
  font-size: .74rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Filtro categoria sheet (dropdown) */
.filtro-categoria-sheet { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--cream); display: flex; flex-direction: column; gap: 10px; }
.grupo { margin-bottom: 4px; }
.grupo-titulo { font-size: .72rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.grupo-natureza { padding: 2px 7px; border-radius: var(--r-full); font-size: .65rem; font-weight: 800; }
.nat-entrada { background: var(--green-bg); color: var(--green); }
.nat-operacional { background: var(--red-bg); color: var(--red); }
.nat-pessoal { background: #fef3c7; color: #92400e; }
.filtro-select { padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--bg); color: var(--text); font-size: .82rem; appearance: none; }
.filtro-select.sm { width: auto; min-width: 80px; }
.nat-interna { background: var(--blue-bg); color: var(--blue); }
.categoria-grid { display: flex; flex-direction: column; gap: 6px; }
.cat-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: var(--r-md); background: var(--bg); color: var(--text); text-align: left; transition: all var(--t); }
.cat-btn i:first-child { width: 20px; text-align: center; color: var(--muted); font-size: .85rem; flex-shrink: 0; }
.cat-btn span { flex: 1; font-size: .85rem; font-weight: 500; }
.cat-btn.selected { border-color: var(--brown); background: var(--gold-bg); color: var(--brown-dark); }
.cat-btn.selected i:first-child { color: var(--gold-dark); }
.cat-btn-todas { background: var(--surface); }
.check-icon { color: var(--brown) !important; font-size: .75rem !important; width: auto !important; }
.cat-btn:active { transform: scale(.98); }

/* ── Resumo ─── */
.resumo-filtro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
.resumo-card { padding: 8px 10px; border-radius: var(--r-md); border: 1px solid var(--border); background: var(--bg); }
.rl { display: block; font-size: .65rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 3px; }
.resumo-card strong { font-family: var(--mono); font-size: .85rem; }

/* ── Aviso transferência interna ─── */
.aviso-interna { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #fffbeb; border-bottom: 1px solid #fde68a; cursor: pointer; flex-shrink: 0; }
.aviso-interna > i:first-child { color: #b45309; font-size: 1rem; flex-shrink: 0; }
.aviso-body { flex: 1; min-width: 0; }
.aviso-body strong { display: block; font-size: .8rem; color: #92400e; font-weight: 700; }
.aviso-body span { font-size: .73rem; color: #a16207; }
.aviso-arrow { color: #d97706; font-size: .75rem; }

/* ── Barra de seleção em lote ─── */
.selecao-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: var(--brown-dark); color: #fff; flex-shrink: 0; }
.sel-all-btn { background: none; border: none; color: rgba(255,255,255,.85); font-size: .8rem; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.sel-all-btn i { font-size: .9rem; color: var(--gold-light); }
.sel-count { font-size: .78rem; font-weight: 700; color: var(--gold-light); }

/* ── Lista ─── */
.lancamentos-list { padding-bottom: max(96px, calc(72px + env(safe-area-inset-bottom))); }
.lancamento-row { display: flex; align-items: center; gap: 8px; padding: 11px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
.lancamento-row:active { background: var(--cream); }
.row-interna { opacity: .65; background: #fffbeb; }
.row-interna:active { background: #fef3c7; }
.row-selected { background: var(--gold-bg) !important; }

/* Checkbox de seleção */
.row-check { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-check i { font-size: 1.1rem; color: var(--muted); transition: color var(--t); }
.row-selected .row-check i { color: var(--brown); }

/* ── Barra flutuante de lote ─── */
.barra-lote {
  position: fixed;
  bottom: max(80px, calc(72px + env(safe-area-inset-bottom)));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 448px;
  background: var(--brown-dark);
  border-radius: var(--r-xl);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 8px 32px rgba(30,18,8,.35);
  z-index: 200;
}
.barra-lote-info { display: flex; align-items: baseline; gap: 4px; flex: 1; }
.barra-lote-info strong { color: var(--gold-light); font-size: 1rem; font-weight: 800; }
.barra-lote-info span  { color: rgba(255,255,255,.65); font-size: .78rem; }

.barra-btn { padding: 8px 14px; border: none; border-radius: var(--r-full); font-size: .82rem; font-weight: 700; display: flex; align-items: center; gap: 6px; transition: all var(--t); white-space: nowrap; }
.barra-btn.cancel  { background: rgba(255,255,255,.12); color: rgba(255,255,255,.8); }
.barra-btn.cancel:active  { background: rgba(255,255,255,.22); }
.barra-btn.primary { background: var(--gold); color: var(--brown-dark); }
.barra-btn.primary:active { background: var(--gold-light); }

/* Transição barra lote */
.barra-lote-enter-active, .barra-lote-leave-active { transition: all .22s var(--t-spring); }
.barra-lote-enter-from, .barra-lote-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px) scale(.95); }
.row-banco-badge { width: 26px; height: 26px; border-radius: 6px; font-size: .65rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-banco-badge.pagbank { background: var(--gold-bg); color: var(--gold-dark); }
.row-banco-badge.itau    { background: var(--blue-bg); color: var(--blue); }
.row-banco-badge.bb      { background: #fff7cc; color: #0f4ea8; }
.row-left { flex: 1; min-width: 0; }
.row-title { font-size: .9rem; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-subtitle { font-size: .75rem; color: var(--muted); display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
.badge { display: inline-block; padding: 1px 5px; background: var(--gold-bg); color: var(--gold-dark); border-radius: 3px; font-weight: 600; font-size: .7rem; }
.badge-muted { background: var(--cream-deep); color: var(--muted); }
.badge-gold  { background: var(--gold-bg); color: var(--gold-dark); }
.row-right { font-size: .9rem; font-weight: 700; text-align: right; flex-shrink: 0; font-family: var(--mono); }
.row-right.green { color: var(--green); }
.row-right.red   { color: var(--red); }

/* ── Empty ─── */
.empty-state { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; gap: 12px; color: var(--muted); text-align: center; }
.empty-state i { font-size: 2.5rem; opacity: .3; }
.empty-state p { font-size: .9rem; }
.btn-abrir-import { padding: 10px 20px; background: var(--brown); color: #fff; border: none; border-radius: var(--r-full); font-size: .85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; transition: background var(--t); }
.btn-abrir-import:active { background: var(--brown-dark); }

/* ── Relatório ─── */
.relatorio-wrap { padding: 14px 16px max(96px, calc(72px + env(safe-area-inset-bottom))); display: flex; flex-direction: column; gap: 14px; }
.sheet-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); }
.sheet-body { padding: 14px; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.section-head h4 { font-size: .9rem; font-weight: 700; color: var(--brown-dark); display: flex; align-items: center; gap: 6px; }

/* Banco grid */
.banco-resumo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.banco-resumo-card { border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.banco-resumo-card.pagbank { background: var(--gold-bg); }
.banco-resumo-card.itau    { background: var(--blue-bg); }
.banco-nome { font-size: .8rem; font-weight: 800; color: var(--brown-dark); margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
.banco-linha { display: flex; align-items: center; justify-content: space-between; font-size: .78rem; }
.banco-linha span { color: var(--muted); }
.banco-linha.total { border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; font-weight: 700; }
.banco-linha strong { font-family: var(--mono); font-size: .85rem; }

/* Mei cards */
.mei-grid { display: flex; flex-direction: column; gap: 10px; }
.mei-card { border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px; background: var(--cream); }
.mei-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.mei-head h4 { font-size: .9rem; font-weight: 700; color: var(--brown-dark); }
.mei-line { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; font-size: .82rem; border-bottom: 1px solid rgba(0,0,0,.04); }
.mei-line:last-child { border-bottom: none; }
.mei-line span { color: var(--muted); }
.mei-line strong { font-family: var(--mono); font-size: .88rem; }
.mei-line.total { border-top: 1px solid var(--border2); margin-top: 4px; padding-top: 8px; font-weight: 700; border-bottom: none; }

/* Report list */
.report-list { display: flex; flex-direction: column; }
.report-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.report-row:last-child { border-bottom: none; }
.report-month { font-size: .88rem; font-weight: 700; color: var(--text); }
.report-sub { font-size: .75rem; color: var(--muted); margin-top: 2px; }
.report-value { font-family: var(--mono); font-size: .92rem; flex-shrink: 0; }
.empty-mini { font-size: .82rem; color: var(--muted); padding: 4px 0; }

/* Anual */
.ano-selector-inline { display: flex; gap: 8px; flex-wrap: wrap; }
.ano-btn { padding: 6px 16px; border: 1px solid var(--border); border-radius: var(--r-full); background: var(--bg); color: var(--muted); font-size: .82rem; font-weight: 700; transition: all var(--t); }
.ano-btn.active { background: var(--brown); color: #fff; border-color: var(--brown); }
.anual-totais { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.anual-item { border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px; background: var(--bg); }
.anual-item.destaque { border-width: 2px; }
.anual-item.positivo { border-color: var(--green-dim); background: var(--green-bg); }
.anual-item.negativo { border-color: var(--red); background: var(--red-bg); }
.anual-label { font-size: .7rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px; }
.anual-valor { font-family: var(--mono); font-size: 1.05rem; font-weight: 700; color: var(--brown); margin-bottom: 4px; }
.anual-sub { font-size: .7rem; color: var(--muted); line-height: 1.4; }

/* Gráfico */
.grafico-barras { display: flex; align-items: flex-end; gap: 6px; height: 80px; padding-bottom: 4px; overflow-x: auto; }
.barra-grupo { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 36px; flex-shrink: 0; }
.barra-labels { display: flex; align-items: flex-end; gap: 2px; height: 64px; }
.barra { width: 14px; border-radius: 3px 3px 0 0; transition: height 0.4s ease; }
.barra.entrada { background: var(--green); }
.barra.saida   { background: var(--red); opacity: .75; }
.barra-mes { font-size: .6rem; color: var(--muted); font-weight: 600; white-space: nowrap; }
.grafico-legenda { display: flex; gap: 16px; margin-top: 8px; font-size: .75rem; color: var(--muted); font-weight: 600; }
.leg-entrada i { color: var(--green); }
.leg-saida   i { color: var(--red); }

/* Tabela anual */
.tabela-anual { display: flex; flex-direction: column; }
.ta-hdr { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4px; padding: 6px 0 8px; font-size: .68rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--border); }
.ta-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4px; padding: 8px 0; font-size: .8rem; border-bottom: 1px solid var(--border); }
.ta-row:last-child { border-bottom: none; }
.ta-mes { font-weight: 600; color: var(--text); font-family: var(--font); }
.ta-row span { font-family: var(--mono); font-size: .78rem; }

.c-green { color: var(--green); }
.c-red   { color: var(--red); }
.c-purple { color: #7c3aed; }
.renda-pessoal { background: rgba(124,58,237,.04); border-radius: 4px; padding-left: 4px; padding-right: 4px; }

@media (min-width: 420px) {
  .mei-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
