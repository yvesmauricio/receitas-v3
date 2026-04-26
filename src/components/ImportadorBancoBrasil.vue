<template>
  <div class="importador-wrap">
    <section class="hero-card">
      <div class="hero-icon bb">
        <i class="fas fa-file-csv"></i>
      </div>
      <div class="hero-body">
        <h3>Importar extrato do Banco do Brasil</h3>
        <p>
          Selecione o CSV da conta corrente do BB para importar entradas, PIX, compras no cartão
          e pagamentos sem duplicar lançamentos já registrados.
        </p>
      </div>
    </section>

    <section class="sheet-card">
      <div class="sheet-body">
        <div class="fg">
          <label class="label">Conta de destino</label>
          <select v-model="contaSelecionadaId" class="input" :disabled="importando">
            <option value="">Selecione uma conta Banco do Brasil</option>
            <option v-for="conta in contasBb" :key="conta.id" :value="conta.id">
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
          <div class="upload-icon bb">
            <i class="fas" :class="importando ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'"></i>
          </div>
          <div class="upload-copy">
            <strong>{{ importando ? 'Importando extrato...' : 'Escolher arquivo CSV' }}</strong>
            <span>{{ arquivoNome || 'Extrato conta corrente - MMYYYY.csv' }}</span>
          </div>
          <i class="fas fa-chevron-right upload-chevron"></i>
        </label>

        <div class="hint-box">
          <i class="fas fa-circle-info"></i>
          <span>Use o CSV exportado do Banco do Brasil. Linhas de saldo são ignoradas automaticamente.</span>
        </div>
      </div>
    </section>

    <section v-if="resultadoImportacao" class="sheet-card">
      <div class="sheet-body">
        <div class="section-head">
          <h4>Resumo da importação BB</h4>
          <span class="badge badge-blue">{{ resultadoImportacao.importadosCount }} novos</span>
        </div>
        <div class="result-grid">
          <div class="result-item">
            <span>Linhas lidas</span>
            <strong>{{ resultadoImportacao.recebidos }}</strong>
          </div>
          <div class="result-item">
            <span>Válidos</span>
            <strong>{{ resultadoImportacao.validos }}</strong>
          </div>
          <div class="result-item">
            <span>Duplicados</span>
            <strong>{{ resultadoImportacao.duplicados }}</strong>
          </div>
          <div class="result-item">
            <span>Importados</span>
            <strong class="c-green">{{ resultadoImportacao.importadosCount }}</strong>
          </div>
          <div class="result-item">
            <span>Entradas</span>
            <strong class="c-green">{{ R$(resultadoImportacao.receitasImportadas) }}</strong>
          </div>
          <div class="result-item">
            <span>Saídas</span>
            <strong class="c-red">{{ R$(resultadoImportacao.saidasImportadas) }}</strong>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar, parseValorBr, processarCsv } from '../utils.js'

const s = useStore()
const importando = ref(false)
const arquivoNome = ref('')
const resultadoImportacao = ref(null)
const contaSelecionadaId = ref('')
const contasBb = computed(() => s.getContasFinanceirasPorBanco('bb'))

watch(contasBb, (contas) => {
  if (!contaSelecionadaId.value && contas.length === 1) {
    contaSelecionadaId.value = contas[0].id
  }
}, { immediate: true })

const COLUNAS = {
  data: ['data'],
  lancamento: ['lancamento'],
  detalhes: ['detalhes'],
  valor: ['valor'],
  tipoLancamento: ['tipolancamento']
}

function normalizarCabecalho(valor) {
  return normalizar(valor).replace(/[^a-z0-9]/g, '')
}

function parseDataBr(valor) {
  const texto = String(valor || '').trim()
  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  const [, dia, mes, ano] = match
  if (dia === '00' || mes === '00' || ano === '0000') return ''
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
    return null
  }

  return {
    data: localizar(COLUNAS.data),
    lancamento: localizar(COLUNAS.lancamento),
    detalhes: localizar(COLUNAS.detalhes),
    valor: localizar(COLUNAS.valor),
    tipoLancamento: localizar(COLUNAS.tipoLancamento)
  }
}

function mapearTipoBb(lancamento, tipoLancamento, valor) {
  const base = normalizar(`${lancamento} ${tipoLancamento}`)
  if (base.includes('pix recebido') || base.includes('pix-recebido qr code')) return 'PIX recebido'
  if (base.includes('pix enviado')) return 'PIX enviado'
  if (base.includes('transferencia recebida')) return 'PIX recebido'
  if (base.includes('compra com cartao')) return 'Cartão de Débito'
  if (base.includes('pagto cartao credito')) return 'Pagamento Cartão de Crédito'
  if (base.includes('telefone pre pago')) return 'Recarga de Celular'
  return valor >= 0 ? 'PIX recebido' : 'PIX enviado'
}

