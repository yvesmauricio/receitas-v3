<template>
  <div class="tab-financeiro">

    <!-- ── Cabeçalho ───────────────────────────────────── -->
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-money-check-dollar"></i> Financeiro</h2>
        <div class="hdr-actions">
          <button v-if="abaAtiva === 'lancamentos' && s.financeiro.length" class="btn-icon btn-danger-soft" @click="mostrarExcluirBanco = !mostrarExcluirBanco" title="Excluir extrato por banco">
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

      <!-- ── Painel excluir por banco ──────────────────── -->
      <Transition name="fade-slide">
        <div v-if="mostrarExcluirBanco" class="excluir-banco-panel">
          <div class="excluir-banco-titulo"><i class="fas fa-trash-can"></i> Excluir extrato por banco</div>
          <div class="excluir-banco-list">
            <button v-for="b in bancosComLancamentos" :key="b.id" class="excluir-banco-btn" @click="handleExcluirPorBanco(b.id)">
              <span class="eb-nome">{{ b.label }}</span>
              <span class="eb-count">{{ b.count }} lançamento(s)</span>
              <i class="fas fa-chevron-right eb-arrow"></i>
            </button>
            <button class="excluir-banco-btn excluir-todos" @click="handleExcluirPorBanco('todos')">
              <span class="eb-nome">Excluir tudo</span>
              <span class="eb-count">{{ s.financeiro.length }} lançamento(s)</span>
              <i class="fas fa-chevron-right eb-arrow"></i>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Navegação de abas ────────────────────────── -->
      <div class="aba-nav">
        <button v-for="aba in abas" :key="aba.id" class="aba-btn"
          :class="{ active: abaAtiva === aba.id }"
          :data-id="aba.id"
          @click="abaAtiva = aba.id">
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
        <button class="sel-fechar-btn" @click="toggleSelecao" title="Sair da seleção">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <!-- Barra discreta de ações da lista -->
      <div v-if="!modoSelecao && lancamentosFiltrados.length" class="lista-acoes-bar">
        <button class="btn-selecionar-sutil" @click="toggleSelecao">
          <i class="fas fa-list-check"></i> Selecionar
        </button>
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
        <div class="rel-print-bar">
          <button class="btn-print" @click="imprimir"><i class="fas fa-print"></i> Imprimir tela</button>
        </div>
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
        <div class="rel-print-bar">
          <button class="btn-print" @click="imprimir"><i class="fas fa-print"></i> Imprimir tela</button>
        </div>
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
                <span>Mês</span><span>Receita MEI</span><span>Saldo op.</span>
              </div>
              <div v-for="item in relatorioAnualMeses" :key="item.mes_ref" class="ta-row">
                <span class="ta-mes">{{ item.mes_ref }}</span>
                <span class="c-green">{{ R$(item.receitas_mei) }}</span>
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

    <!-- ═══ ABA: RELATÓRIOS ═══ -->
    <template v-else-if="abaAtiva === 'relatorios'">
      <div class="relatorio-wrap">

        <!-- ── Seletor tipo relatório ── -->
        <div class="rel-tipo-nav">
          <button class="rel-tipo-btn" :class="{ active: relTipo === 'mensal' }" @click="relTipo = 'mensal'">
            <i class="fas fa-calendar-days"></i> Livro Caixa Mensal
          </button>
          <button class="rel-tipo-btn" :class="{ active: relTipo === 'anual' }" @click="relTipo = 'anual'">
            <i class="fas fa-file-invoice-dollar"></i> Declaração Anual
          </button>
        </div>

        <!-- ══ BARRA TETO MEI ════════════════════════════ -->
        <section class="sheet-card teto-card">
          <div class="sheet-body">
            <div class="teto-header">
              <div>
                <div class="teto-titulo">Faturamento MEI · {{ anoRelatorioAtual }}</div>
                <div class="teto-sub">Limite anual: {{ R$(TETO_MEI_ANUAL) }}</div>
              </div>
              <div class="teto-valor-wrap">
                <div class="teto-valor" :class="percentualTeto >= 90 ? 'c-red' : percentualTeto >= 70 ? 'c-orange' : 'c-green'">
                  {{ R$(faturamentoAnoRel) }}
                </div>
                <div class="teto-pct">{{ percentualTeto.toFixed(1) }}% do teto</div>
              </div>
            </div>
            <div class="teto-barra-wrap">
              <div class="teto-barra-bg">
                <div class="teto-barra-fill"
                  :style="{ width: Math.min(100, percentualTeto) + '%' }"
                  :class="percentualTeto >= 90 ? 'danger' : percentualTeto >= 70 ? 'warning' : 'ok'">
                </div>
                <div class="teto-barra-mark" v-if="percentualTeto < 100" :title="'Faltam ' + R$(TETO_MEI_ANUAL - faturamentoAnoRel)">
                  <span class="teto-falta">Faltam {{ R$(Math.max(0, TETO_MEI_ANUAL - faturamentoAnoRel)) }}</span>
                </div>
              </div>
            </div>
            <div class="teto-alertas" v-if="percentualTeto >= 70">
              <div class="teto-alerta" :class="percentualTeto >= 90 ? 'alerta-danger' : 'alerta-warning'">
                <i class="fas" :class="percentualTeto >= 90 ? 'fa-triangle-exclamation' : 'fa-circle-info'"></i>
                <span v-if="percentualTeto >= 100">Teto MEI atingido. Consulte um contador para regularização.</span>
                <span v-else-if="percentualTeto >= 90">Atenção: mais de 90% do teto atingido. Monitore os próximos recebimentos.</span>
                <span v-else>Mais de 70% do teto utilizado. Fique atento ao limite.</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ══ RELATÓRIO MENSAL — LIVRO CAIXA ══════════════ -->
        <template v-if="relTipo === 'mensal'">
          <section class="sheet-card">
            <div class="sheet-body">
              <div class="section-head">
                <h4><i class="fas fa-calendar-days"></i> Livro Caixa MEI · Mensal</h4>
              </div>

              <div class="report-config-box">
                <div class="report-config-grid">
                  <div class="fg" style="margin:0">
                    <label class="label">Competência</label>
                    <select class="input sm" v-model="relMensalMesRef">
                      <option v-for="m in mesesRelatorio" :key="m.value" :value="m.value">{{ m.label }}</option>
                    </select>
                  </div>
                  <div class="fg" style="margin:0; display: flex; align-items: center">
                    <label class="incluir-pessoal-toggle-modern">
                      <input type="checkbox" v-model="incluirRendasPessoais" />
                      <span>Incluir rendas pessoais</span>
                    </label>
                  </div>
                </div>
                <button class="btn-gerar-large" @click="gerarDocLivroCaixa">
                  <i class="fas fa-file-pdf"></i> Gerar Livro Caixa (PDF)
                </button>
              </div>

              <!-- Cabeçalho formal -->
              <div class="lc-cabecalho" v-if="dadosRelMensal">
                <div class="lc-cb-linha"><span>Contribuinte (MEI):</span><strong>{{ nomeContribuinte }}</strong></div>
                <div class="lc-cb-linha"><span>Competência:</span><strong>{{ relMensalMesRef }}</strong></div>
                <div class="lc-cb-linha"><span>Atividade:</span><strong>Produção e venda de alimentos artesanais</strong></div>
              </div>

              <div v-if="!dadosRelMensal" class="empty-mini">Sem dados para este mês.</div>
              <template v-else>

                <!-- Tabela Receitas -->
                <div class="lc-section-label entrada">↑ RECEITAS / ENTRADAS</div>
                <div class="lc-tabela">
                  <div v-for="item in lancMensalEntradas" :key="item.id" class="lc-row entrada-row">
                    <div class="lc-col-top">
                      <span class="lc-badge lc-entrada">{{ item.categoria }}</span>
                      <span class="lc-col-val c-green">{{ R$(item.valor) }}</span>
                    </div>
                    <div class="lc-col-desc">{{ item.descricao }}</div>
                    <div class="lc-col-data">{{ formatarData(item.data) }}</div>
                  </div>
                  <div v-if="!lancMensalEntradas.length" class="lc-vazio">Nenhuma receita neste mês.</div>
                  <div class="lc-total">
                    <span class="lc-total-label">Total Receita MEI (faturamento)</span>
                    <strong class="c-green">{{ R$(dadosRelMensal.receitas_mei) }}</strong>
                  </div>
                </div>

                <!-- Entradas não-MEI (informativo) -->
                <template v-if="lancMensalNaoMei.length">
                  <div class="lc-section-label pessoal">↑ OUTRAS ENTRADAS (não compõem faturamento MEI)</div>
                  <div class="lc-tabela">
                    <div v-for="item in lancMensalNaoMei" :key="item.id" class="lc-row pessoal-row">
                      <div class="lc-col-top">
                        <span class="lc-badge lc-pessoal">{{ item.categoria }}</span>
                        <span class="lc-col-val c-purple">{{ R$(item.valor) }}</span>
                      </div>
                      <div class="lc-col-desc">{{ item.descricao }}</div>
                      <div class="lc-col-data">{{ formatarData(item.data) }}</div>
                    </div>
                    <div class="lc-total pessoal-total">
                      <span class="lc-total-label">Total Outras Entradas</span>
                      <strong class="c-purple">{{ R$(dadosRelMensal.outras_entradas_nao_mei) }}</strong>
                    </div>
                  </div>
                </template>

                <!-- Tabela Despesas Operacionais -->
                <div class="lc-section-label saida">↓ DESPESAS OPERACIONAIS</div>
                <div class="lc-tabela">
                  <div v-for="item in lancMensalOperacional" :key="item.id" class="lc-row saida-row">
                    <div class="lc-col-top">
                      <span class="lc-badge lc-saida">{{ item.categoria }}</span>
                      <span class="lc-col-val c-red">{{ R$(Math.abs(item.valor)) }}</span>
                    </div>
                    <div class="lc-col-desc">{{ item.descricao }}</div>
                    <div class="lc-col-data">{{ formatarData(item.data) }}</div>
                  </div>
                  <div v-if="!lancMensalOperacional.length" class="lc-vazio">Nenhuma despesa operacional.</div>
                  <div class="lc-total">
                    <span class="lc-total-label">Total Despesas Operacionais</span>
                    <strong class="c-red">{{ R$(dadosRelMensal.saidas_operacionais) }}</strong>
                  </div>
                </div>

                <!-- Resumo do mês -->
                <div class="lc-resumo">
                  <div class="lc-resumo-linha">
                    <span>Receita MEI bruta</span>
                    <strong class="c-green">{{ R$(dadosRelMensal.receitas_mei) }}</strong>
                  </div>
                  <div class="lc-resumo-linha" v-if="dadosRelMensal.outras_entradas_nao_mei">
                    <span>Outras entradas (não-MEI)</span>
                    <strong class="c-purple">{{ R$(dadosRelMensal.outras_entradas_nao_mei) }}</strong>
                  </div>
                  <div class="lc-resumo-linha">
                    <span>( − ) Despesas operacionais</span>
                    <strong class="c-red">{{ R$(dadosRelMensal.saidas_operacionais) }}</strong>
                  </div>
                  <div class="lc-resumo-linha destaque">
                    <span>= Resultado operacional MEI</span>
                    <strong :class="dadosRelMensal.saldo_operacional >= 0 ? 'c-green' : 'c-red'">
                      {{ R$(dadosRelMensal.saldo_operacional) }}
                    </strong>
                  </div>
                  <div class="lc-resumo-linha sub">
                    <span>Rendimentos financeiros</span>
                    <strong>{{ R$(dadosRelMensal.rendimento_financeiro) }}</strong>
                  </div>
                  <div class="lc-resumo-linha sub">
                    <span>Retiradas pessoais / Pró-labore</span>
                    <strong class="c-red">{{ R$(dadosRelMensal.saidas_pessoais) }}</strong>
                  </div>
                </div>

                <!-- Acumulado do ano -->
                <div class="lc-acumulado">
                  <div class="lc-acum-titulo">Acumulado {{ anoRelatorioAtual }} até {{ relMensalMesRef }}</div>
                  <div class="lc-acum-grid">
                    <div class="lc-acum-item">
                      <span>Faturamento MEI</span>
                      <strong class="c-green">{{ R$(acumuladoAteMes.receitas_mei) }}</strong>
                    </div>
                    <div class="lc-acum-item">
                      <span>Despesas operacionais</span>
                      <strong class="c-red">{{ R$(acumuladoAteMes.saidas_operacionais) }}</strong>
                    </div>
                    <div class="lc-acum-item">
                      <span>Resultado acumulado</span>
                      <strong :class="acumuladoAteMes.saldo_operacional >= 0 ? 'c-green' : 'c-red'">
                        {{ R$(acumuladoAteMes.saldo_operacional) }}
                      </strong>
                    </div>
                    <div class="lc-acum-item">
                      <span>% do teto MEI</span>
                      <strong :class="acumuladoAteMes.pct_teto >= 90 ? 'c-red' : acumuladoAteMes.pct_teto >= 70 ? 'c-orange' : 'c-green'">
                        {{ acumuladoAteMes.pct_teto.toFixed(1) }}%
                      </strong>
                    </div>
                  </div>
                </div>

              </template>
            </div>
          </section>
        </template>

        <!-- ══ RELATÓRIO ANUAL — DASN-SIMEI ═══════════════ -->
        <template v-if="relTipo === 'anual'">
          <section class="sheet-card">
            <div class="sheet-body">
              <div class="section-head">
                <h4><i class="fas fa-file-invoice-dollar"></i> Declaração Anual · DASN-SIMEI</h4>
              </div>

              <div class="report-config-box">
                <div class="report-config-grid">
                  <div class="fg" style="margin:0">
                    <label class="label">Ano-calendário</label>
                    <select class="input sm" v-model="anoRelAnual">
                      <option v-for="a in anosDisponiveis" :key="a" :value="a">{{ a }}</option>
                    </select>
                  </div>
                  <div class="fg" style="margin:0; display: flex; align-items: center">
                    <label class="incluir-pessoal-toggle-modern">
                      <input type="checkbox" v-model="incluirRendasPessoais" />
                      <span>Incluir rendas pessoais</span>
                    </label>
                  </div>
                </div>
                <button class="btn-gerar-large" @click="gerarDocDASN">
                  <i class="fas fa-file-arrow-down"></i> Gerar DASN-SIMEI Oficial
                </button>
              </div>

              <div class="lc-cabecalho">
                <div class="lc-cb-linha"><span>Contribuinte (MEI):</span><strong>{{ nomeContribuinte }}</strong></div>
                <div class="lc-cb-linha"><span>Ano-calendário:</span><strong>{{ anoRelAnual }}</strong></div>
                <div class="lc-cb-linha"><span>Documento:</span><strong>DASN-SIMEI — Declaração Anual do Simples Nacional MEI</strong></div>
              </div>

              <!-- Quadro 1: Receita Bruta MEI -->
              <div class="lc-section-label entrada">QUADRO 1 — RECEITA BRUTA MEI</div>
              <div class="lc-quadro">
                <div class="lc-q-linha hdr">
                  <span>Mês</span>
                  <span>Receita MEI</span>
                  <span>Acumulado</span>
                </div>
                <div v-for="(item, idx) in relatorioAnualMeses" :key="item.mes_ref" class="lc-q-linha">
                  <span class="lc-q-mes">{{ item.mes_ref }}</span>
                  <span class="c-green">{{ R$(item.receitas_mei) }}</span>
                  <span class="c-green">{{ R$(relatorioAnualMeses.slice(0, idx+1).reduce((a,i)=>a+i.receitas_mei,0)) }}</span>
                </div>
                <div v-if="!relatorioAnualMeses.length" class="lc-vazio">Sem dados para o ano.</div>
                <div class="lc-q-linha total">
                  <span>TOTAL</span>
                  <span class="c-green fw700">{{ R$(totalAnual.receitas) }}</span>
                  <span class="c-green fw700">{{ R$(totalAnual.receitas) }}</span>
                </div>
              </div>

              <!-- Quadro 2: Outras entradas (informativo) -->
              <div class="lc-section-label pessoal" v-if="incluirRendasPessoais && totalAnual.outras_entradas">
                INFORMATIVO — ENTRADAS NÃO-MEI
              </div>
              <div class="lc-quadro" v-if="incluirRendasPessoais && totalAnual.outras_entradas">
                <div class="lc-q-linha hdr">
                  <span>Tipo</span>
                  <span>Total {{ anoRelAnual }}</span>
                </div>
                <div class="lc-q-linha">
                  <span class="lc-q-mes">Renda pessoal</span>
                  <span class="c-purple fw700">{{ R$(totalAnual.outras_entradas) }}</span>
                </div>
              </div>

              <!-- Quadro 3: Despesas operacionais -->
              <div class="lc-section-label saida">QUADRO 2 — DESPESAS DO EXERCÍCIO</div>
              <div class="lc-quadro">
                <div class="lc-q-linha hdr">
                  <span>Mês</span>
                  <span>Op.</span>
                  <span>Pessoal</span>
                </div>
                <div v-for="item in relatorioAnualMeses" :key="item.mes_ref" class="lc-q-linha">
                  <span class="lc-q-mes">{{ item.mes_ref }}</span>
                  <span class="c-red">{{ R$(item.saidas_operacionais) }}</span>
                  <span>{{ R$(item.saidas_pessoais) }}</span>
                </div>
                <div class="lc-q-linha total">
                  <span>TOTAL</span>
                  <span class="c-red fw700">{{ R$(totalAnual.operacional) }}</span>
                  <span class="fw700">{{ R$(totalAnual.pessoal) }}</span>
                </div>
              </div>

              <!-- Quadro resumo final -->
              <div class="lc-section-label">RESULTADO DO EXERCÍCIO {{ anoRelAnual }}</div>
              <div class="lc-resumo-anual">
                <div class="lra-linha">
                  <span>Receita Bruta MEI (faturamento tributável)</span>
                  <strong class="c-green">{{ R$(totalAnual.receitas) }}</strong>
                </div>
                <div class="lra-linha" v-if="incluirRendasPessoais && totalAnual.outras_entradas">
                  <span>Outras entradas não-MEI (informativo)</span>
                  <strong class="c-purple">{{ R$(totalAnual.outras_entradas) }}</strong>
                </div>
                <div class="lra-linha">
                  <span>( − ) Total de despesas operacionais</span>
                  <strong class="c-red">{{ R$(totalAnual.operacional) }}</strong>
                </div>
                <div class="lra-linha destaque">
                  <span>= Resultado líquido do negócio</span>
                  <strong :class="totalAnual.saldo >= 0 ? 'c-green' : 'c-red'">{{ R$(totalAnual.saldo) }}</strong>
                </div>
                <div class="lra-linha sub">
                  <span>Retiradas pessoais (Pró-labore)</span>
                  <strong>{{ R$(totalAnual.pessoal) }}</strong>
                </div>
                <div class="lra-verificacao">
                  <i class="fas" :class="totalAnual.receitas <= TETO_MEI_ANUAL ? 'fa-circle-check' : 'fa-triangle-exclamation'"></i>
                  <span v-if="totalAnual.receitas <= TETO_MEI_ANUAL">
                    Dentro do teto MEI ({{ R$(totalAnual.receitas) }} de {{ R$(TETO_MEI_ANUAL) }})
                  </span>
                  <span v-else>
                    Faturamento ACIMA do teto MEI — verificar obrigações com contador
                  </span>
                </div>
              </div>

            </div>
          </section>
        </template>

        <!-- Nota de rodapé -->
        <div class="rel-nota">
          <i class="fas fa-circle-info"></i>
          Teto MEI {{ anoRelatorioAtual }}: {{ R$(TETO_MEI_ANUAL.value) }}/ano · Dados gerados com base nos lançamentos importados.
          A DASN-SIMEI deve ser entregue até 31/05 do ano seguinte via portal gov.br/mei.
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
import { gerarLivroCaixa, gerarDASNSIMEI } from '../composables/useGerarDocumento.js'

