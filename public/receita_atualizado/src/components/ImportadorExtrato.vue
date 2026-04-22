<template>
  <div class="importador-wrap">
    <section class="hero-card">
      <div class="hero-icon">
        <i class="fas fa-file-csv"></i>
      </div>
      <div class="hero-body">
        <h3>Importar extrato do PagBank</h3>
        <p>
          Selecione o CSV para localizar recebimentos via PIX, evitar duplicidades e salvar tudo
          offline neste aparelho.
        </p>
      </div>
    </section>

    <section class="sheet-card">
      <div class="sheet-body">
        <div class="fg">
          <label class="label">Conta de destino</label>
          <select v-model="contaSelecionadaId" class="input" :disabled="importando">
            <option value="">Selecione uma conta PagBank</option>
            <option v-for="conta in contasPagbank" :key="conta.id" :value="conta.id">
              {{ conta.nome }} · {{ conta.titular || 'Sem titular' }}
            </option>
          </select>
        </div>

        <label class="upload-card" :class="{ busy: importando }">
          <input
            class="file-input"
            type="file"
            accept=".csv,text/csv"
            :disabled="importando"
            @change="onFileChange"
          />
          <div class="upload-icon">
            <i class="fas" :class="importando ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'"></i>
          </div>
          <div class="upload-copy">
            <strong>{{ importando ? 'Importando extrato...' : 'Escolher arquivo CSV' }}</strong>
            <span>{{ arquivoNome || 'PagBank exportado em CSV' }}</span>
          </div>
          <i class="fas fa-chevron-right upload-chevron"></i>
        </label>

        <div class="hint-box">
          <i class="fas fa-circle-info"></i>
          <span>O extrato inteiro é importado e classificado para separar vendas, despesas, moradia e uso pessoal.</span>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">Lançamentos</span>
        <strong class="stat-value">{{ s.financeiro.length }}</strong>
      </article>
      <article class="stat-card highlight">
        <span class="stat-label">Receita MEI em {{ anoAtual }}</span>
        <strong class="stat-value c-green">{{ R$(s.totalRecebidoAnoAtual) }}</strong>
      </article>
    </section>

    <section v-if="resultadoImportacao" class="sheet-card">
      <div class="sheet-body">
        <div class="section-head">
          <h4>Resumo da última importação</h4>
          <span class="badge badge-green">{{ resultadoImportacao.importadosCount }} novos</span>
        </div>

        <div class="result-grid">
          <div class="result-item">
            <span>Lidas</span>
            <strong>{{ resultadoImportacao.recebidos }}</strong>
          </div>
          <div class="result-item">
            <span>Válidas</span>
            <strong>{{ resultadoImportacao.validos }}</strong>
          </div>
          <div class="result-item">
            <span>Duplicadas</span>
            <strong>{{ resultadoImportacao.duplicados }}</strong>
          </div>
          <div class="result-item">
            <span>Total salvo</span>
            <strong class="c-green">{{ R$(resultadoImportacao.totalImportado) }}</strong>
          </div>
          <div class="result-item">
            <span>Receitas</span>
            <strong class="c-green">{{ R$(resultadoImportacao.receitasImportadas) }}</strong>
          </div>
          <div class="result-item">
            <span>Saídas</span>
            <strong class="c-red">{{ R$(resultadoImportacao.saidasImportadas) }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="sheet-card">
      <div class="sheet-body">
        <div class="section-head">
          <h4>Resumo por categoria</h4>
          <span class="badge badge-gold">{{ resumoCategorias.length }} grupos</span>
        </div>

        <div v-if="!resumoCategorias.length" class="empty-mini">
          Importe um extrato para começar a acompanhar receitas e despesas.
        </div>

        <div v-else class="report-list">
          <div v-for="item in resumoCategorias.slice(0, 8)" :key="item.categoria" class="report-row">
            <div>
              <div class="report-month">{{ item.categoria }}</div>
              <div class="report-sub">{{ item.quantidade }} lançamento(s) • {{ labelNatureza(item.natureza) }}</div>
            </div>
            <strong class="report-value">{{ R$(item.total) }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="sheet-card">
      <div class="sheet-body">
        <div class="section-head">
          <h4>Relatório mensal do MEI</h4>
          <span class="badge badge-blue">{{ relatorioMensal.length }} meses</span>
        </div>

        <div v-if="!relatorioMensal.length" class="empty-mini">
          O relatório mensal aparece assim que o extrato for importado.
        </div>

        <div v-else class="mei-grid">
          <article v-for="item in relatorioMensal" :key="item.mes_ref" class="mei-card">
            <div class="mei-head">
              <h4>{{ item.mes_ref }}</h4>
              <span class="badge badge-muted">{{ item.quantidade }} itens</span>
            </div>
            <div class="mei-line">
              <span>Faturamento (PJ)</span>
              <strong class="c-green">{{ R$(item.pj_receita) }}</strong>
            </div>
            <div class="mei-line">
              <span>Custos Prod. (PJ)</span>
              <strong class="c-red">{{ R$(item.pj_custos) }}</strong>
            </div>
            <div class="mei-line">
              <span>Renda Família</span>
              <strong>{{ R$(item.pessoal_rendas) }}</strong>
            </div>
            <div class="mei-line total">
              <span>Sobra Real Família</span>
              <strong :class="item.pessoal_saldo >= 0 ? 'c-blue' : 'c-red'">{{ R$(item.pessoal_saldo) }}</strong>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="ultimosLancamentos.length" class="sheet-card">
      <div class="sheet-body">
        <div class="section-head">
          <h4>Últimos lançamentos</h4>
          <span class="badge badge-blue">{{ ultimosLancamentos.length }} itens</span>
        </div>

        <div class="report-list">
          <div 
            v-for="item in ultimosLancamentos" 
            :key="item.hash_duplicidade" 
            class="entry-row"
            @click="emit('editar-lancamento', item)"
            style="cursor: pointer; transition: background 0.2s;"
            @mouseenter="$event.currentTarget.style.background = 'var(--bg-hover)'"
            @mouseleave="$event.currentTarget.style.background = ''"
          >
            <div class="entry-main">
              <div class="entry-title">{{ item.descricao }}</div>
              <div class="entry-sub">{{ formatarData(item.data) }} • {{ item.categoria }} • {{ item.tipo }}</div>
            </div>
            <strong class="entry-value" :class="item.valor >= 0 ? 'c-green' : 'c-red'">{{ R$(Math.abs(item.valor)) }}</strong>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar } from '../utils.js'

const emit = defineEmits(['editar-lancamento'])
const s = useStore()
const importando = ref(false)
const arquivoNome = ref('')
const resultadoImportacao = ref(null)
const contaSelecionadaId = ref('')
const anoAtual = new Date().getFullYear()

const resumoCategorias = computed(() => s.resumoFinanceiroCategorias)
const relatorioMensal = computed(() => s.relatorioMensalMei)
const ultimosLancamentos = computed(() => s.financeiro.slice(0, 8))
const contasPagbank = computed(() => s.getContasFinanceirasPorBanco('pagbank'))

watch(contasPagbank, (contas) => {
  if (!contaSelecionadaId.value && contas.length === 1) {
    contaSelecionadaId.value = contas[0].id
  }
}, { immediate: true })

const COLUNAS = {
  data: ['data', 'datadatransacao', 'datadolancamento', 'datadomovimento', 'datahora', 'lancamento'],
  tipo: ['tipo', 'tipodatransacao', 'tipodolancamento', 'natureza'],
  descricao: ['descricao', 'descricaodatransacao', 'descricaodolancamento', 'historico', 'detalhes', 'titulo', 'transacao', 'tipodetransacao'],
  valor: ['valor', 'valorliquido', 'valorbruto', 'valortransacao', 'valordatransacao', 'montante', 'quantia']
}

function normalizarCabecalho(valor) {
  return normalizar(valor).replace(/[^a-z0-9]/g, '')
}

function formatarData(dataIso) {
  if (!dataIso) return ''
  const [ano, mes, dia] = dataIso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataIso
}

function labelNatureza(natureza) {
  return {
    entrada: 'entrada',
    operacional: 'operacional',
    pessoal: 'pessoal'
  }[natureza] || natureza
}

function parseValorBr(valor) {
  if (typeof valor === 'number') return valor
  const texto = String(valor || '').trim()
  if (!texto) return 0

  const negativo = texto.includes('-')
  const limpo = texto
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')

  const numero = Number(limpo)
  if (!Number.isFinite(numero)) return 0
  return negativo ? -Math.abs(numero) : numero
}

function parseDataBr(valor) {
  const texto = String(valor || '').trim()
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, ano, mes, dia] = iso
    return `${ano}-${mes}-${dia}`
  }
  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