function extrairLancamentos(linhas, colunas) {
  return linhas.flatMap((linha) => {
    const data = parseDataBr(linha[colunas.data])
    const lancamento = String(linha[colunas.lancamento] || '').trim()
    const detalhes = String(linha[colunas.detalhes] || '').trim()
    const valor = parseValorBr(linha[colunas.valor])
    const tipoLancamento = String(linha[colunas.tipoLancamento] || '').trim()

    if (!data || !lancamento) return []

    const lancamentoNorm = normalizar(lancamento)
    if (
      lancamentoNorm.includes('saldo do dia') ||
      lancamentoNorm.includes('saldo anterior') ||
      lancamentoNorm === 's a l d o'
    ) return []

    return [{
      data,
      tipo: mapearTipoBb(lancamento, tipoLancamento, valor),
      descricao: detalhes || lancamento,
      valor,
      banco: 'bb',
      conta_id: contaSelecionadaId.value
    }]
  })
}

async function onFileChange(event) {
  const arquivo = event.target.files?.[0]
  event.target.value = ''
  if (!arquivo) return
  if (!contaSelecionadaId.value) {
    s.notify('Selecione a conta do Banco do Brasil antes de importar o extrato.', 'warning')
    return
  }

  arquivoNome.value = arquivo.name
  importando.value = true
  resultadoImportacao.value = null

  try {
    const buffer = await arquivo.arrayBuffer()
    let texto = new TextDecoder('utf-8').decode(buffer)
    if (texto.includes('\uFFFD')) {
      texto = new TextDecoder('iso-8859-1').decode(buffer)
    }
    const linhas = processarCsv(texto)
    const primeiraLinha = linhas.find(linha => Object.values(linha || {}).some(Boolean)) || {}
    const colunas = detectarColunas(primeiraLinha)

    if (!colunas.data || !colunas.lancamento || !colunas.valor) {
      throw new Error('Nao encontrei as colunas principais no CSV do Banco do Brasil.')
    }

    const lancamentos = extrairLancamentos(linhas, colunas)
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

    s.notify(`BB: ${resumo.importadosCount} lancamento(s) importado(s)!`)
  } catch (error) {
    console.error(error)
    resultadoImportacao.value = null
    s.notify(error?.message || 'Nao foi possivel importar o extrato do Banco do Brasil.', 'error')
  } finally {
    importando.value = false
  }
}
</script>

<style scoped>
.importador-wrap { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.hero-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); }
.hero-card { display: flex; gap: 12px; padding: 16px; background: linear-gradient(145deg, #fff7cc, var(--surface)); }
.hero-icon { width: 48px; height: 48px; border-radius: var(--r-md); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
.hero-icon.bb { background: rgba(243, 188, 0, 0.2); color: #0f4ea8; }
.hero-body h3 { font-size: .98rem; color: var(--brown-dark); margin-bottom: 4px; }
.hero-body p { font-size: .82rem; color: var(--muted); line-height: 1.55; }
.upload-card { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px dashed var(--border); border-radius: var(--r-md); background: var(--bg); position: relative; overflow: hidden; }
.upload-card.busy { opacity: .7; pointer-events: none; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.upload-icon { width: 42px; height: 42px; border-radius: var(--r-md); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
.upload-icon.bb { background: #eaf1ff; color: #0f4ea8; }
.upload-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.upload-copy strong { font-size: .88rem; color: var(--text); }
.upload-copy span { font-size: .77rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upload-chevron { color: var(--muted); margin-left: auto; }
.hint-box { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: var(--r-md); background: var(--cream); color: var(--muted); font-size: .78rem; line-height: 1.5; }
.hint-box i { margin-top: 2px; color: #0f4ea8; }
.result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.result-item { padding: 10px; border-radius: var(--r-md); border: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; gap: 3px; }
.result-item span { font-size: .74rem; color: var(--muted); }
.result-item strong { font-size: .92rem; color: var(--text); font-family: var(--mono); }
.badge { display: inline-block; padding: 3px 8px; border-radius: var(--r-full); font-size: .72rem; font-weight: 700; }
.badge-blue { background: var(--blue-bg); color: var(--blue); }
.c-green { color: var(--green) !important; }
.c-red { color: var(--red) !important; }
</style>
