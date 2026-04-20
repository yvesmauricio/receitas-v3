<template>
  <div class="tab-cozinha view-maximized">
    <header class="view-header">
      <button class="view-back-btn" @click="s.setTab('producao')" aria-label="Voltar">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h2 class="view-title"><i class="fas fa-utensils"></i> Cozinha</h2>
      <div class="spacer"></div>
      <button v-if="lote.length" class="view-action-btn" @click="limparLote" title="Limpar Lote">
        <i class="fas fa-trash-alt"></i>
      </button>
    </header>

    <div class="modal-filter-bar">
      <div ref="chipsEl" class="modal-chips">
        <button 
          v-for="c in categorias" 
          :key="c" 
          class="chip" 
          :class="{ active: catAtiva === c }"
          :ref="el => setChipRef(el, c)"
          @click="catAtiva = c"
        >{{ c }}</button>
      </div>
    </div>

    <div
      class="view-body"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
      @touchcancel="resetTouch"
    >
      <div class="quick-add-grid">
        <button
          v-for="r in receitasFiltradas"
          :key="r.uuid"
          class="qa-btn"
          :class="{ 'qa-btn--inlote': qtdNoLote[r.uuid] }"
          @click="onBtnClick(r, $event)"
          @pointerdown="iniciarLongPress(r, $event)"
          @pointerup="cancelarLongPress"
          @pointercancel="cancelarLongPress"
          @contextmenu.prevent
        >
          <span v-if="qtdNoLote[r.uuid]" class="qa-badge">{{ qtdNoLote[r.uuid] }}</span>
          <span class="qa-name">{{ r.nome }}</span>
          <div v-if="normalizar(r.nome).includes('trufa')" class="badge-shortcut">+1 Forma</div>
          <div v-else class="badge-shortcut">+{{ r.rendimento }} {{ r.unidade_rendimento }}</div>
        </button>
      </div>

      <div v-if="lote.length" class="batch-content">
        <div class="section-label">📋 Itens no Lote</div>
        <div class="planned-items">
          <div v-for="(item, idx) in lote" :key="idx" class="plan-group">
            <div class="plan-card">
              <div class="plan-info" @click="item.aberto = !item.aberto">
                <div class="plan-name">
                  <i class="fas" :class="item.aberto ? 'fa-chevron-down' : 'fa-chevron-right'" style="font-size: 0.7rem; margin-right: 4px; color: var(--gold-dark)"></i>
                  {{ item.nome }}
                </div>
                <div class="plan-sub">
                  <strong style="color: var(--brown-dark)">{{ fmtQ(item.peso_total, 'g') }}</strong> • {{ item.qtd_produzir }} {{ item.unidade }}
                </div>
              </div>
              <div class="qty-ctrl-sm">
                <button class="btn-qty-sm" @click="ajustarQtd(idx, -1)">-</button>
                <input type="number" class="qty-input-cozinha" :value="item.qtd_produzir" @change="e => atualizarQtdManual(idx, e.target.value)" inputmode="decimal" />
                <button class="btn-qty-sm" @click="ajustarQtd(idx, 1)">+</button>
              </div>
            </div>
            <div v-if="item.aberto" class="plan-details">
              <div v-for="ing in calcularIngredientesItem(item)" :key="ing.id" class="plan-ing-row">
                <div class="plan-ing-info">
                  <span class="plan-ing-nome">{{ ing.nome }}</span>
                  <span class="plan-ing-qtd">{{ fmtQ(ing.total, ing.unidade) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sheet-card mt-16">
          <div class="sheet-body">
            <div class="section-label">🥣 Total para pesar (Consolidado)</div>
            <div class="checklist">
              <div v-for="ing in ingredientesAgrupados" :key="ing.id" class="check-item" :class="{ 'done': checklist[ing.id] }" @click="checklist[ing.id] = !checklist[ing.id]">
                <div class="check-box"><i class="fas" :class="checklist[ing.id] ? 'fa-check-square' : 'fa-square'"></i></div>
                <div class="check-info">
                  <div class="check-main">
                    <div class="check-name">{{ ing.nome }}</div>
                    <div class="check-val">{{ fmtQ(ing.total, ing.unidade) }}</div>
                  </div>
                <div v-if="ing.subIngredientes" class="plan-sub-list" style="margin-left:0; margin-top:6px;">
                  <div v-for="sub in ing.subIngredientes" :key="sub.id" class="plan-sub-item">
                    <span>└ {{ sub.nome }}</span>
                    <span>{{ fmtQ(sub.total, sub.unidade) }}</span>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg btn-full mt-16 mb-32" @click="finalizarLote">
          <i class="fas fa-check-double"></i> Registrar Produção do Lote
        </button>
      </div>
      <div v-else class="empty">
        <i class="fas fa-mortar-pestle"></i>
        <h3>Lote Vazio</h3>
        <p>Adicione receitas acima para calcular o preparo total.</p>
      </div>
    </div>

<!-- MELHORIA 3: Feedbacks flutuantes (+12 un) -->
<Teleport to="body">
  <div
    v-for="fb in feedbacks"
    :key="fb.id"
    class="feedback-float"
    :style="{ left: fb.x + 'px', top: fb.y + 'px' }"
  >{{ fb.text }}</div>
</Teleport>

<!-- MELHORIA 1: Mini Stepper Flutuante (long press) -->
<Teleport to="body">
  <Transition name="stepper-anim">
    <div
      v-if="stepper.visible"
      class="stepper-popup"
      :style="{ left: stepper.x + 'px', top: stepper.y + 'px' }"
    >
      <button class="stepper-btn" @pointerdown.prevent="iniciarHoldMenos" @pointerup="pararHold" @pointerleave="pararHold">−</button>
      <span class="stepper-val">{{ stepper.qtd }}</span>
      <button class="stepper-btn" @click="stepperAjustar(1)">+</button>
    </div>
  </Transition>
</Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { useStore } from '../store.js'
import { fmtQtd as fmtQ, nowLocal, normalizar } from '../utils.js'
import { useConfirm } from '../composables/useConfirm.js'

const s = useStore()
const confirm = useConfirm()

const lote = ref([])
const checklist = reactive({})
const categorias = ['Todas', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']
const catAtiva = ref('Trufa')
const chipsEl = ref(null)
const chipRefs = ref({})
const touchStartX = ref(0)
const touchStartY = ref(0)

const holdInterval = ref(null)
const blockClick = ref(false) 
const holdSpeed = ref(300)

function iniciarHoldMenos() {
  if (!stepper.receita) return
  holdSpeed.value = 300
  holdInterval.value = -1 // Marca como ativo antes de começar
  function tick() {
    if (holdInterval.value === null) return // Se foi parado, não executa
    stepperAjustar(-1)
    if (holdInterval.value === null) return // Se o ajuste zerou a qtd e parou o hold, interrompe o loop
    // aceleração progressiva
    holdSpeed.value = Math.max(60, holdSpeed.value * 0.75)
    holdInterval.value = setTimeout(tick, holdSpeed.value)
  }
  tick()
}

function pararHold() {
  clearTimeout(holdInterval.value)
  holdInterval.value = null
}

const receitasFiltradas = computed(() => {
  const base = catAtiva.value === 'Todas'
    ? s.receitas
    : s.receitas.filter(r => r.categoria === catAtiva.value)
  return [...base].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
})

// MELHORIA 2: Mapa reativo de quantidades no lote
const qtdNoLote = computed(() => {
  const map = {}
  lote.value.forEach(item => { map[item.receita_id] = item.qtd_produzir })
  return map
})

// MELHORIA 3: Estado dos feedbacks flutuantes
const feedbacks = ref([])
let _feedbackId = 0

// MELHORIA 1: Estado do stepper flutuante
const longPressTimer = ref(null)
const longPressActive = ref(false)
const stepper = reactive({
  visible: false,
  receita: null,
  x: 0,
  y: 0,
  qtd: 0,
  inactivityTimer: null
})

function setChipRef(el, categoria) {
  if (el) chipRefs.value[categoria] = el
  else delete chipRefs.value[categoria]
}

function scrollCategoriaAtiva() {
  const chipEl = chipRefs.value[catAtiva.value]
  if (!chipEl) return
  chipEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

function navegarCategoria(delta) {
  const idxAtual = categorias.indexOf(catAtiva.value)
  if (idxAtual === -1) return

  const proxIdx = Math.min(categorias.length - 1, Math.max(0, idxAtual + delta))
  if (proxIdx === idxAtual) return

  catAtiva.value = categorias[proxIdx]
  if (navigator.vibrate) navigator.vibrate(8)
}

function onTouchStart(e) {
  if (e.touches.length !== 1) return
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

function onTouchEnd(e) {
  if (!touchStartX.value && !touchStartY.value) return

  const touch = e.changedTouches?.[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value
  const swipeHorizontal = Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2

  if (swipeHorizontal) navegarCategoria(deltaX < 0 ? 1 : -1)
  resetTouch()
}

function resetTouch() {
  touchStartX.value = 0
  touchStartY.value = 0
}

function getPassoProducao(r) {
  const nome = normalizar(r.nome)
  if (nome.includes('trufa')) {
    const peso = Number(r.peso_unitario || 0)
    if (peso >= 30) return 8 // Forma de 8 cavidades
    if (peso > 0) return 12  // Forma de 12 cavidades (19g ou menor)
  }
  return r.rendimento || 1
}

// ─── MELHORIA 3: Feedback visual (+N un) ─────────────────────────────────
function mostrarFeedback(r, e) {
  const el = e.target.closest('.qa-btn')
  if (!el) return
  const rect = el.getBoundingClientRect()
  const passo = getPassoProducao(r)
  const texto = normalizar(r.nome).includes('trufa')
    ? '+1 Forma'
    : `+${passo} ${r.unidade_rendimento}`
  const id = _feedbackId++
  feedbacks.value.push({
    id,
    text: texto,
    x: rect.left + rect.width / 2,
    y: rect.top + 8
  })
  setTimeout(() => {
    feedbacks.value = feedbacks.value.filter(f => f.id !== id)
  }, 750)
}

// ─── MELHORIA 1: Long press → Stepper flutuante ───────────────────────────
function onBtnClick(r, e) {
  if (longPressActive.value || blockClick.value) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  adicionarAoLote(r)
  mostrarFeedback(r, e)
}

function iniciarLongPress(r, e) {
  longPressActive.value = false

  longPressTimer.value = setTimeout(() => {
    longPressActive.value = true
    abrirStepper(r, e)
  }, 400)
}

function cancelarLongPress() {
  clearTimeout(longPressTimer.value)

  // 👇 NÃO reseta imediatamente
  // deixa o click morrer antes
  setTimeout(() => {
    longPressActive.value = false
    blockClick.value = false
  }, 250)
}

function abrirStepper(r, e) {
  if (navigator.vibrate) navigator.vibrate(10)

  document.removeEventListener('pointerdown', onDocPointerDown) // 🧠 limpa antes

  const el = e.target.closest('.qa-btn')
  if (!el) return

  const rect = el.getBoundingClientRect()

  stepper.receita = r
  stepper.qtd = qtdNoLote.value[r.uuid] || 0

  const popupH = 56
  stepper.x = Math.max(10, Math.min(rect.left + rect.width / 2 - 72, window.innerWidth - 160))
  stepper.y = rect.top - popupH - 8 > 10 ? rect.top - popupH - 8 : rect.bottom + 8

  stepper.visible = true
  resetStepperInactivity()

  document.addEventListener('pointerdown', onDocPointerDown)
}

function fecharStepper() {
  stepper.visible = false
  stepper.receita = null

  clearTimeout(stepper.inactivityTimer)
  document.removeEventListener('pointerdown', onDocPointerDown)
  pararHold()

  longPressActive.value = false

  // 🔒 bloqueia click fantasma
  blockClick.value = true
  setTimeout(() => blockClick.value = false, 200)
}

function onDocPointerDown(e) {
  if (!stepper.visible) return // 🔥 evita lixo pós-fechamento
  if (!e.target.closest('.stepper-popup')) {
    fecharStepper()
  }
}

function stepperAjustar(delta) {
  if (navigator.vibrate) navigator.vibrate(5)
  if (!stepper.receita) return
  if (delta > 0) {
      adicionarAoLote(stepper.receita)
  } else {
    const idx = lote.value.findIndex(i => i.receita_id === stepper.receita.uuid)
    if (idx >= 0) ajustarQtd(idx, -1) // reutiliza lógica existente
  }
  stepper.qtd = qtdNoLote.value[stepper.receita?.uuid] || 0
  if (stepper.qtd === 0) {
    pararHold() // 🔥 ADICIONA ISSO
    fecharStepper()
    return
  }
  resetStepperInactivity()
}

function resetStepperInactivity() {
  clearTimeout(stepper.inactivityTimer)
  stepper.inactivityTimer = setTimeout(fecharStepper, 2500)
}

function adicionarAoLote(r) {
  const existente = lote.value.find(item => item.receita_id === r.uuid)
  const passo = getPassoProducao(r)
  
  if (existente) {
    existente.qtd_produzir += passo
    existente.peso_total = existente.qtd_produzir * (existente.peso_unitario || 0)
  } else {
    lote.value.push({
      receita_id: r.uuid,
      nome: r.nome,
      qtd_produzir: passo,
      rendimento_base: r.rendimento || 1,
      unidade: r.unidade_rendimento,
      peso_unitario: r.peso_unitario || 0,
      peso_total: passo * (r.peso_unitario || 0),
      eh_intermediaria: r.eh_intermediaria,
      ingredientes: r.ingredientes || [],
      aberto: false
    })
  }
}

function ajustarQtd(idx, delta) {
  const item = lote.value[idx]
  const step = 1
  item.qtd_produzir = Math.max(0, item.qtd_produzir + (delta * step))
  item.peso_total = item.qtd_produzir * (item.peso_unitario || 0)
  if (item.qtd_produzir === 0) lote.value.splice(idx, 1)
}

function atualizarQtdManual(idx, valor) {
  const n = Number(String(valor).replace(',', '.'))
  if (isNaN(n) || n <= 0) {
    lote.value.splice(idx, 1)
    return
  }
  const item = lote.value[idx]
  item.qtd_produzir = n
  item.peso_total = n * (item.peso_unitario || 0)
}

function calcularIngredientesItem(item) {
  const fator = item.qtd_produzir / (item.rendimento_base || 1)
  const mapa = s.expandirIngredientes(item.ingredientes, fator)
  return Object.values(mapa)
}

const ingredientesAgrupados = computed(() => {
  let mapaGeral = {}
  lote.value.forEach(item => {
    const fator = item.qtd_produzir / (item.rendimento_base || 1)
    mapaGeral = s.expandirIngredientes(item.ingredientes, fator, mapaGeral)
  })
  return Object.values(mapaGeral).sort((a, b) => a.nome.localeCompare(b.nome))
})

async function finalizarLote() {
  // MELHORIA 5: Resumo detalhado antes de confirmar
  const linhas = lote.value.map(item => `• ${item.qtd_produzir} ${item.unidade}  —  ${item.nome}`)
  const totalItens = lote.value.reduce((acc, item) => acc + item.qtd_produzir, 0)
  const resumo = linhas.join('\n') + `\n\nTotal: ${totalItens} unidades`

  const ok = await confirm.ask(
    resumo,
    { title: `Registrar ${lote.value.length} receita${lote.value.length > 1 ? 's' : ''}?`, icon: 'fas fa-check-double', confirmLabel: 'Registrar', type: 'primary' }
  )
  if (!ok) return

  const data = nowLocal()
  const producoes = lote.value.map(item => ({
    receita_id: item.receita_id,
    receita_nome: item.nome,
    quantidade_produzida: item.qtd_produzir,
    unidade_rendimento: item.unidade,
    eh_intermediaria: item.eh_intermediaria,
    data_producao: data,
    // Salva os ingredientes como estavam no momento da produção
    ingredientes_snapshot: JSON.parse(JSON.stringify(item.ingredientes)),
    // Adicionando snapshot de custo para manter consistência com TabProducao
    custo_unitario_snapshot: (function() {
      const r = s.receitas.find(rec => rec.uuid === item.receita_id)
      if (!r) return 0
      return s.getCustoTotal(r) / (r.rendimento || 1)
    })()
  }))
  await s.registrarLoteProducao(producoes)
  limparLote()
  s.notify('Produção registrada!')
  s.setTab('producao')
}

function limparLote() {
  lote.value = []
  Object.keys(checklist).forEach(k => delete checklist[k])
}

watch(catAtiva, () => {
  nextTick(scrollCategoriaAtiva)
}, { immediate: true })
</script>

<style scoped>
/* ── Layout full-screen da tela de cozinha ── */
.view-maximized { position:fixed; inset:0; z-index:2000; background:var(--bg); display:flex; flex-direction:column; }
.view-header    { height:56px; background:var(--brown-dark); display:flex; align-items:center; padding:0 8px; flex-shrink:0; }
.view-back-btn  { width:48px; height:48px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:#fff; font-size:1.15rem; border-radius:50%; }
.view-title     { font-size:1.2rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:10px; letter-spacing:-.02em; }
.view-action-btn { width:48px; height:48px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:rgba(255,255,255,.85); font-size:1rem; }
.view-body      { flex:1; overflow-y:auto; padding-bottom:40px; }

/* ── Filtro de receitas no modal ── */
.modal-filter-bar { background:var(--surface); border-bottom:1px solid var(--border); padding:10px 0 0; flex-shrink:0; }
.modal-chips { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding:0 16px 12px; }
.modal-chips::-webkit-scrollbar { display:none; }

/* ── Grid de adição rápida ── */
.quick-add-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:8px; padding:16px; border-bottom:1px solid var(--border); }
.qa-btn         { position:relative; background:#fff; border:1px solid var(--border); border-radius:var(--r-md); padding:12px 8px; display:flex; flex-direction:column; align-items:center; gap:4px; box-shadow:var(--shadow-sm); cursor:pointer; user-select:none; -webkit-touch-callout:none; }
.qa-btn:active  { background:var(--gold-bg); transform:scale(.97); }
.qa-btn--inlote { border-color:var(--gold-dark); background:var(--gold-bg); }
.qa-name        { font-size:.85rem; font-weight:700; color:var(--brown); text-align:center; line-height:1.2; }
.qa-un          { font-size:.7rem; color:var(--gold-dark); font-weight:600; }
.qa-badge       { position:absolute; top:6px; right:6px; min-width:20px; height:20px; padding:0 5px; border-radius:10px; background:var(--gold-dark); color:#fff; font-size:.65rem; font-weight:800; display:flex; align-items:center; justify-content:center; pointer-events:none; }

/* ── Plano / itens do lote ── */
.plan-group    { margin-bottom:8px; border:1px solid var(--border); border-radius:var(--r-md); overflow:hidden; background:#fff; }
.planned-items { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
.plan-card     { background:#fff; border:1px solid var(--border); border-radius:var(--r-md); padding:10px 12px; display:flex; justify-content:space-between; align-items:center; }
.plan-details  { background:var(--bg); padding:8px 12px; border-top:1px solid var(--border); }
.plan-ing-row  { padding:4px 0; border-bottom:1px solid rgba(0,0,0,.05); }
.plan-ing-row:last-child { border-bottom:none; }
.plan-ing-info { display:flex; justify-content:space-between; font-size:.85rem; }
.plan-ing-nome { color:var(--brown-mid); font-weight:600; }
.plan-ing-qtd  { font-family:var(--mono); font-weight:700; color:var(--brown); }
.plan-name     { font-weight:700; font-size:.9rem; color:var(--brown); }
.plan-sub      { font-size:.75rem; color:var(--muted); }
.plan-sub-list { display:flex; flex-direction:column; gap:2px; }
.plan-sub-item { display:flex; justify-content:space-between; padding:1px 0; font-size:.78rem; color:var(--muted); }

.badge-shortcut { padding:2px 10px; border-radius:var(--r-full); background:var(--gold-bg); border:1px solid #e8d5a0; color:var(--gold-dark); font-size:.68rem; font-weight:700; margin-top:4px; white-space:nowrap; }
.batch-content  { padding:16px; }

/* ── Controle de quantidade ── */
.qty-ctrl-sm    { display:flex; align-items:center; gap:12px; background:var(--bg); border-radius:20px; padding:4px; border:1px solid var(--border); }
.btn-qty-sm     { border:none; background:#fff; width:32px; height:32px; border-radius:50%; font-size:1.2rem; font-weight:bold; color:var(--gold-dark); box-shadow:var(--shadow-sm); cursor:pointer; }
.qty-val        { font-family:var(--mono); font-weight:800; font-size:1rem; min-width:24px; text-align:center; }
.qty-input-cozinha { width:60px; border:none; background:#fff; border-radius:4px; text-align:center; font-family:var(--mono); font-weight:800; font-size:1.1rem; color:var(--brown-dark); padding:0; appearance:none; -moz-appearance:textfield; }
.qty-input-cozinha::-webkit-outer-spin-button,
.qty-input-cozinha::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.qty-input-cozinha:focus { outline:none; }

/* ── Cards de sheet internos ── */
.sheet-card { background:#fff; border-radius:var(--r-lg); border:1px solid var(--border); box-shadow:var(--shadow-sm); overflow:hidden; }
.sheet-body { padding:20px; }

/* ── Checklist (pesagem — variante sem transição, exclusiva desta tela) ── */
.checklist  { display:flex; flex-direction:column; gap:10px; }
.check-item { display:flex; align-items:center; padding:14px; background:var(--bg); border-radius:var(--r-md); cursor:pointer; border:1px solid transparent; }
.check-item.done  { opacity:.5; background:#f8fafc; border-color:var(--border); }
.check-box        { font-size:1.4rem; margin-right:15px; color:var(--gold); }
.done .check-box  { color:var(--green); }
.check-info       { flex:1; display:flex; flex-direction:column; }
.check-main       { display:flex; justify-content:space-between; align-items:center; width:100%; }
.check-name       { font-weight:700; font-size:1rem; color:var(--brown); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
.done .check-name { text-decoration:line-through; }
.check-val        { font-family:var(--mono); font-weight:800; font-size:.95rem; color:var(--brown-dark); background:#fff; padding:2px 6px; border-radius:var(--r-sm); border:1px solid var(--border); flex-shrink:0; margin-left:8px; }

/* ── Stepper flutuante ── */
.stepper-popup { position:fixed; z-index:9998; display:flex; align-items:center; background:var(--brown-dark); border-radius:28px; box-shadow:0 8px 24px rgba(0,0,0,.25); padding:4px; touch-action:none; }
.stepper-btn   { width:44px; height:44px; border:none; background:transparent; color:#fff; font-size:1.5rem; font-weight:700; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; transition:background .1s; user-select:none; -webkit-touch-callout:none; }
.stepper-btn:active { background:rgba(255,255,255,.15); }
.stepper-val        { min-width:36px; text-align:center; font-family:var(--mono); font-size:1.1rem; font-weight:800; color:#fff; }

/* ── Feedback flutuante (+N un) ── */
.feedback-float { position:fixed; transform:translateX(-50%); background:var(--brown-dark); color:#fff; font-size:.8rem; font-weight:800; padding:4px 10px; border-radius:20px; pointer-events:none; z-index:9999; animation:floatUp .75s ease forwards; white-space:nowrap; }

/* ── Cabeçalho de pesagem ── */
.pesagem-header { display:flex; justify-content:space-between; padding:14px 16px; background:var(--surface); border-bottom:1px solid var(--border); border-radius:var(--r-lg) var(--r-lg) 0 0; }

/* ── Animações ── */
.stepper-anim-enter-active,
.stepper-anim-leave-active { transition:opacity .15s ease, transform .15s ease; }
.stepper-anim-enter-from,
.stepper-anim-leave-to     { opacity:0; transform:scale(.8); }

@keyframes floatUp {
  0%   { opacity:1; transform:translateX(-50%) translateY(0); }
  100% { opacity:0; transform:translateX(-50%) translateY(-40px); }
}

@media (max-width:400px) {
  .check-name { font-size:.9rem; }
  .check-val  { font-size:.85rem; padding:2px 4px; }
}
</style>
