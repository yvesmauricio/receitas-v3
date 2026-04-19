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
      <CategoryFilter v-model="categoriaAtiva" :items="categoriasFiltro" />
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
              <i class="fas fa-mortar-pestle option-ico"></i>
              <span class="option-label">Ingrediente</span>
            </button>
            <button type="button" class="option-card" :class="{ active: form.tipo === 'base' }" @click="form.tipo = 'base'">
              <i class="fas fa-blender option-ico"></i>
              <span class="option-label">Base/Recheio</span>
            </button>
            <button type="button" class="option-card" :class="{ active: form.tipo === 'final' }" @click="form.tipo = 'final'">
              <i class="fas fa-cookie-bite option-ico"></i>
              <span class="option-label">Produto final</span>
            </button>
            <button type="button" class="option-card" :class="{ active: form.tipo === 'embalagem' }" @click="form.tipo = 'embalagem'">
              <i class="fas fa-box option-ico"></i>
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
              v-for="u in ['kg','g','L','ml','un','cx','pct','dz']"
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

        <div v-if="form.unidade_base === 'un'" class="fg">
          <label class="label">Peso de 1 unidade (g)</label>
          <div class="input-with-unit">
            <input v-model.number="form.peso_unitario" class="input" type="number" inputmode="decimal" min="0" step="0.1" placeholder="Ex: 15" />
            <span class="input-unit-tag">g</span>
          </div>
          <div class="hint">Informe o peso individual para que o sistema calcule o peso total da receita corretamente.</div>
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
import CategoryFilter from '../components/CategoryFilter.vue'
import { useModalStack } from '../composables/useModalStack.js'
import { useDeleteConfirm } from '../composables/useDeleteConfirm.js'

const s = useStore()
const { modal, abrirModal, fecharModal } = useModalStack()
const { confirmarExclusao } = useDeleteConfirm()

const busca  = ref('')
const saving = ref(false)
const categoriaAtiva = ref('Ingrediente')

const UNIDADES_COMPRA = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz']
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
  uuid: null, nome: '', tipo: 'insumo',
  unidade_compra: 'kg', unidade_base: 'g',
  fator_conversao: 1000, estoque_atual: 0, estoque_minimo: 0,
  custo_por_unidade: 0,
  peso_unitario: 0
})

const custoPorBase = computed(() => {
  const c = +form.custo_por_unidade
  const f = +form.fator_conversao
  if (!c || !f) return 'R$ 0,00'
  const valor = c / f
  return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
})

const custoPorBaseRaw = computed(() => {
  const c = +form.custo_por_unidade
  const f = +form.fator_conversao
  if (!c || !f) return '0,00'
  return (c / f).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
})

/* ── Helpers visuais ──────────────────────────────────────────── */
function tipoBadge(t) {
  return { insumo: 'badge-muted', base: 'badge-blue', final: 'badge-gold', embalagem: 'badge-orange' }[t] || 'badge-muted'
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
    uuid: null, nome: '', tipo: 'insumo',
    unidade_compra: 'kg', unidade_base: 'g',
    fator_conversao: 1000, estoque_atual: 0, estoque_minimo: 0,
    custo_por_unidade: 0,
    peso_unitario: 0,
    ...(p || {})
  })
  abrirModal('insumo')
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
  await confirmarExclusao({
    nome: form.nome, entidade: 'ingrediente',
    onConfirm: () => s.excluirProduto(form.uuid),
    onDone: fecharModal,
  })
}

// Excluir direto pelo swipe (sem modal aberto)
async function excluirDireto(p) {
  await confirmarExclusao({
    nome: p.nome, entidade: 'ingrediente',
    onConfirm: () => s.excluirProduto(p.uuid),
  })
}
</script>

<style scoped>
/* ── Ícone de tipo do ingrediente (exclusivo desta tela) ── */
.ing-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0 }
.ing-preco { font-family:var(--mono); font-weight:700; color:var(--brown); font-size:.82rem }
.ing-dot   { color:var(--border2) }
</style>
