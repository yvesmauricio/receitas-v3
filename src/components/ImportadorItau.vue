<template>
  <div class="importador-wrap">
    <section class="hero-card">
      <div class="hero-icon">
        <i class="fas fa-file-pdf"></i>
      </div>
      <div class="hero-body">
        <h3>Importar extrato do Itaú</h3>
        <p>
          Selecione o PDF do extrato conta corrente Itaú para importar todos os PIX recebidos,
          compras, transferências e tarifas — sem duplicar lançamentos.
        </p>
      </div>
    </section>

    <section class="sheet-card">
      <div class="sheet-body">
        <div class="fg">
          <label class="label">Conta de destino</label>
          <select v-model="contaSelecionadaId" class="input" :disabled="importando">
            <option value="">Selecione uma conta Itaú</option>
            <option v-for="conta in contasItau" :key="conta.id" :value="conta.id">
              {{ conta.nome }} · {{ conta.titular || 'Sem titular' }}
            </option>
          </select>
        </div>

        <label class="upload-card" :class="{ busy: importando }">
          <input
            class="file-input"
            type="file"
            accept=".pdf,application/pdf"
            :disabled="importando"
            @change="onFileChange"
          />
          <div class="upload-icon itau">
            <i class="fas" :class="importando ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'"></i>
          </div>
          <div class="upload-copy">
            <strong>{{ importando ? 'Lendo PDF...' : 'Escolher PDF do Itaú' }}</strong>
            <span>{{ arquivoNome || 'extrato_conta_corrente.pdf' }}</span>
          </div>
          <i class="fas fa-chevron-right upload-chevron"></i>
        </label>

        <div class="hint-box">
          <i class="fas fa-circle-info"></i>
          <span>
            Gere o extrato no app ou site do Itaú em formato PDF. Todos os tipos de movimento são
            classificados automaticamente.
          </span>
        </div>
      </div>
    </section>

    <section v-if="resultadoImportacao" class="sheet-card">
      <div class="sheet-body">
        <div class="section-head">
          <h4>Resumo da importação Itaú</h4>
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
            <span>Receitas PIX</span>
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
import { ref, computed, watch } from 'vue'
import { useStore } from '../store.js'
import { R$ } from '../utils.js'

const s = useStore()
const importando = ref(false)
const arquivoNome = ref('')
const resultadoImportacao = ref(null)
const contaSelecionadaId = ref('')
const contasItau = computed(() => s.getContasFinanceirasPorBanco('itau'))

watch(contasItau, (contas) => {
  if (!contaSelecionadaId.value && contas.length === 1) {
    contaSelecionadaId.value = contas[0].id
  }
}, { immediate: true })

// ── Carregar pdf.js do CDN ──────────────────────────────────────
async function getPdfJs() {
  if (window._pdfjsLib) return window._pdfjsLib
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const lib = window.pdfjsLib
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      window._pdfjsLib = lib
      resolve(lib)
    }
    script.onerror = () => reject(new Error('Não foi possível carregar o leitor de PDF.'))
    document.head.appendChild(script)
  })
}

// ── Extrair texto de todas as páginas ──────────────────────────
async function extrairTextoPdf(arquivo) {
  const pdfjsLib = await getPdfJs()
  const arrayBuffer = await arquivo.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let texto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    texto += pageText + '\n'
  }
  return texto
}

// ── Parser do extrato Itaú ─────────────────────────────────────
// Formato: DD/MM/YYYY DESCRIÇÃO VALOR
// Valor pode ser negativo. Separador decimal: vírgula. Ex: -1.400,00 ou 39,42
const RX_LINHA = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s*([-]?\d{1,3}(?:\.\d{3})*,\d{2})(?=\s|$)/g

function parseValorItau(texto) {
  const limpo = texto.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(limpo)
  return Number.isFinite(n) ? n : null
}

function parseDataItau(texto) {
  const [dia, mes, ano] = texto.split('/')
  return `${ano}-${mes}-${dia}`
}