function detectarColunas(linha) {
  const mapa = {}
  for (const chaveOriginal of Object.keys(linha || {})) {
    mapa[normalizarCabecalho(chaveOriginal)] = chaveOriginal
  }

  const localizar = (aliases) => {
    for (const alias of aliases) {
      if (mapa[alias]) return mapa[alias]
    }
    for (const alias of aliases) {
      const chave = Object.keys(mapa).find(item => item.includes(alias))
      if (chave) return mapa[chave]
    }
    return null
  }

  return {
    data: localizar(COLUNAS.data),
    tipo: localizar(COLUNAS.tipo),
    descricao: localizar(COLUNAS.descricao),
    valor: localizar(COLUNAS.valor)
  }
}

function extrairLancamentos(linhas, colunas) {
  return linhas.flatMap((linha) => {
    const data = parseDataBr(linha[colunas.data])
    const tipo = String(linha[colunas.tipo] || '').trim()
    const descricao = String(linha[colunas.descricao] || '').trim()
    const valor = parseValorBr(linha[colunas.valor])

    if (!data || !descricao || !tipo) return []
    return [{ data, tipo, descricao, valor }]
  })
}

function detectarDelimitador(texto) {
  const primeiraLinha = String(texto || '').split(/\r?\n/).find(Boolean) || ''
  const candidatos = [';', ',', '\t']
  let melhor = ';'
  let maiorScore = -1

  for (const delimitador of candidatos) {
    const score = primeiraLinha.split(delimitador).length
    if (score > maiorScore) {
      maiorScore = score
      melhor = delimitador
    }
  }

  return melhor
}

