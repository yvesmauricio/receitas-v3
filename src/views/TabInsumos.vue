<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-boxes"></i> Ingredientes</h2>
        <div class="tab-actions">
          <button class="btn-primary-sm" @click="abrir(null)"><i class="fas fa-plus"></i> Novo</button>
        </div>
      </div>
      <div class="search-wrap">
        <i class="fas fa-search search-icon"></i>
        <input v-model="busca" class="search-input" type="search" placeholder="Buscar ingrediente…" />
      </div>
      <div class="cat-filter-wrap">
        <div class="cat-chips">
          <button
            v-for="c in categoriasFiltro"
            :key="c"
            class="cat-chip"
            :class="{ active: categoriaAtiva === c }"
            @click="categoriaAtiva = c"
          >{{ c }}</button>
        </div>
      </div>
    </div>

    <section class="tab-content">
      <div v-if="s.loading" class="loading-box"><div class="spinner spinner-sm"></div></div>

      <template v-else-if="lista.length">
        <SwipeRow
          v-for="p in lista"
          :key="p.uuid"
          :row-id="p.uuid"
          :width="120"
        >
          <!-- Conteúdo da linha -->
          <div class="list-row" @click="abrir(p)">
            <div class="ing-icon" :class="tipoBadge(p.tipo)">
              <i :class="tipoIcon(p.tipo)"></i>
            </div>
            <div class="row-info">
              <div class="row-name">{{ p.nome }}</div>
              <div class="row-sub">
                <span class="ing-preco">{{ R$(p.custo_por_unidade || 0) }}</span>
                <span class="ing-dot">•</span>
                <span>{{ p.unidade_compra || p.unidade_base || '-' }}</span>
              </div>
            </div>
            <span class="badge ing-type-tag" :class="tipoBadge(p.tipo)">{{ tipoLabel(p.tipo) }}</span>
            <i class="fas fa-chevron-right row-chevron"></i>
          </div>

          <!-- Ações de swipe -->
          <template #actions>
            <button class="swipe-btn edit" @click="abrir(p)">
              <i class="fas fa-pencil"></i>
              <span>Editar</span>
            </button>
            <button class="swipe-btn del" @click="excluirDireto(p)">
              <i class="fas fa-trash"></i>
              <span>Excluir</span>
            </button>
          </template>
        </SwipeRow>
      </template>

      <div v-else class="empty">
        <i class="fas fa-box-open"></i>
        <h3>{{ busca ? 'Nenhum resultado' : 'Nenhum ingrediente ainda' }}</h3>
        <p>{{ busca ? 'Tente outro termo' : 'Cadastre o primeiro ingrediente' }}</p>
        <button v-if="!busca" class="btn btn-primary mt-12" @click="abrir(null)">
          <i class="fas fa-plus"></i> Novo Ingrediente
        </button>
      </div>
    </section>

    <!-- ─── Modal Ingrediente ──────────────────────────────────── -->
    <BaseModal v-if="modal === 'insumo'" :title="form.uuid ? 'Editar Ingrediente' : 'Novo Ingrediente'" @close="fecharModal">

      <!-- ── Seção: Identificação ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-tag"></i> Identificação</div>
        <div class="fg">
          <label class="label label-req">Nome do ingrediente</label>
          <input v-model="form.nome" class="input" autofocus placeholder="Ex: Chocolate ao Leite 70%" autocomplete="off" />
        </div>
        <div class="fg">
          <label class="label">Tipo</label>
          <div class="option-grid option-grid-2">
            <button type="button" class="option-card" :class="{ active: form.tipo === 'insumo' }" @click="form.tipo = 'insumo'">
              <span class="option-ico">🥛</span>
              <span class="option-label">Ingrediente</span>
            </button>
            <button type="button" class="option-card" :class="{ active: form.tipo === 'base' }" @click="form.tipo = 'base'">
              <span class="option-ico">🥣</span>
              <span class="option-label">Base/Recheio</span>
            </button>
            <button type="button" class="option-card" :class="{ active: form.tipo === 'final' }" @click="form.tipo = 'final'">
              <span class="option-ico">🍫</span>
              <span class="option-label">Produto final</span>
            </button>
            <button type="button" class="option-card" :class="{ active: form.tipo === 'embalagem' }" @click="form.tipo = 'embalagem'">
              <span class="option-ico">📦</span>
              <span class="option-label">Embalagem</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Seção: Unidades ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-balance-scale"></i> Unidades</div>

        <div class="fg">
          <label class="label">Unidade de compra</label>
          <div class="unit-pill-grid">
            <button
              v-for="u in UNIDADES_COMPRA"
              :key="u"
              type="button"
              class="unit-pill"
              :class="{ active: form.unidade_compra === u }"
              @click="form.unidade_compra = u"
            >{{ u }}</button>
          </div>
        </div>

        <div class="fg">
          <label class="label">Unidade usada na receita</label>
          <div class="unit-pill-grid unit-pill-grid-4">
            <button type="button" class="unit-pill" :class="{ active: form.unidade_base === 'g' }"  @click="form.unidade_base = 'g'">g</button>
            <button type="button" class="unit-pill" :class="{ active: form.unidade_base === 'ml' }" @click="form.unidade_base = 'ml'">ml</button>
            <button type="button" class="unit-pill" :class="{ active: form.unidade_base === 'un' }" @click="form.unidade_base = 'un'">un</button>
            <button type="button" class="unit-pill" :class="{ active: form.unidade_base === 'kg' }" @click="form.unidade_base = 'kg'">kg</button>
          </div>
        </div>

        <div class="fg">
          <label class="label">Quantidade na embalagem</label>
          <div class="input-with-unit">
            <input v-model.number="form.fator_conversao" class="input" type="number" inputmode="decimal" min="0" step="0.001" placeholder="1000" />
            <span class="input-unit-tag">{{ form.unidade_base }}</span>
          </div>
          <div class="hint">Ex.: 1 kg de compra = 1000 g de uso na receita</div>
        </div>
      </div>

      <!-- ── Seção: Custo ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-dollar-sign"></i> Custo</div>

        <div class="grid-2">
          <div class="fg">
            <label class="label">Preço de compra</label>
            <div class="input-with-prefix">
              <span class="input-prefix">R$</span>
              <input
                :value="maskMoney(form.custo_por_unidade)"
                @input="e => form.custo_por_unidade = parseMoney(e.target.value)"
                inputmode="numeric" class="input input-prefixed" placeholder="0,00"
              />
            </div>
          </div>
          <div class="fg">
            <label class="label">Custo / {{ form.unidade_base }}</label>
            <div class="input-with-prefix">
              <span class="input-prefix">R$</span>
              <input :value="custoPorBaseRaw" class="input input-prefixed input-ro" readonly />
            </div>
          </div>
        </div>

        <!-- Card de resumo de custo -->
        <div v-if="form.custo_por_unidade > 0 && form.fator_conversao > 0" class="custo-card">
          <i class="fas fa-info-circle custo-ico"></i>
          <span>{{ maskMoney(form.custo_por_unidade) }} ÷ {{ form.fator_conversao }} = <strong>{{ custoPorBase }}</strong> por {{ form.unidade_base }}</span>
        </div>
      </div>

      <template #foot>
        <button v-if="form.uuid" class="btn btn-danger btn-icon-only" @click="excluir" title="Excluir ingrediente">
          <i class="fas fa-trash"></i>
        </button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="fecharModal">Cancelar</button>
        <button class="btn btn-primary" :disabled="!form.nome || saving" @click="salvar">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ form.uuid ? 'Salvar' : 'Criar' }}</span>
        </button>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar, parseMoney, maskMoney } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'