const s = useStore()
const confirm = useConfirm()
const lancamentoEmEdicao = ref(null)
const mostrarImportadores = ref(false)
const bancoImport = ref('pagbank')
const mostrarExcluirBanco = ref(false)

const abas = [
  { id: 'lancamentos', label: 'Lançamentos', icon: 'fas fa-list' },
  { id: 'mensal',      label: 'Mensal',       icon: 'fas fa-calendar' },
  { id: 'anual',       label: 'Anual',         icon: 'fas fa-chart-bar' },
  { id: 'relatorios',  label: 'Relatórios',    icon: 'fas fa-file-invoice' }
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

const bancosComLancamentos = computed(() => {
  const config = [
    { id: 'pagbank', label: 'PagBank' },
    { id: 'itau',    label: 'Itaú' },
    { id: 'bb',      label: 'BB' }
  ]
  return config
    .map(b => ({ ...b, count: s.financeiro.filter(i => (i.banco || 'pagbank') === b.id).length }))
    .filter(b => b.count > 0)
})

async function handleExcluirPorBanco(banco) {
  const labels = { pagbank: 'PagBank', itau: 'Itaú', bb: 'BB', todos: 'todos os bancos' }
  const count = banco === 'todos'
    ? s.financeiro.length
    : s.financeiro.filter(i => (i.banco || 'pagbank') === banco).length
  const ok = await confirm.ask(
    `Isso irá apagar permanentemente ${count} lançamento(s) de ${labels[banco] || banco}. Deseja continuar?`,
    { title: 'Excluir Extrato', icon: 'fas fa-trash-can', confirmLabel: 'Apagar', type: 'danger' }
  )
  if (ok) {
    await s.limparFinanceiroPorBanco(banco)
    mostrarExcluirBanco.value = false
  }
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

// ── Relatórios ──────────────────────────────────────────────
const TETO_MEI_ANUAL = computed(() => s.company.teto_mei_anual || 81000)
const nomeContribuinte = 'MEI — Conta PagBank / Itaú'

const relTipo = ref('mensal')
const anoRelatorioAtual = computed(() => anoRelAnual.value)
const incluirRendasPessoais = ref(false)

// Meses disponíveis como { value, label } para o select do relatório mensal
const mesesRelatorio = computed(() =>
  mesesDisponiveis.value.map(m => ({ value: m, label: m }))
)

// Mês selecionado no relatório mensal (default: mês mais recente disponível)
const relMensalMesRef = ref('')
watch(mesesDisponiveis, (meses) => {
  if (meses.length && !relMensalMesRef.value) relMensalMesRef.value = meses[0]
}, { immediate: true })

// Dados do mês selecionado no relatório mensal
const dadosRelMensal = computed(() =>
  s.relatorioMensalMei.find(i => i.mes_ref === relMensalMesRef.value) || null
)

// Lançamentos do mês selecionado — MEI (entradas)
const lancMensalEntradas = computed(() => {
  if (!relMensalMesRef.value) return []
  return s.financeiro.filter(i =>
    i.mes_ref === relMensalMesRef.value &&
    i.natureza === 'entrada' &&
    i.categoria !== 'Rendimento Financeiro' &&
    i.valor > 0
  )
})

// Lançamentos do mês — entradas não-MEI (pessoal positivo, ex: Renda Pessoal)
const lancMensalNaoMei = computed(() => {
  if (!relMensalMesRef.value) return []
  return s.financeiro.filter(i =>
    i.mes_ref === relMensalMesRef.value &&
    i.natureza === 'pessoal' &&
    i.valor > 0
  )
})

// Lançamentos do mês — despesas operacionais
const lancMensalOperacional = computed(() => {
  if (!relMensalMesRef.value) return []
  return s.financeiro.filter(i =>
    i.mes_ref === relMensalMesRef.value &&
    i.natureza === 'operacional' &&
    i.valor < 0
  )
})

// Faturamento MEI do ano do relatório
const faturamentoAnoRel = computed(() =>
  s.relatorioMensalMei
    .filter(i => i.mes_ref.endsWith(`/${anoRelAnual.value}`))
    .reduce((a, i) => a + (i.receitas_mei || 0), 0)
)

const percentualTeto = computed(() =>
  TETO_MEI_ANUAL.value > 0 ? (faturamentoAnoRel.value / TETO_MEI_ANUAL.value) * 100 : 0
)

// Acumulado do ano até o mês selecionado no relatório mensal
const acumuladoAteMes = computed(() => {
  const [mesAtual, anoAtual] = (relMensalMesRef.value || '').split('/')
  if (!mesAtual || !anoAtual) return { receitas_mei: 0, saidas_operacionais: 0, saldo_operacional: 0, pct_teto: 0 }
  const mesesDoAno = s.relatorioMensalMei.filter(i => {
    const [m, a] = i.mes_ref.split('/')
    return a === anoAtual && Number(m) <= Number(mesAtual)
  })
  const receitas_mei = mesesDoAno.reduce((a, i) => a + (i.receitas_mei || 0), 0)
  const saidas_operacionais = mesesDoAno.reduce((a, i) => a + (i.saidas_operacionais || 0), 0)
  return {
    receitas_mei,
    saidas_operacionais,
    saldo_operacional: receitas_mei - saidas_operacionais,
    pct_teto: TETO_MEI_ANUAL.value > 0 ? (receitas_mei / TETO_MEI_ANUAL.value) * 100 : 0
  }
})

// ── Geração de documentos oficiais ──────────────────────────────
function gerarDocLivroCaixa() {
  gerarLivroCaixa({
    mes_ref:  relMensalMesRef.value,
    empresa:  s.company,
    entradas: lancMensalEntradas.value,
    naoMei:   lancMensalNaoMei.value,
    saidas:   lancMensalOperacional.value,
    totais:   dadosRelMensal.value || {},
    acumulado: acumuladoAteMes.value,
    incluirNaoMei: incluirRendasPessoais.value
  })
}

function gerarDocDASN() {
  gerarDASNSIMEI({
    ano:      anoRelAnual.value,
    empresa:  s.company,
    meses:    relatorioAnualMeses.value,
    totais:   totalAnual.value,
    tetoAnual: TETO_MEI_ANUAL.value,
    pctTeto:  percentualTeto.value,
    incluirNaoMei: incluirRendasPessoais.value
  })
}

onMounted(() => s.carregarFinanceiro())

function imprimir() { window.print() }
</script>

<style scoped>
/* ── Painel excluir por banco ─────────────────────────────── */
.excluir-banco-panel {
  background: var(--red-bg);
  border-bottom: 1px solid var(--red-dim);
  padding: 10px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.excluir-banco-titulo {
  font-size: .7rem;
  font-weight: 800;
  color: var(--red);
  text-transform: uppercase;
  letter-spacing: .5px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.excluir-banco-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.excluir-banco-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--red-dim);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--text);
  text-align: left;
  transition: all var(--t);
}
.excluir-banco-btn:active { background: var(--red-bg); }
.excluir-banco-btn.excluir-todos {
  border-color: var(--red);
  background: #fff0f0;
  color: var(--red);
}
.excluir-banco-btn.excluir-todos:active { background: #fde0e0; }
.eb-nome { flex: 1; font-size: .84rem; font-weight: 700; }
.eb-count { font-size: .72rem; color: var(--muted); font-weight: 500; }
.excluir-banco-btn.excluir-todos .eb-count { color: var(--red); opacity: .75; }
.eb-arrow { font-size: .65rem; color: var(--muted); flex-shrink: 0; }

/* Transição painel excluir */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all .18s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Barra discreta de ações da lista ─── */
.lista-acoes-bar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.btn-selecionar-sutil {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--muted);
  font-size: .72rem;
  font-weight: 700;
  transition: all var(--t);
}
.btn-selecionar-sutil:active {
  background: var(--cream-deep);
  color: var(--brown-mid);
  border-color: var(--brown-mid);
}
.btn-selecionar-sutil i { font-size: .7rem; }

/* ── Botão fechar seleção ─── */
.sel-fechar-btn {
  background: rgba(255,255,255,.12);
  border: none;
  color: rgba(255,255,255,.7);
  width: 28px;
  height: 28px;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .85rem;
  flex-shrink: 0;
  margin-left: auto;
}
.sel-fechar-btn:active { background: rgba(255,255,255,.22); }

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
.ta-hdr { display: grid; grid-template-columns: 58px 1fr 1fr; gap: 4px; padding: 6px 0 8px; font-size: .66rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--border); }
.ta-row { display: grid; grid-template-columns: 58px 1fr 1fr; gap: 4px; padding: 8px 0; font-size: .8rem; border-bottom: 1px solid var(--border); }
.ta-row:last-child { border-bottom: none; }
.ta-mes { font-weight: 600; color: var(--text); font-family: var(--font); font-size: .75rem; }
.ta-row span { font-family: var(--mono); font-size: .76rem; }

