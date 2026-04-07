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
            <div class="row-info">
              <div class="row-name">{{ p.nome }}</div>
              <div class="row-sub">
                <span class="badge" :class="tipoBadge(p.tipo)">{{ tipoLabel(p.tipo) }}</span>
                <span v-if="p.unidade_compra">{{ p.unidade_compra }}</span>
                <span v-if="p.custo_por_unidade" class="ing-preco">{{ R$(p.custo_por_unidade) }}</span>
              </div>
            </div>
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
      <div class="fg">
        <label class="label label-req">Nome</label>
        <input v-model="form.nome" class="input" autofocus placeholder="Ex: Chocolate ao Leite" />
      </div>
      <div class="fg">
        <label class="label">Categoria</label>
        <div class="chips-elegant chips-elegant-2">
          <button type="button" class="choice-pill" :class="{ active: form.tipo === 'insumo' }" @click="form.tipo = 'insumo'">Ingrediente</button>
          <button type="button" class="choice-pill" :class="{ active: form.tipo === 'base' }" @click="form.tipo = 'base'">Base/Recheio</button>
          <button type="button" class="choice-pill" :class="{ active: form.tipo === 'final' }" @click="form.tipo = 'final'">Produto final</button>
          <button type="button" class="choice-pill" :class="{ active: form.tipo === 'embalagem' }" @click="form.tipo = 'embalagem'">Embalagem</button>
        </div>
      </div>
      <div class="unit-section">
        <div class="fg">
          <label class="label">Unidade de compra</label>
          <div class="chips-elegant chips-elegant-4">
            <button
              v-for="u in UNIDADES_COMPRA"
              :key="u"
              type="button"
              class="choice-pill choice-pill-unit"
              :class="{ active: form.unidade_compra === u }"
              @click="form.unidade_compra = u"
            >
              {{ u }}
            </button>
          </div>
        </div>
        <div class="fg">
          <label class="label">Unidade usada na receita</label>
          <div class="chips-elegant chips-elegant-4">
            <button type="button" class="choice-pill choice-pill-unit" :class="{ active: form.unidade_base === 'g' }" @click="form.unidade_base = 'g'">g</button>
            <button type="button" class="choice-pill choice-pill-unit" :class="{ active: form.unidade_base === 'ml' }" @click="form.unidade_base = 'ml'">ml</button>
            <button type="button" class="choice-pill choice-pill-unit" :class="{ active: form.unidade_base === 'un' }" @click="form.unidade_base = 'un'">un</button>
            <button type="button" class="choice-pill choice-pill-unit" :class="{ active: form.unidade_base === 'kg' }" @click="form.unidade_base = 'kg'">kg</button>
          </div>
        </div>
      </div>
      <div class="fg">
        <label class="label">Quantidade da Embalagem</label>
        <input v-model.number="form.fator_conversao" class="input" type="number" min="0" step="0.001" placeholder="Ex: 1000" />
        <div class="hint">Quanto vem na unidade comprada. Ex.: 1 kg = 1000 g.</div>
      </div>
      <div class="fg">
        <label class="label">Preço de Compra (R$)</label>
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
let modalHistoryToken = null

const UNIDADES_COMPRA = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz']

/* ── Lista ────────────────────────────────────────────────────── */
const lista = computed(() => {
  let r = s.produtos
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
.loading-box { display: flex; justify-content: center; padding: 40px; }
.tab-content { padding-top: 10px; }
.mt-12  { margin-top: 12px; }
.spacer { flex: 1; }

.row-chevron { color: var(--border2); font-size: 0.75rem; flex-shrink: 0; margin-left: 4px; }
.ing-preco   { font-family: var(--mono); font-weight: 700; color: var(--brown); font-size: 0.82rem; }

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

.hint { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
.unit-section { display:flex; flex-direction:column; gap:14px; }
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
.choice-pill-unit {
  min-height:42px;
  padding:9px 8px;
  border-radius:14px;
  font-size:.82rem;
  text-transform:lowercase;
}
@media (max-width: 380px) {
  .chips-elegant-4 { grid-template-columns:repeat(3, minmax(0, 1fr)); }
}
</style>