// Mapeamento de prefixos Itaú → tipo compatível com o store
function mapearTipo(descricao, valor) {
  const d = descricao.toLowerCase()
  if (d.startsWith('pix transf') || d.startsWith('pix qrs')) {
    return valor >= 0 ? 'PIX recebido' : 'PIX enviado'
  }
  if (d.startsWith('rshop') || d.startsWith('debito')) return 'Cartão de Débito'
  if (d.startsWith('rend')) return 'Rendimento'
  if (d.startsWith('tar') || d.startsWith('tarifa')) return 'Tarifa bancária'
  if (d.startsWith('ted') || d.startsWith('doc')) return valor >= 0 ? 'PIX recebido' : 'PIX enviado'
  if (d.startsWith('cheque')) return 'Cheque'
  return valor >= 0 ? 'PIX recebido' : 'PIX enviado'
}

function parsearLinhasItau(texto) {
  // Normalizar texto: remover quebras desnecessárias, juntar texto extraído por página
  const normalizado = texto.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ')

  const lancamentos = []
  let match
  RX_LINHA.lastIndex = 0

  while ((match = RX_LINHA.exec(normalizado)) !== null) {
    const [, dataBr, descricao, valorStr] = match
    const descricaoLimpa = descricao.trim()

    // Ignorar linhas de saldo do dia e cabeçalho
    if (
      descricaoLimpa.toLowerCase().includes('saldo do dia') ||
      descricaoLimpa.toLowerCase().includes('saldo em conta') ||
      descricaoLimpa.toLowerCase().includes('limite da conta')
    ) continue

    const valor = parseValorItau(valorStr)
    if (valor === null) continue

    const data = parseDataItau(dataBr)
    const tipo = mapearTipo(descricaoLimpa, valor)

    lancamentos.push({
      data,
      descricao: descricaoLimpa.toUpperCase(),
      valor,
      tipo,
      banco: 'itau'
    })
  }

  return lancamentos
}

// ── Handler principal ───────────────────────────────────────────
async function onFileChange(event) {
  const arquivo = event.target.files?.[0]
  event.target.value = ''
  if (!arquivo) return
  if (!contaSelecionadaId.value) {
    s.notify('Selecione a conta Itaú antes de importar o extrato.', 'warning')
    return
  }

  arquivoNome.value = arquivo.name
  importando.value = true
  resultadoImportacao.value = null

  try {
    s.notify('Lendo PDF do Itaú...', 'success', 4000)
    const texto = await extrairTextoPdf(arquivo)
    const lancamentos = parsearLinhasItau(texto).map(item => ({
      ...item,
      conta_id: contaSelecionadaId.value
    }))

    if (!lancamentos.length) {
      s.notify('Nenhum lançamento encontrado no PDF. Verifique se é o extrato conta corrente.', 'error')
      return
    }

    const resumo = await s.importarLancamentosFinanceiros(lancamentos)
    resultadoImportacao.value = resumo

    if (!resumo.validos) {
      s.notify('Nenhum lançamento válido encontrado.', 'warning')
      return
    }
    if (resumo.importadosCount === 0) {
      s.notify('Todos os lançamentos já estavam registrados.', 'warning')
      return
    }
    s.notify(`Itaú: ${resumo.importadosCount} lançamento(s) importado(s)!`, 'success')
  } catch (error) {
    console.error(error)
    s.notify(error?.message || 'Erro ao ler o PDF do Itaú.', 'error')
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
.hero-card {
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(145deg, #eff6ff, var(--surface));
}

.hero-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--r-md);
  background: rgba(29, 78, 216, 0.12);
  color: var(--blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.hero-body h3 {
  font-size: .98rem;
  color: var(--blue);
  margin-bottom: 4px;
}

.hero-body p {
  font-size: .82rem;
  color: var(--muted);
  line-height: 1.55;
}
.upload-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1.5px dashed var(--border2);
  border-radius: var(--r-md);
  background: var(--cream);
  position: relative;
  cursor: pointer;
}

.upload-card.busy {
  opacity: .8;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
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

.upload-icon.itau {
  color: var(--blue);
  background: var(--blue-bg);
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

.upload-copy span {
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
  color: var(--blue);
  font-size: .78rem;
  line-height: 1.5;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.result-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 12px;
}

.result-item span {
  display: block;
  font-size: .68rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 4px;
}

.result-item strong {
  font-family: var(--mono);
  font-size: 1rem;
  color: var(--brown);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-size: .75rem;
  font-weight: 700;
}

.badge-blue {
  background: var(--blue-bg);
  color: var(--blue);
}

.c-green { color: var(--green); }
.c-red   { color: var(--red); }
</style>