.c-green { color: var(--green); }
.c-red   { color: var(--red); }
.c-purple { color: #7c3aed; }
.c-orange { color: #c2710c; }
.fw700 { font-weight: 700; }
.renda-pessoal { background: rgba(124,58,237,.04); border-radius: 4px; padding-left: 4px; padding-right: 4px; }

/* ── Aba Relatórios ─────────────────────────────────────── */
.rel-tipo-nav {
  display: flex;
  gap: 8px;
  padding: 0 0 4px;
}
.rel-tipo-btn {
  flex: 1;
  padding: 9px 8px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--bg);
  color: var(--muted);
  font-size: .78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all var(--t);
}
.rel-tipo-btn.active {
  background: var(--brown);
  color: #fff;
  border-color: var(--brown);
}

/* ── Barra de teto ── */
.teto-card { border-left: 3px solid var(--brown); }
.teto-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.teto-titulo { font-size: .88rem; font-weight: 800; color: var(--brown-dark); }
.teto-sub { font-size: .72rem; color: var(--muted); margin-top: 2px; }
.teto-valor-wrap { text-align: right; flex-shrink: 0; }
.teto-valor { font-family: var(--mono); font-size: 1.1rem; font-weight: 800; }
.teto-pct { font-size: .7rem; color: var(--muted); margin-top: 2px; }

.teto-barra-wrap { margin-bottom: 6px; }
.teto-barra-bg {
  position: relative;
  height: 12px;
  background: var(--cream-deep);
  border-radius: 99px;
  overflow: hidden;
}
.teto-barra-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .6s ease;
}
.teto-barra-fill.ok      { background: var(--green); }
.teto-barra-fill.warning { background: #c2710c; }
.teto-barra-fill.danger  { background: var(--red); }
.teto-barra-mark { margin-top: 5px; text-align: right; padding-right: 2px; }
.teto-falta { font-size: .68rem; color: var(--muted); font-weight: 600; display: inline-block; }

.teto-alertas { margin-top: 4px; }
.teto-alerta {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--r-md);
  font-size: .78rem;
  font-weight: 600;
}
.teto-alerta.alerta-warning { background: #fef3c7; color: #92400e; }
.teto-alerta.alerta-danger  { background: var(--red-bg); color: var(--red); }
.teto-alerta i { flex-shrink: 0; margin-top: 1px; }

/* ── Livro Caixa ── */
.lc-cabecalho {
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 8px 10px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lc-cb-linha {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: .76rem;
}
.lc-cb-linha span { color: var(--muted); font-size: .64rem; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; }
.lc-cb-linha strong { color: var(--text); font-size: .78rem; word-break: break-word; line-height: 1.3; }

.lc-section-label {
  font-size: .65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .6px;
  padding: 8px 10px 6px;
  margin: 10px -14px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.lc-section-label.entrada { background: #f0fdf4; color: var(--green); }
.lc-section-label.saida   { background: #fff1f2; color: var(--red); }
.lc-section-label.pessoal { background: #faf5ff; color: #6d28d9; }
.lc-section-label:not(.entrada):not(.saida):not(.pessoal) { background: var(--cream); color: var(--brown-mid); }

.lc-tabela { margin-bottom: 4px; }
.lc-hdr { display: none; } /* hidden — using card layout instead */
.lc-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--border);
}
.lc-row:last-of-type { border-bottom: none; }
/* top line: badge + valor */
.lc-row .lc-col-cat  { order: 1; }
.lc-row .lc-col-val  { order: 1; }
.lc-row .lc-col-desc { order: 2; color: var(--text); font-size: .8rem; word-break: break-word; line-height: 1.35; }
.lc-row .lc-col-data { order: 3; color: var(--muted); font-size: .68rem; font-weight: 600; }
/* use flexbox row for first line via pseudo wrapper — handle in template instead */
.lc-col-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.lc-col-data { color: var(--muted); font-size: .68rem; font-weight: 600; }
.lc-col-desc { color: var(--text); word-break: break-word; line-height: 1.35; font-size: .8rem; }
.lc-col-cat  { }
.lc-col-val  { font-family: var(--mono); font-size: .86rem; font-weight: 700; flex-shrink: 0; }
.lc-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: .64rem;
  font-weight: 700;
  white-space: nowrap;
}
.lc-entrada { background: var(--green-bg); color: var(--green); }
.lc-saida   { background: var(--red-bg); color: var(--red); }
.lc-pessoal { background: #f5f3ff; color: #6d28d9; }

.lc-vazio { font-size: .78rem; color: var(--muted); padding: 8px 0; }

.lc-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 4px;
  border-top: 2px solid var(--border2);
  font-size: .8rem;
  font-weight: 700;
}
.lc-total-label { color: var(--text); }
.lc-total strong { font-family: var(--mono); font-size: .88rem; }
.pessoal-total { border-top-color: #ddd6fe; }

/* Resumo do mês */
.lc-resumo {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
}
.lc-resumo-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: .8rem;
  border-bottom: 1px solid var(--border);
}
.lc-resumo-linha:last-child { border-bottom: none; }
.lc-resumo-linha span { color: var(--muted); }
.lc-resumo-linha strong { font-family: var(--mono); font-size: .84rem; }
.lc-resumo-linha.destaque { background: var(--cream); font-weight: 700; }
.lc-resumo-linha.destaque span { color: var(--text); font-weight: 700; }
.lc-resumo-linha.sub { background: var(--bg); opacity: .8; }

/* Acumulado */
.lc-acumulado {
  margin-top: 14px;
  background: var(--gold-bg);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 10px 12px;
}
.lc-acum-titulo {
  font-size: .72rem;
  font-weight: 800;
  color: var(--brown-mid);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 10px;
}
.lc-acum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lc-acum-item {
  background: var(--surface);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  border: 1px solid var(--border);
}
.lc-acum-item span { display: block; font-size: .66rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 4px; }
.lc-acum-item strong { font-family: var(--mono); font-size: .88rem; font-weight: 800; }

/* Quadro anual */
.lc-quadro {
  margin-bottom: 4px;
  overflow-x: auto;
}
.lc-q-linha {
  display: grid;
  grid-template-columns: 62px 1fr 1fr;
  gap: 4px;
  padding: 7px 0;
  font-size: .76rem;
  border-bottom: 1px dashed var(--border);
  align-items: center;
}
.lc-q-linha.hdr {
  font-size: .62rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .4px;
  border-bottom: 1px solid var(--border2);
}
.lc-q-linha.total {
  font-weight: 700;
  border-top: 2px solid var(--border2);
  border-bottom: none;
  background: var(--cream);
  padding: 8px 4px;
  border-radius: var(--r-sm);
  margin-top: 2px;
}
.lc-q-mes { color: var(--text); font-weight: 600; }
.lc-q-linha span { font-family: var(--mono); }
.lc-q-linha span:first-child { font-family: var(--font); }

/* Resumo anual */
.lc-resumo-anual {
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  overflow: hidden;
}
.lra-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  font-size: .8rem;
  border-bottom: 1px solid var(--border);
}
.lra-linha span { color: var(--muted); }
.lra-linha strong { font-family: var(--mono); font-size: .86rem; }
.lra-linha.destaque { background: var(--cream); font-weight: 700; }
.lra-linha.destaque span { color: var(--text); font-weight: 700; }
.lra-linha.sub { background: var(--bg); opacity: .8; font-size: .76rem; }
.lra-verificacao {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: .76rem;
  font-weight: 700;
  background: var(--green-bg);
  color: var(--green);
  border-top: 1px solid var(--border);
}
.lra-verificacao i { font-size: .85rem; }

/* Nota rodapé */
.rel-nota {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: .72rem;
  color: var(--muted);
  line-height: 1.5;
  padding: 10px 4px 4px;
}
.rel-nota i { flex-shrink: 0; color: var(--brown-light); margin-top: 1px; }

@media (min-width: 420px) {
  .mei-grid { display: grid; grid-template-columns: repeat(2, 1fr); }
}

/* ════════════════════════════════════════════════════════════
   FIXES SAMSUNG A22 — tela estreita (≤ 380px)
   ════════════════════════════════════════════════════════════ */

/* 1 ── Cards de banco: empilhar em coluna única */
@media (max-width: 380px) {
  .banco-resumo-grid { grid-template-columns: 1fr; }
}

/* 2 ── Livro Caixa: layout mobile — descrição + valor na linha 1, data + tipo na linha 2 */
@media (max-width: 380px) {
  .lc-hdr { display: none; }
  .lc-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 0;
    padding: 9px 0;
  }
  .lc-col-desc {
    order: 0;
    flex: 1 1 calc(100% - 76px);
    min-width: 0;
    font-size: .78rem;
    font-weight: 600;
    color: var(--text);
    padding-right: 6px;
    word-break: break-word;
    line-height: 1.35;
  }
  .lc-col-val {
    order: 1;
    flex: 0 0 auto;
    min-width: 72px;
    font-size: .78rem;
    text-align: right;
    padding-top: 0;
  }
  .lc-col-data {
    order: 2;
    flex: 0 0 auto;
    font-size: .65rem;
    color: var(--muted);
    padding-top: 3px;
    margin-right: 8px;
  }
  .lc-col-cat {
    order: 3;
    flex: 0 0 auto;
    padding-top: 3px;
  }
}

/* 3 ── Tabela anual (detalhamento mensal): 3 colunas, sem scroll */
.tabela-anual {
  width: 100%;
}

/* 4 ── Quadros DASN (Receita + Despesas): 3 colunas, sem scroll */
.lc-quadro {
  width: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.lc-quadro::-webkit-scrollbar { display: none; }

/* 5 ── Gráfico de barras anual: mais espaço em telas pequenas */
@media (max-width: 380px) {
  .grafico-barras { gap: 4px; }
  .barra-grupo    { min-width: 30px; }
  .barra          { width: 12px; }
  .barra-mes      { font-size: .55rem; }
}

/* 6 ── Totais anuais: coluna única abaixo de 380px */
@media (max-width: 380px) {
  .anual-totais { grid-template-columns: 1fr; }
  .anual-item   { padding: 10px 12px; }
}

/* ── Botão Imprimir ─────────────────────────────────────── */
.sh-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.rel-print-bar {
  display: flex;
  justify-content: flex-end;
}
.btn-print {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  background: var(--brown);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: .8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--t), transform var(--t);
  white-space: nowrap;
}
.btn-print:active { background: var(--brown-dark); transform: scale(.96); }
.btn-print-sm {
  padding: 6px 10px;
  font-size: .75rem;
  border-radius: var(--r-sm);
}

/* Botão gerar documento oficial */
.btn-gerar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: #003580;
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--t), transform var(--t);
  flex-shrink: 0;
}
.btn-gerar:active { background: #002060; transform: scale(.96); }

.incluir-pessoal-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--muted);
  cursor: pointer;
}

