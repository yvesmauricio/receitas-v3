export const R$ = (v, compact = false) => {
  const n = Number(v || 0)
  if (compact && Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k'
  return  n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const maskMoney = (v) => {
  let val = typeof v === 'number' 
    ? v.toFixed(2).replace(/\D/g, "") 
    : String(v || "").replace(/\D/g, "")

  if (!val) return "0,00"
  val = (Number(val) / 100).toFixed(2).replace(".", ",")
  return val.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export const parseMoney = (v) => {
  if (!v) return 0
  return Number(String(v).replace(/\D/g, "")) / 100
}

export const dataHoraBR = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export const fmtQtd = (v, u = '') => {
  const n = Number(v || 0)
  return (n % 1 === 0 ? n : n.toFixed(2)) + (u ? ' ' + u : '')
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
