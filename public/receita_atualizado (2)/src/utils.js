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