.report-config-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 10px 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.report-config-grid {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.report-config-grid .fg { margin: 0; flex-shrink: 0; }
.incluir-pessoal-toggle-modern {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--muted);
  cursor: pointer;
  flex: 1;
  min-width: 0;
}
.btn-gerar-large {
  width: 100%;
  padding: 9px;
  background: #003580;
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all var(--t);
}
.btn-gerar-large:active { background: #002060; transform: scale(0.98); }

/* ════════════════════════════════════════════════════════════
   @MEDIA PRINT — formatação para impressão
   ════════════════════════════════════════════════════════════ */
@media print {
  /* Esconder chrome do app */
  .hdr, .nav, .tab-hdr,
  .rel-tipo-nav, .rel-print-bar, .sh-tools .btn-print,
  .teto-alertas, .ano-selector-inline,
  .btn-abrir-import { display: none !important; }

  /* Resetar container */
  body, html { height: auto !important; overflow: visible !important; font-size: 11pt; }
  .shell, .main, .tab-financeiro { height: auto !important; overflow: visible !important; }
  .relatorio-wrap {
    padding: 0 !important;
    gap: 10pt !important;
  }

  /* Cards sem sombra, sem quebra interna */
  .sheet-card {
    box-shadow: none !important;
    border: 1px solid #ccc !important;
    break-inside: avoid;
    margin-bottom: 8pt;
  }

  /* Tabelas: mostrar sem scroll */
  .lc-quadro, .tabela-anual {
    overflow: visible !important;
  }
  .lc-q-linha  { min-width: auto !important; }
  .ta-hdr, .ta-row { min-width: auto !important; }

  /* Livro Caixa: restaurar grid de 4 colunas no papel */
  .lc-hdr {
    display: grid !important;
    grid-template-columns: 56px 1fr 80px 64px !important;
  }
  .lc-row {
    display: grid !important;
    grid-template-columns: 56px 1fr 80px 64px !important;
    flex-wrap: unset !important;
  }
  .lc-col-data, .lc-col-desc, .lc-col-cat, .lc-col-val {
    order: unset !important;
    flex: unset !important;
    padding-top: 0 !important;
  }

  /* Barra de teto sem alertas visuais desnecessários */
  .teto-card { border-left: 2px solid #333 !important; }

  /* Garantir cores legíveis no papel */
  .c-green { color: #1a7a45 !important; -webkit-print-color-adjust: exact; }
  .c-red   { color: #c41c1c !important; -webkit-print-color-adjust: exact; }
  .c-purple { color: #6d28d9 !important; -webkit-print-color-adjust: exact; }
}
</style>
