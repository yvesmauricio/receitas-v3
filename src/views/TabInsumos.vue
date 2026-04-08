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
    <BaseModal v-if="modal === 'insumo'" fullscreen :title="form.uuid ? 'Editar Ingrediente' : 'Novo Ingrediente'" @close="fecharModal">
      <div class="form-section">
        <div class="form-section-title">1. Identificacao</div>
        <div class="fg">
          <label class="label label-req">Nome do ingrediente</label>
          <input v-model="form.nome" class="input" autofocus placeholder="Ex: Chocolate ao Leite" />
        </div>
        <div class="fg">
          <label class="label">Tipo</label>
          <select v-model="form.tipo" class="input">
            <option v-for="tipo in TIPOS_INSUMO" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">2. Medidas e custo</div>
        <div class="unit-section">
          <div class="fg">
            <label class="label">Unidade de compra</label>
            <select v-model="form.unidade_compra" class="input">
              <option v-for="u in UNIDADES_COMPRA" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <div class="fg">
            <label class="label">Unidade de uso</label>
            <select v-model="form.unidade_base" class="input">
              <option v-for="u in UNIDADES_BASE" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
        </div>
        <div class="fg">
          <label class="label">Quantidade na embalagem</label>
          <input v-model.number="form.fator_conversao" class="input" type="number" min="0" step="0.001" placeholder="Ex: 1000" />
          <div class="hint">Quanto vem na unidade comprada. Ex.: 1 kg = 1000 g.</div>
        </div>
        <div class="fg">
          <label class="label">Preco pago</label>
          <input
            :value="maskMoney(form.custo_por_unidade)"
            @input="e => form.custo_por_unidade = parseMoney(e.target.value)"
            inputmode="numeric" class="input" placeholder="0,00"
          />
        </div>
        <div class="fg">
          <label class="label">Custo por unidade usada</label>
          <input :value="custoPorBase" class="input input-ro" readonly />
        </div>
      </div>

      <template #foot>
        <button v-if="form.uuid" class="btn btn-danger" @click="excluir"><i class="fas fa-trash"></i></button>
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

const UNIDADES_COMPRA = ['Kg', 'g', 'Un', 'Pote', 'Garrafa', 'Lata', 'Pacote', 'Caixa', 'Barra', 'Saco']
const UNIDADES_BASE = ['g', 'ml', 'un', 'kg']
const TIPOS_INSUMO = [
  { value: 'insumo', label: 'Ingrediente' },
  { value: 'embalagem', label: 'Embalagem' }
]
const categoriasFiltro = ['Todas', 'Ingrediente', 'Embalagem']

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
:deep(.modal-body) { --modal-pad-y: 12px; --modal-pad-x: 14px; padding: var(--modal-pad-y) var(--modal-pad-x); }
:deep(.modal-foot) { padding: 10px 14px calc(12px + env(safe-area-inset-bottom)); }
:deep(.input),
:deep(select.input) { padding: 9px 10px; min-height: 40px; }

.loading-box { display: flex; justify-content: center; padding: 40px; }
.tab-content { padding-top: 10px; }
.mt-12  { margin-top: 12px; }
.spacer { flex: 1; }
.cat-filter-wrap { margin: -4px -16px 0; padding: 6px 0 0; background: var(--surface); }
.cat-chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px 2px; scrollbar-width: none; }
.cat-chips::-webkit-scrollbar { display: none; }
.cat-chip { flex-shrink: 0; padding: 7px 14px; border-radius: 20px; border: 1px solid var(--border); background: #fff; font-size: 0.75rem; font-weight: 700; color: var(--muted); cursor: pointer; }
.cat-chip.active { background: var(--brown); color: #fff; border-color: var(--brown); }

.ing-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.row-chevron { color: var(--border2); font-size: 0.75rem; flex-shrink: 0; margin-left: 4px; }
.ing-preco   { font-family: var(--mono); font-weight: 700; color: var(--brown); font-size: 0.82rem; }
.ing-dot     { color: var(--border2); }
.ing-type-tag { margin-left: auto; flex-shrink: 0; }

/* Botões de swipe */
.swipe-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 60px;
  height: 100%;
  border: none;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  cursor: pointer;
  text-transform: uppercase;
}
.swipe-btn i { font-size: 1.1rem; }
.swipe-btn.edit { background: var(--gold-dark, #b45309); }
.swipe-btn.del  { background: #dc2626; }
.swipe-btn:active { filter: brightness(0.88); }

.form-section { display:flex; flex-direction:column; gap:10px; padding:10px 11px; border:1px solid var(--border); border-radius:var(--r-md); background:var(--surface); margin-bottom:10px; }
.form-section-title { font-size:.78rem; font-weight:800; text-transform:uppercase; letter-spacing:.6px; color:var(--gold-dark); }
.hint { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
.unit-section { display:flex; flex-direction:column; gap:10px; }
.chips-elegant {
  display:grid;
  gap:8px;
}
.chips-elegant-2 { grid-template-columns:repeat(2, minmax(0, 1fr)); }
.chips-elegant-4 { grid-template-columns:repeat(4, minmax(0, 1fr)); }
.choice-pill {
  min-height:44px;
  width:100%;
  padding:10px 12px;
  border-radius:var(--r-full);
  border:1px solid #e7dac7;
  background:linear-gradient(180deg, #fffdfa 0%, #fbf4ea 100%);
  color:var(--brown-mid);
  font-size:.83rem;
  font-weight:700;
  white-space:nowrap;
  box-shadow:0 1px 0 rgba(255,255,255,.9), 0 1px 3px rgba(61,32,8,.04);
  transition:all var(--t);
}
.choice-pill:active { transform:scale(.98); }
.choice-pill.active {
  background:linear-gradient(135deg, var(--brown) 0%, #6a3a14 100%);
  border-color:#5f3412;
  color:#fff;
  box-shadow:0 8px 16px rgba(61,32,8,.16);
}
@media (max-width: 380px) {
  .chips-elegant-4 { grid-template-columns:repeat(3, minmax(0, 1fr)); }
}
</style>