import SwipeRow from '../components/SwipeRow.vue'
import { useConfirm } from '../composables/useConfirm.js'
import { useSwipe } from '../composables/useSwipe.js'
import { pushOverlayHistory, closeOverlayHistory } from '../composables/overlayHistory.js'

const s = useStore()
const confirm = useConfirm()
const { closeAll } = useSwipe()

const busca  = ref('')
const modal  = ref(null)
const saving = ref(false)
const categoriaAtiva = ref('Todas')
let modalHistoryToken = null

const UNIDADES_COMPRA = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz']
const categoriasFiltro = ['Todas', 'Ingrediente', 'Base/Recheio', 'Produto final', 'Embalagem']

/* ── Lista ────────────────────────────────────────────────────── */
const lista = computed(() => {
  let r = s.produtos

  if (categoriaAtiva.value !== 'Todas') {
    const tipoMap = {
      'Ingrediente': 'insumo',
      'Base/Recheio': 'base',
      'Produto final': 'final',
      'Embalagem': 'embalagem'
    }
    r = r.filter(p => p.tipo === tipoMap[categoriaAtiva.value])
  }

  if (busca.value.trim()) {
    const q = normalizar(busca.value)
    r = r.filter(p => normalizar(p.nome + ' ' + p.tipo).includes(q))
  }
  return [...r].sort((a, b) => a.nome?.localeCompare(b.nome))
})