function dividirLinhaCsv(linha, delimitador) {
  const colunas = []
  let atual = ''
  let emAspas = false

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i]
    const prox = linha[i + 1]

    if (char === '"') {
      if (emAspas && prox === '"') {
        atual += '"'
        i += 1
      } else {
        emAspas = !emAspas
      }
      continue
    }

    if (char === delimitador && !emAspas) {
      colunas.push(atual)
      atual = ''
      continue
    }

    atual += char
  }

  colunas.push(atual)
  return colunas.map(item => item.trim())
}

async function lerArquivoCsv(arquivo) {
  const texto = await arquivo.text()
  const delimitador = detectarDelimitador(texto)
  const linhasBrutas = texto
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(linha => linha.trim())
    .filter(Boolean)

  if (linhasBrutas.length < 2) return []

  const cabecalhos = dividirLinhaCsv(linhasBrutas[0], delimitador)
  return linhasBrutas.slice(1).map((linha) => {
    const valores = dividirLinhaCsv(linha, delimitador)
    return cabecalhos.reduce((acc, chave, idx) => {
      acc[chave] = valores[idx] ?? ''
      return acc
    }, {})
  })
}

async function onFileChange(event) {
  const arquivo = event.target.files?.[0]
  event.target.value = ''
  if (!arquivo) return
  if (!contaSelecionadaId.value) {
    s.notify('Selecione a conta PagBank antes de importar o extrato.', 'warning')
    return
  }

  arquivoNome.value = arquivo.name
  importando.value = true

  try {
    const linhas = await lerArquivoCsv(arquivo)
    
    // Salvar conteúdo do CSV em cache para re-importação
    const csvConteudo = await arquivo.text()
    localStorage.setItem('pagbank_csv_cache', csvConteudo)
    localStorage.setItem('pagbank_csv_nome', arquivo.name)
    localStorage.setItem('pagbank_csv_data', new Date().toISOString())
    
    const primeiraLinha = linhas.find(linha => Object.values(linha || {}).some(Boolean)) || {}
    const colunas = detectarColunas(primeiraLinha)

    if (!colunas.data || !colunas.tipo || !colunas.descricao || !colunas.valor) {
      throw new Error('Nao encontrei as colunas DATA, TIPO, DESCRICAO e VALOR no CSV do PagBank.')
    }

    const lancamentos = extrairLancamentos(linhas, colunas).map(item => ({
      ...item,
      banco: 'pagbank',
      conta_id: contaSelecionadaId.value
    }))
    const resumo = await s.importarLancamentosFinanceiros(lancamentos)
    resultadoImportacao.value = resumo

    if (!resumo.validos) {
      s.notify('Nenhum lancamento valido foi encontrado nesse arquivo.', 'warning')
      return
    }

    if (resumo.importadosCount === 0) {
      s.notify('Os lancamentos desse extrato ja estavam registrados.', 'warning')
      return
    }

    s.notify(`Extrato importado com ${resumo.importadosCount} lancamento(s)!`)
  } catch (error) {
    console.error(error)
    resultadoImportacao.value = null
    s.notify(error?.message || 'Nao foi possivel importar o extrato.', 'error')
  } finally {
    importando.value = false
  }
}
</script>

