const moneyFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const R$ = (v, compact = false) => {
  const n = Number(v || 0)
  if (compact && Math.abs(n) >= 1000) {
    return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  }
  return moneyFmt.format(n)
}

export const maskMoney = (v) => {
  return R$(typeof v === 'number' ? v : parseMoney(v))
}

export const parseMoney = (v) => {
  if (!v) return 0
  return Number(String(v).replace(/\D/g, "")) / 100
}

export const dataHoraBR = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

export const fmtQtd = (v, u = '') => {
  const n = Number(v || 0)
  const fmt = n.toLocaleString('pt-BR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })
  return fmt + (u ? ' ' + u : '')
}

export const formatarData = (dataIso) => {
  if (!dataIso) return ''
  const [ano, mes, dia] = dataIso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataIso
}

export const labelNatureza = (n) => {
  return { entrada: '↑ Receita', operacional: '↓ Operacional', pessoal: '↓ Pessoal', interna: '⇄ Interna' }[n] || n
}

/** Converte valores monetários BR (R$ 1.234,56 ou -1.234,56) para Number */
export const parseValorBr = (valor) => {
  if (typeof valor === 'number') return valor
  const texto = String(valor || '').trim()
  if (!texto) return 0
  const negativo = texto.includes('-')
  const limpo = texto.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const numero = Number(limpo.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(numero)) return 0
  return negativo ? -Math.abs(numero) : numero
}

/** Detecta delimitador de CSV (ponto-e-vírgula, vírgula ou tab) */
export const detectarDelimitadorCsv = (texto) => {
  const primeiraLinha = String(texto || '').split(/\r?\n/).find(Boolean) || ''
  const candidatos = [';', ',', '\t']
  let melhor = ';', maiorScore = -1
  for (const d of candidatos) {
    const score = primeiraLinha.split(d).length
    if (score > maiorScore) { maiorScore = score; melhor = d }
  }
  return melhor
}

/** Divide linha de CSV respeitando campos entre aspas */
export const dividirLinhaCsv = (linha, delimitador) => {
  const colunas = []
  let atual = '', emAspas = false
  for (let i = 0; i < linha.length; i++) {
    const char = linha[i], prox = linha[i + 1]
    if (char === '"') {
      if (emAspas && prox === '"') { atual += '"'; i++ }
      else emAspas = !emAspas
      continue
    }
    if (char === delimitador && !emAspas) { colunas.push(atual); atual = '' }
    else atual += char
  }
  colunas.push(atual)
  return colunas.map(item => item.trim())
}

/** Processa o conteúdo de um arquivo CSV e retorna array de objetos */
export const processarCsv = (texto) => {
  const delimitador = detectarDelimitadorCsv(texto)
  const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (linhas.length < 2) return []
  const cabecalhos = dividirLinhaCsv(linhas[0], delimitador)
  return linhas.slice(1).map(linha => {
    const valores = dividirLinhaCsv(linha, delimitador)
    return cabecalhos.reduce((acc, chave, idx) => {
      acc[chave] = valores[idx] ?? ''
      return acc
    }, {})
  })
}

/** Máscara para CPF: 000.000.000-00 */
export const maskCpf = (v) => {
  v = String(v || '').replace(/\D/g, '')
  if (v.length > 11) v = v.slice(0, 11)
  return v.replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** Máscara para CNPJ: 00.000.000/0000-00 */
export const maskCnpj = (v) => {
  v = String(v || '').replace(/\D/g, '')
  if (v.length > 14) v = v.slice(0, 14)
  return v.replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Máscara para CNAE: 0000-0/00 */
export const maskCnae = (v) => {
  v = String(v || '').replace(/\D/g, '')
  if (v.length > 7) v = v.slice(0, 7)
  return v.replace(/(\d{4})(\d)/, '$1-$2')
          .replace(/(\d{4})-(\d)(\d{1,2})$/, '$1-$2/$3')
}

export const isInsumoSemPeso = (nome) => {
  const chave = normalizar(nome)
  return ['etiqueta', 'embalagem', 'rotulo', 'rótulo', 'fita', 'laco', 'laço', 'caixa', 'sacola'].some(term => chave.includes(term))
}

export const fmtMoedaLonga = (v) => {
  const n = Number(v || 0)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
}

export const normalizar = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// Data ISO para datetime-local input
export const nowLocal = () => {
  const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const CORES = ['#7a4a1e','#0f766e','#1d4ed8','#7c3aed','#c45a09','#1a7a45','#b91c1c']
export const avatarColor = (nome) => {
  let h = 0; for (const c of String(nome || '')) h = (h * 31 + c.charCodeAt(0)) & 0xff
  return CORES[h % CORES.length]
}