/* ── Formulário ───────────────────────────────────────────────── */
const form = reactive({
  id: null, uuid: null, nome: '', tipo: 'insumo',
  unidade_compra: 'kg', unidade_base: 'g',
  fator_conversao: 1000, estoque_atual: 0, estoque_minimo: 0,
  custo_por_unidade: 0
})

const custoPorBase = computed(() => {
  const c = +form.custo_por_unidade
  const f = +form.fator_conversao
  return (c && f) ? R$(c / f) : 'R$ 0,00'
})

const custoPorBaseRaw = computed(() => {
  const c = +form.custo_por_unidade
  const f = +form.fator_conversao
  if (!c || !f) return '0,00'
  return (c / f).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
})

/* ── Helpers visuais ──────────────────────────────────────────── */
function tipoBadge(t) {
  return { insumo: 'badge-muted', base: 'badge-blue', final: 'badge-gold', embalagem: 'badge-orange' }[t] || 'badge-muted'
}
function tipoLabel(t) {
  return { insumo: 'Ingrediente', base: 'Base/Recheio', final: 'Produto final', embalagem: 'Embalagem' }[t] || t || '-'
}
function tipoIcon(t) {
  return {
    insumo: 'fas fa-mortar-pestle',
    base: 'fas fa-blender',
    final: 'fas fa-cookie-bite',
    embalagem: 'fas fa-box'
  }[t] || 'fas fa-cube'
}

/* ── Modal ────────────────────────────────────────────────────── */
function abrir(p) {
  Object.assign(form, {
    id: null, uuid: null, nome: '', tipo: 'insumo',
    unidade_compra: 'kg', unidade_base: 'g',
    fator_conversao: 1000, estoque_atual: 0, estoque_minimo: 0,
    custo_por_unidade: 0,
    ...(p || {})
  })
  modalHistoryToken = pushOverlayHistory(() => {
    modalHistoryToken = null
    modal.value = null
  })
  modal.value = 'insumo'
}

function fecharModal() {
  closeOverlayHistory(modalHistoryToken, () => {
    modalHistoryToken = null
    modal.value = null
  })
}

/* ── Ações ────────────────────────────────────────────────────── */
async function salvar() {
  if (!form.nome.trim()) return
  saving.value = true
  try {
    await s.salvarProduto({ ...form })
    fecharModal()
  } finally { saving.value = false }
}

// Excluir via botão no modal
async function excluir() {
  if (!form.uuid) return
  closeAll()
  const ok = await confirm.ask(
    `Deseja excluir o ingrediente "${form.nome}"? Esta ação não pode ser desfeita.`,
    { title: 'Excluir Ingrediente', icon: 'fas fa-trash', confirmLabel: 'Excluir' }
  )
  if (!ok) return
  await s.excluirProduto(form.uuid)
  fecharModal()
}

// Excluir direto pelo swipe (sem modal aberto)
async function excluirDireto(p) {
  closeAll()
  const ok = await confirm.ask(
    `Deseja excluir o ingrediente "${p.nome}"? Esta ação não pode ser desfeita.`,
    { title: 'Excluir Ingrediente', icon: 'fas fa-trash', confirmLabel: 'Excluir' }
  )
  if (!ok) return
  await s.excluirProduto(p.uuid)
}
</script>

<style scoped>
/* ── Lista ── */
.loading-box { display:flex; justify-content:center; padding:40px }
.tab-content { padding-top:8px }
.mt-12 { margin-top:12px }
.spacer { flex:1 }