<style scoped>
.importador-wrap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-card,
.sheet-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
}

.hero-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(145deg, var(--gold-bg), var(--surface));
}

.hero-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--r-md);
  background: rgba(200, 137, 10, 0.16);
  color: var(--gold-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.hero-body h3 {
  font-size: .98rem;
  color: var(--brown-dark);
  margin-bottom: 4px;
}

.hero-body p {
  font-size: .82rem;
  color: var(--muted);
  line-height: 1.55;
}

.sheet-body {
  padding: 14px;
}

.fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.label { font-size: .76rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--bg); color: var(--text); font-size: .85rem; }

.upload-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1.5px dashed var(--border2);
  border-radius: var(--r-md);
  background: var(--cream);
  position: relative;
}

.upload-card.busy {
  opacity: .8;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.upload-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--brown-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.upload-copy strong {
  font-size: .9rem;
  color: var(--brown-dark);
}

.upload-copy span,
.hint-box span,
.report-sub,
.entry-sub,
.empty-mini {
  font-size: .78rem;
  color: var(--muted);
  line-height: 1.5;
}

.upload-chevron {
  margin-left: auto;
  color: var(--border2);
  font-size: .8rem;
}

.hint-box {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: var(--brown-mid);
}

.stats-grid,
.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat-card,
.result-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 14px 12px;
}

.stat-card.highlight {
  background: var(--green-bg);
  border-color: var(--green-dim);
}

.stat-label,
.result-item span {
  display: block;
  font-size: .68rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 4px;
}

.stat-value,
.result-item strong,
.report-value,
.entry-value {
  font-family: var(--mono);
  font-size: 1rem;
  color: var(--brown);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-head h4 {
  font-size: .9rem;
  color: var(--brown-dark);
}

.report-list {
  display: flex;
  flex-direction: column;
}

.mei-grid {
  display: grid;
  gap: 10px;
}

.mei-card {
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 12px;
  background: var(--cream);
}

.mei-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.mei-head h4 {
  font-size: .92rem;
  color: var(--brown-dark);
}

.mei-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: .82rem;
  color: var(--text);
}

.mei-line strong {
  font-family: var(--mono);
  font-size: .9rem;
}

.mei-line.total {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-weight: 700;
}

.report-row,
.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.report-row:first-child,
.entry-row:first-child {
  border-top: none;
  padding-top: 0;
}

.report-row:last-child,
.entry-row:last-child {
  padding-bottom: 0;
}

.report-month,
.entry-title {
  font-size: .9rem;
  font-weight: 700;
  color: var(--text);
}

.entry-main {
  min-width: 0;
}

.entry-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-mini {
  padding: 8px 0 2px;
}

@media (min-width: 420px) {
  .importador-wrap {
    padding: 18px;
  }

  .mei-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
