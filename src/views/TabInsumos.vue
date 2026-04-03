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
        <input v-model="busca" class="search-input" type="search" placeholder="Buscar insumo, base ou final…" />
      </div>
      <div class="chips hidden">
        <!-- Filtros removidos por simplicidade -->
      </div>
    </div>

    <div v-if="s.loading" class="loading-box"><div class="spinner spinner-sm"></div></div>

    <template v-else-if="lista.length">
      <div v-for="p in lista" :key="p.id||p.uuid" class="list-row">
        <div class="row-info pointer" @click="abrir(p)">
          <div class="row-name">{{ p.nome }}</div>
          <div class="row-sub">
            <span class="badge" :class="tipoBadge(p.tipo)">{{ tipoLabel(p.tipo) }}</span>
            <span v-if="p.unidade_compra">{{ p.unidade_compra }}</span>
          </div>
        </div>
        <div class="row-acts">
          <button class="btn-icon" title="Editar" @click.stop="abrir(p)"><i class="fas fa-pencil"></i></button>
        </div>
      </div>
    </template>

    <div v-else class="empty">
      <i class="fas fa-box-open"></i>
      <h3>{{ busca ? 'Nenhum resultado' : 'Nenhum insumo ainda' }}</h3>
      <p>{{ busca ? 'Tente outro termo' : 'Cadastre o primeiro ingrediente' }}</p>
      <button v-if="!busca" class="btn btn-primary mt-12" @click="abrir(null)"><i class="fas fa-plus"></i> Novo Insumo</button>
    </div>

    <!-- ─── Modal Insumo ──────────────────────────────────────── -->
    <BaseModal v-if="modal === 'insumo'" :title="form.id ? 'Editar Insumo' : 'Novo Insumo'" @close="modal = null">
      <div class="fg"><label class="label label-req">Nome</label><input v-model="form.nome" class="input" autofocus /></div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Tipo</label>
          <select v-model="form.tipo" class="input">
            <option value="insumo">Insumo</option><option value="base">Base/Recheio</option>
            <option value="final">Produto Final</option><option value="embalagem">Embalagem</option>
          </select>
        </div>
        <div class="fg">
          <label class="label">Unidade Compra</label>
          <select v-model="form.unidade_compra" class="input">
            <option v-for="u in UNIDADES_COMPRA" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Unidade Base</label>
          <select v-model="form.unidade_base" class="input">
            <option value="g">g</option><option value="ml">ml</option><option value="un">un</option><option value="kg">kg</option>
          </select>
        </div>
        <div class="fg">
          <label class="label">Fator Conversão</label>
          <input v-model.number="form.fator_conversao" class="input" type="number" min="0" step="0.001" placeholder="Ex: 1000" />
          <div class="hint">qtd base por unidade compra</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="fg"><label class="label">Preço Compra (R$)</label><input v-model.number="form.custo_por_unidade" class="input" type="number" min="0" step="0.01" /></div>
        <div class="fg">
          <label class="label">Custo por {{ form.unidade_base }}</label>
          <input :value="custoPorBase" class="input input-ro" readonly />
        </div>
      </div>
      <template #foot>
        <button v-if="form.id" class="btn btn-danger" @click="excluir"><i class="fas fa-trash"></i></button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="modal = null">Cancelar</button>
        <button class="btn btn-primary" :disabled="!form.nome || saving" @click="salvar">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ form.id ? 'Salvar' : 'Criar' }}</span>
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useStore } from '../store.js'
import { R$, fmtQtd as fmtQ, normalizar } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'

const s = useStore()
const busca  = ref('')
const filtro = ref('todos')
const modal  = ref(null)
const saving = ref(false)

const filtros = [
  { v: 'todos', l: 'Todos' }, { v: 'base', l: 'Bases' }, { v: 'final', l: 'Finais' }, { v: 'baixo', l: '⚠️ Baixo' }
]
const UNIDADES_COMPRA = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz']

const lista = computed(() => {
  let r = s.produtos
  if (filtro.value === 'baixo') r = s.baixoEstoque
  else if (filtro.value !== 'todos') r = r.filter(p => p.tipo === filtro.value)
  if (busca.value.trim()) { const q = normalizar(busca.value); r = r.filter(p => normalizar(p.nome + ' ' + p.tipo).includes(q)) }
  return [...r].sort((a, b) => a.nome?.localeCompare(b.nome))
})

const form = reactive({ id: null, uuid: null, nome: '', tipo: 'insumo', unidade_compra: 'kg', unidade_base: 'g', fator_conversao: 1000, estoque_atual: 0, estoque_minimo: 0, custo_por_unidade: 0 })
const custoPorBase = computed(() => {
  const c = +form.custo_por_unidade, f = +form.fator_conversao
  return (c && f) ? R$(c / f) : 'R$ 0,00'
})
const compra = reactive({ produto: null, qtd: null, custo: null, obs: '' })

function tipoBadge(t) { return { insumo:'badge-muted', base:'badge-blue', final:'badge-gold', embalagem:'badge-orange' }[t]||'badge-muted' }
function tipoLabel(t) { return { insumo:'Insumo', base:'Base', final:'Final', embalagem:'Embalagem' }[t]||t||'-' }
function estoqueBaixo(p) { return +(p.estoque_atual||0) <= +(p.estoque_minimo||0) && +(p.estoque_minimo||0) > 0 }

function abrir(p) {
  Object.assign(form, { id: null, uuid: null, nome: '', tipo: 'insumo', unidade_compra: 'kg', unidade_base: 'g', fator_conversao: 1000, estoque_atual: 0, estoque_minimo: 0, custo_por_unidade: 0, ...(p || {}) })
  modal.value = 'insumo'
}
function abrirCompra(p) { Object.assign(compra, { produto: p, qtd: null, custo: null, obs: '' }); modal.value = 'compra' }

async function salvar() {
  if (!form.nome.trim()) return
  saving.value = true
  try { await s.salvarProduto({ ...form }); modal.value = null } finally { saving.value = false }
}
async function excluir() {
  if (!confirm(`Excluir "${form.nome}"?`)) return
  await s.excluirProduto(form.id); modal.value = null
}
async function salvarCompra() {
  saving.value = true
  try { await s.registrarCompra(compra.produto.id, compra.qtd, compra.custo||0, compra.obs); modal.value = null } finally { saving.value = false }
}

function listaCompras() {
  if (!s.baixoEstoque.length) { s.notify('Nenhum item com estoque baixo', 'warning'); return }
  alert('📋 Lista de Compras:\n\n' + s.baixoEstoque.map(p => `• ${p.nome}: ${fmtQ(p.estoque_atual, p.unidade_base)} (mín: ${fmtQ(p.estoque_minimo, p.unidade_base)})`).join('\n'))
}
</script>

<style scoped>
.hidden { display: none; }
.loading-box { display: flex; justify-content: center; padding: 40px; }
.pointer { cursor: pointer; }
.mt-12 { margin-top: 12px; }
.spacer { flex: 1; }
</style>
