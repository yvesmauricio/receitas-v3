<template>
  <section class="sheet-card">
    <div class="sheet-body">
      <div class="section-head">
        <h4><i class="fas fa-file-import"></i> Importar de Outro Banco</h4>
      </div>

      <div class="import-form">
        <p class="hint-box">
          <i class="fas fa-circle-info"></i>
          Cole aqui o extrato do seu outro banco em formato texto (data | descrição | valor)
        </p>

        <textarea
          v-model="textoExtrato"
          :disabled="importando"
          placeholder="Cole o extrato em texto aqui..."
          class="textarea-extrato"
        ></textarea>

        <button
          @click="importarTexto"
          :disabled="!textoExtrato.trim() || importando"
          class="btn-import"
        >
          <i class="fas" :class="importando ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
          {{ importando ? 'Processando...' : 'Importar Extrato' }}
        </button>

        <div v-if="resultadoImportacao" class="resultado">
          <div class="resultado-header" :class="resultadoImportacao.importados > 0 ? 'success' : 'warning'">
            <span v-if="resultadoImportacao.importados > 0">
              ✓ {{ resultadoImportacao.importados }} lançamento(s) importado(s)
            </span>
            <span v-else>
              ⚠ Nenhum lançamento foi importado
            </span>
          </div>
          <div class="resultado-grid">
            <div class="resultado-item">
              <span>Processadas</span>
              <strong>{{ resultadoImportacao.processadas }}</strong>
            </div>
            <div class="resultado-item">
              <span>Válidas</span>
              <strong>{{ resultadoImportacao.validas }}</strong>
            </div>
            <div class="resultado-item">
              <span>Duplicadas</span>
              <strong>{{ resultadoImportacao.duplicadas }}</strong>
            </div>
            <div class="resultado-item">
              <span>Total</span>
              <strong class="c-green">{{ R$(resultadoImportacao.totalImportado) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from '../store.js'
import { R$ } from '../utils.js'

const s = useStore()
const textoExtrato = ref('')
const importando = ref(false)
const resultadoImportacao = ref(null)

function parseLinhaExtrato(linha) {
  if (!linha.trim()) return null

  // Remover espaços múltiplos
  linha = linha.trim().replace(/\s+/g, ' ')

  // Padrão: começa com data (DD/MM/YYYY ou YYYY-MM-DD), termina com valor (número com vírgula ou ponto)
  const padraoData = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/
  const padraoValor = /([-]?\d+[,\.]\d{2})$/

  const matchData = linha.match(padraoData)
  const matchValor = linha.match(padraoValor)

  if (!matchData || !matchValor) return null

  const dataTxt = matchData[1]
  const valorTxt = matchValor[1].replace(',', '.')
  const valor = parseFloat(valorTxt)

  if (!Number.isFinite(valor)) return null

  // Extrair descrição (entre data e valor)
  const dataLen = dataTxt.length
  const valorLen = valorTxt.length
  const descricao = linha
    .substring(dataLen, linha.length - valorLen)
    .trim()

  if (!descricao) return null

  // Converter data para ISO (YYYY-MM-DD)
  let dataFormatada
  if (dataTxt.includes('/')) {
    const [dia, mes, ano] = dataTxt.split('/')
    dataFormatada = `${ano}-${mes}-${dia}`
  } else {
    dataFormatada = dataTxt
  }

  // Detectar tipo baseado na descrição
  const descNorm = descricao.toLowerCase()
  let tipo = 'Cartão de Débito'
  
  if (descNorm.includes('pix') || descNorm.includes('transf') || descNorm.includes('qrs')) {
    tipo = valor > 0 ? 'PIX recebido' : 'PIX enviado'
  }

  return {
    data: dataFormatada,
    descricao: descricao.toUpperCase(),
    valor: valor,
    tipo: tipo
  }
}

async function importarTexto() {
  importando.value = true
  resultadoImportacao.value = null

  try {
    const linhas = textoExtrato.value.split('\n').filter(l => l.trim())
    
    const lancamentos = []
    let processadas = 0

    for (const linha of linhas) {
      processadas++
      const parsedLancamento = parseLinhaExtrato(linha)
      
      if (parsedLancamento) {
        lancamentos.push(parsedLancamento)
      }
    }

    if (!lancamentos.length) {
      s.notify('Nenhum lançamento válido encontrado no texto.', 'warning')
      resultadoImportacao.value = {
        processadas,
        validas: 0,
        duplicadas: 0,
        importados: 0,
        totalImportado: 0
      }
      return
    }

    // Importar para o banco
    const resumo = await s.importarLancamentosFinanceiros(lancamentos)

    resultadoImportacao.value = {
      processadas,
      validas: resumo.validos,
      duplicadas: resumo.duplicados,
      importados: resumo.importados,
      totalImportado: resumo.totalImportado
    }

    if (resumo.importados > 0) {
      s.notify(`${resumo.importados} lançamento(s) importado(s) com sucesso!`, 'success', 3000)
      textoExtrato.value = ''
      await s.carregarFinanceiro()
    } else {
      s.notify('Os lançamentos já estavam no sistema.', 'warning')
    }
  } catch (error) {
    console.error(error)
    s.notify('Erro ao importar extrato: ' + error.message, 'error')
  } finally {
    importando.value = false
  }
}
</script>

<style scoped>
.import-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: var(--gold-bg);
  color: var(--gold-dark);
  border-radius: var(--r-sm);
  font-size: 0.85rem;
  margin: 0;
}

.hint-box i {
  flex-shrink: 0;
  margin-top: 2px;
}

.textarea-extrato {
  padding: 10px;
  font-family: monospace;
  font-size: 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg);
  color: var(--text);
  min-height: 150px;
  resize: vertical;
  transition: border-color var(--t);
}

.textarea-extrato:focus {
  outline: none;
  border-color: var(--brown);
}

.textarea-extrato:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-import {
  padding: 10px 16px;
  background: var(--brown);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background var(--t), transform var(--t);
}

.btn-import:active:not(:disabled) {
  background: var(--brown-dark);
  transform: scale(0.98);
}

.btn-import:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.resultado {
  padding: 12px;
  background: var(--surface);
  border-radius: var(--r-sm);
  border-left: 4px solid var(--green);
}

.resultado.warning {
  border-left-color: var(--gold-dark);
}

.resultado-header {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.95rem;
  color: var(--green);
}

.resultado-header.warning {
  color: var(--gold-dark);
}

.resultado-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  font-size: 0.85rem;
}

.resultado-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resultado-item span {
  color: var(--muted);
  font-size: 0.8rem;
}

.resultado-item strong {
  color: var(--text);
  font-size: 1.1rem;
}

.c-green {
  color: var(--green);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-head h4 {
  margin: 0;
  font-size: 0.95rem;
}

.section-head i {
  color: var(--brown);
}
</style>