.cat-filter-wrap { margin:-4px -16px 0; padding:6px 0 0; background:var(--surface) }
.cat-chips { display:flex; gap:8px; overflow-x:auto; padding:0 16px 2px; scrollbar-width:none }
.cat-chips::-webkit-scrollbar { display:none }
.cat-chip { flex-shrink:0; padding:8px 16px; border-radius:20px; border:1.5px solid var(--border); background:#fff; font-size:.76rem; font-weight:700; color:var(--muted); cursor:pointer; min-height:36px }
.cat-chip.active { background:var(--brown); color:#fff; border-color:var(--brown) }

.ing-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0 }
.row-chevron { color:var(--border2); font-size:.75rem; flex-shrink:0; margin-left:4px }
.ing-preco { font-family:var(--mono); font-weight:700; color:var(--brown); font-size:.82rem }
.ing-dot { color:var(--border2) }
.ing-type-tag { flex-shrink:0 }

/* ── Formulário: Seções ── */
.form-section {
  padding: 16px;
  margin: 0 -20px;
  border-bottom: 8px solid var(--bg);
}
.form-section:first-of-type { border-top: 8px solid var(--bg); margin-top: -18px; }
.form-section:last-of-type { border-bottom: none; margin-bottom: -18px; }
.form-section .fg:last-child { margin-bottom: 0 }

.form-section-label {
  font-size: .72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: var(--gold-dark);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.form-section-label i { font-size: .8rem; color: var(--brown-mid) }

/* ── Option cards (tipo de ingrediente) ── */
.option-grid { display:grid; gap:8px }
.option-grid-2 { grid-template-columns:1fr 1fr }

.option-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 12px 8px;
  border: 2px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  transition: all var(--t);
  min-height: 68px;
}
.option-card:active { transform: scale(.96) }
.option-card.active {
  border-color: var(--brown);
  background: var(--gold-bg);
  box-shadow: 0 0 0 3px rgba(61,31,7,.08);
}
.option-ico { font-size: 1.4rem; line-height: 1 }
.option-label { font-size: .78rem; font-weight: 700; color: var(--brown-mid) }
.option-card.active .option-label { color: var(--brown-dark) }

/* ── Unit pills ── */
.unit-pill-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 6px;
}
.unit-pill-grid-4 { grid-template-columns: repeat(4, minmax(0,1fr)) }

.unit-pill {
  padding: 10px 6px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--cream);
  color: var(--muted);
  font-size: .82rem;
  font-weight: 700;
  text-align: center;
  min-height: 44px;
  transition: all var(--t);
}
.unit-pill:active { transform: scale(.95) }
.unit-pill.active {
  border-color: var(--brown-mid);
  background: var(--brown);
  color: #fff;
}

/* ── Input com prefixo/unidade ── */
.input-with-prefix {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  transition: border-color var(--t);
}
.input-with-prefix:focus-within { border-color: var(--brown-mid); box-shadow: 0 0 0 3px rgba(122,69,32,.12) }

.input-prefix {
  display: flex;
  align-items: center;
  padding: 0 11px;
  background: var(--cream-deep);
  color: var(--muted);
  font-size: .82rem;
  font-weight: 700;
  border-right: 1.5px solid var(--border);
  white-space: nowrap;
  flex-shrink: 0;
}
.input-prefixed {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  flex: 1;
  min-width: 0;
}
.input-prefixed:focus { outline: none }

.input-with-unit {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  transition: border-color var(--t);
}
.input-with-unit:focus-within { border-color: var(--brown-mid); box-shadow: 0 0 0 3px rgba(122,69,32,.12) }
.input-with-unit .input {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  flex: 1;
}
.input-with-unit .input:focus { outline: none }
.input-unit-tag {
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--cream-deep);
  color: var(--muted);
  font-size: .82rem;
  font-weight: 700;
  border-left: 1.5px solid var(--border);
  flex-shrink: 0;
}

/* ── Custo card ── */
.custo-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 13px;
  background: var(--gold-bg);
  border: 1px solid #e8d5a0;
  border-radius: var(--r-sm);
  font-size: .83rem;
  color: var(--brown-mid);
  line-height: 1.4;
  margin-top: 4px;
}
.custo-ico { color: var(--gold-dark); flex-shrink: 0 }
.custo-card strong { color: var(--brown-dark); font-weight: 800 }

/* ── Footer btn ── */
.btn-icon-only { min-width: 48px; padding: 12px }
</style>
