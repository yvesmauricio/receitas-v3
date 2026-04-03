<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-book-open"></i> Receitas</h2>
        <div class="tab-actions">
          <button class="btn-primary-sm" @click="abrir(null)"><i class="fas fa-plus"></i> Nova</button>
        </div>
      </div>
      <div class="search-wrap">
        <i class="fas fa-search search-icon"></i>
        <input v-model="busca" class="search-input" type="search" placeholder="Buscar receita…" />
      </div>
    </div>

    <div v-if="s.loading" class="loading-box">
      <div class="spinner spinner-sm"></div>
    </div>

    <template v-else-if="lista.length">
      <div v-for="r in lista" :key="r.id || r.uuid" class="list-row">
        <div class="row-info pointer" @click="abrir(r)">
          <div class="row-name">{{ r.nome }}</div>
          <div class="row-sub">
            <span class="badge" :class="r.eh_intermediaria ? 'badge-blue' : 'badge-gold'">{{ r.eh_intermediaria ? 'Base'
              : 'Final' }}</span>
            <span v-if="r.rendimento">Rende: {{ r.rendimento }} {{ r.unidade_rendimento }}</span>
            <span v-if="r.preco_sugerido" class="recipe-price">{{ R$(r.preco_sugerido) }}</span>
            <span v-if="s.getCustoTotal(r)" class="recipe-cost">Custo: {{ R$(s.getCustoTotal(r)) }}</span>
          </div>
        </div>
        <div class="row-acts">
          <button class="btn-icon" title="Editar" @click.stop="abrir(r)"><i class="fas fa-pencil"></i></button>
        </div>
      </div>
    </template>

    <div v-else class="empty">
      <i class="fas fa-book-open"></i>
      <h3>{{ busca ? 'Nenhum resultado' : 'Nenhuma receita ainda' }}</h3>
      <button v-if="!busca" class="btn btn-primary mt-12" @click="abrir(null)"><i class="fas fa-plus"></i> Nova
        Receita</button>
    </div>

    <!-- ─── Modal Receita ─────────────────────────────────────── -->
    <BaseModal v-if="modal === 'receita'" :title="form.id ? 'Editar Receita' : 'Nova Receita'" @close="modal = null">
      <div class="fg"><label class="label label-req">Nome</label><input v-model="form.nome" class="input" autofocus />
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Tipo</label>
          <select v-model="form.eh_intermediaria" class="input">
            <option :value="0">Produto Final</option>
            <option :value="1">Base/Recheio</option>
          </select>
        </div>
        <div class="fg">
          <label class="label">Categoria</label>
          <select v-model="form.categoria" class="input">
            <option value="">Nenhuma</option>
            <option v-for="c in ['Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']" :key="c" :value="c">{{ c
              }}
            </option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="fg"><label class="label">Rendimento (Qtd)</label><input v-model.number="form.rendimento"
            class="input" type="number" min="0" step="0.01" /></div>
        <div class="fg">
          <label class="label">Unidade</label>
          <select v-model="form.unidade_rendimento" class="input">
            <option v-for="u in ['un', 'g', 'kg', 'pct', 'caixa']" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="fg"><label class="label">Peso Unit. (g)</label><input v-model.number="form.peso_unitario"
            class="input" type="number" min="0" step="0.1" /></div>
        <div class="fg"><label class="label">Preço Sugerido (R$)</label><input v-model.number="form.preco_sugerido"
            class="input" type="number" min="0" step="0.01" /></div>
      </div>

      <div v-if="s.getCustoTotal(form) > 0" class="profit-box">
        <div v-if="totalIngredientes > 0" class="profit-box">

          <div class="profit-item">
            <span>Total ingredientes:</span>
            <strong>{{ totalIngredientes.toFixed(2) }} g</strong>
          </div>

          <div v-if="pesoEsperado" class="profit-item">
            <span>Peso esperado:</span>
            <strong>{{ pesoEsperado.toFixed(2) }} g</strong>
          </div>

          <div v-if="pesoEsperado" class="profit-item" :class="Math.abs(diferencaPeso) > 1 ? 'highlight' : ''">
            <span>Diferença:</span>
            <strong>{{ diferencaPeso.toFixed(2) }} g</strong>
          </div>

        </div>
        <div class="profit-item"><span>Custo Total Produção:</span> <strong>{{ R$(s.getCustoTotal(form)) }}</strong>
        </div>
        <div class="profit-item"><span>Custo por {{ form.unidade_rendimento }}:</span> <strong>{{
          R$(s.getCustoTotal(form) /
            (form.rendimento || 1)) }}</strong></div>
        <div v-if="form.preco_sugerido" class="profit-item highlight">
          <span>Lucro p/ {{ form.unidade_rendimento }}:</span> <strong>{{ R$(form.preco_sugerido -
            (s.getCustoTotal(form) /
              (form.rendimento || 1))) }}</strong>
        </div>
      </div>

      <div class="section-title">Ingredientes</div>
      <div v-for="(ing, i) in form.ingredientes" :key="i" class="ingredient-row">
        <div class="ing-name-wrap pointer" @click="abrirPicker(i)">
          <div class="ing-label">{{ getNomeIng(ing) || 'Selecionar...' }}</div>
        </div>
        <input v-model.number="ing.quantidade" class="input flex-1" type="number" min="0" step="0.001"
          placeholder="Qtd" />
        <span class="unit-tag">{{ getUnidade(ing) }}</span>
        <button class="btn-icon danger" @click="form.ingredientes.splice(i, 1)"><i class="fas fa-trash"></i></button>
      </div>
      <button class="btn btn-secondary btn-full mt-4" @click="addNovoItem">
        <i class="fas fa-plus"></i> Ingrediente
      </button>

      <div class="fg mt-12"><label class="label">Modo de Preparo</label><textarea v-model="form.modo_preparo"
          class="input textarea-v" rows="3"></textarea></div>

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

    <!-- ─── Modal Produção rápida ──────────────────────────────── -->
    <BaseModal v-if="modal === 'producao'" title="Registrar Produção" @close="modal = null">
      <div class="prod-summary">
        <div style="font-size:.9rem;font-weight:700;">{{ prod.receita?.nome }}</div>
        <div style="font-size:.75rem;color:var(--muted);margin-top:2px;">Rende: {{ prod.receita?.rendimento }} {{
          prod.receita?.unidade_rendimento }}</div>
      </div>
      <div class="grid-2">
        <div class="fg"><label class="label label-req">Quantidade</label><input v-model.number="prod.qtd" class="input"
            type="number" min="0.001" step="0.01" autofocus /></div>
        <div class="fg"><label class="label">Unidade</label><input :value="prod.receita?.unidade_rendimento || 'un'"
            class="input input-ro" readonly /></div>
      </div>
      <div class="fg"><label class="label">Data/Hora</label><input v-model="prod.dt" class="input"
          type="datetime-local" />
      </div>
      <template #foot>
        <button class="btn btn-secondary" @click="modal = null">Cancelar</button>
        <button class="btn btn-primary" :disabled="!prod.qtd || saving" @click="salvarProducao">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-industry"></i> Registrar
        </button>
      </template>
    </BaseModal>

    <!-- ─── Modal Seletor de Ingredientes (Picker) ────────────── -->
    <BaseModal v-if="modal === 'picker'" title="Selecionar Item" @close="modal = 'receita'">
      <div class="search-wrap">
        <i class="fas fa-search search-icon"></i>
        <input v-model="pickerSearch" class="search-input" type="search" placeholder="Buscar insumo ou base..."
          autofocus />
      </div>
      <div class="chips mt-12">
        <button v-for="t in pickerTabs" :key="t.v" class="chip" :class="{ active: pickerTab === t.v }"
          @click="pickerTab = t.v">{{ t.l }}</button>
      </div>
      <div class="picker-list mt-12">
        <div v-for="item in itensParaAdicionar" :key="item.key" class="list-row pointer"
          @click="selecionarNoPicker(item)">
          <div class="row-info">
            <div class="row-name">{{ item.nome }}</div>
            <div class="row-sub"><span>{{ item.tipo === 'receita' ? 'Base' : 'Insumo' }}</span> • <span>{{ item.unidade
                }}</span></div>
          </div>
          <i class="fas fa-plus c-gold"></i>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar, nowLocal } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'

const s = useStore()

const busca = ref('')
const modal = ref(null)
const saving = ref(false)

const pickerSearch = ref('')
const pickerTab = ref('todos')
const pickerIndex = ref(null)

const pickerTabs = [
  { v: 'todos', l: 'Tudo' },
  { v: 'insumos', l: 'Insumos' },
  { v: 'bases', l: 'Bases' }
]

/* ─────────────────────────────────────────────
   🧾 FORM
───────────────────────────────────────────── */
const form = reactive({
  uuid: null,
  nome: '',
  categoria: '',
  eh_intermediaria: 0,
  rendimento: null,
  unidade_rendimento: 'un',
  peso_unitario: null,
  preco_sugerido: null,
  modo_preparo: '',
  ingredientes: []
})

/* ─────────────────────────────────────────────
   📦 ITENS DO PICKER
───────────────────────────────────────────── */
const itensParaAdicionar = computed(() => {
  const q = normalizar(pickerSearch.value)

  const insumos = s.produtos.map(p => ({
    id: p.uuid,
    nome: p.nome,
    tipo: 'produto',
    unidade: p.unidade_base,
    key: 'p' + p.uuid
  }))

  const bases = s.receitas
    .filter(r => r.uuid !== form.uuid)
    .map(r => ({
      id: r.uuid,
      nome: '🥣 ' + r.nome,
      tipo: 'receita',
      unidade: r.unidade_rendimento,
      key: 'r' + r.uuid
    }))

  let lista =
    pickerTab.value === 'todos'
      ? [...insumos, ...bases]
      : pickerTab.value === 'insumos'
        ? insumos
        : bases

  if (q) {
    lista = lista.filter(x =>
      normalizar(x.nome).includes(q)
    )
  }

  // ✨ NOVA PARTE: criar item se não existir
  const nomeDigitado = pickerSearch.value.trim()

  if (
    nomeDigitado &&
    !lista.some(i =>
      normalizar(i.nome) === normalizar(nomeDigitado)
    )
  ) {
    lista.unshift({
      id: null,
      nome: `➕ Criar "${pickerSearch.value}"`,
      tipo: 'novo',
      unidade: '',
      key: 'novo'
    })
  }

  return lista.sort((a, b) => a.nome.localeCompare(b.nome))
})

/* ─────────────────────────────────────────────
   ⚖️ CONTROLE DE PESO
───────────────────────────────────────────── */

// soma total dos ingredientes
const totalIngredientes = computed(() => {
  let total = 0

  for (const ing of form.ingredientes) {
    if (!ing.quantidade) continue

    if (ing.tipo === 'produto') {
      total += Number(ing.quantidade)
    }

    if (ing.tipo === 'receita') {
      const sub = s.receitas.find(r => r.uuid === ing.id)
      if (sub?.rendimento) {
        total += sub.rendimento * (ing.quantidade || 1)
      }
    }
  }

  return total
})

// peso esperado (ex: 10 trufas * 30g)
const pesoEsperado = computed(() => {
  if (!form.rendimento || !form.peso_unitario) return null
  return form.rendimento * form.peso_unitario
})

// diferença
const diferencaPeso = computed(() => {
  if (!pesoEsperado.value) return 0
  return totalIngredientes.value - pesoEsperado.value
})

/* ─────────────────────────────────────────────
   🍫 AUTO RENDIMENTO (BASES)
───────────────────────────────────────────── */
watch(() => form.ingredientes, () => {

  if (!form.eh_intermediaria) return

  let total = 0

  for (const ing of form.ingredientes) {
    if (ing.tipo === 'produto' && ing.quantidade) {
      total += Number(ing.quantidade)
    }
  }

  if (total > 0) {
    form.rendimento = total
    form.unidade_rendimento = 'g'
  }

}, { deep: true })

/* ─────────────────────────────────────────────
   🧠 HELPERS
───────────────────────────────────────────── */
function getNomeIng(ing) {
  if (!ing.id) return ''

  const alvo =
    ing.tipo === 'receita'
      ? s.receitas.find(r => r.uuid === ing.id)
      : s.produtos.find(p => p.uuid === ing.id)

  return alvo?.nome || 'Removido'
}

function getUnidade(ing) {
  if (ing.tipo === 'receita') {
    return s.receitas.find(r => r.uuid === ing.id)?.unidade_rendimento || ''
  }

  return s.produtos.find(p => p.uuid === ing.id)?.unidade_base || ''
}

/* ─────────────────────────────────────────────
   ➕ INGREDIENTES
───────────────────────────────────────────── */
function addNovoItem() {
  form.ingredientes.push({ id: '', tipo: 'produto', quantidade: null })
  abrirPicker(form.ingredientes.length - 1)
}

function abrirPicker(idx) {
  pickerIndex.value = idx
  pickerSearch.value = ''
  modal.value = 'picker'
}

async function selecionarNoPicker(item) {

  // 🆕 Criar novo insumo direto
  if (item.tipo === 'novo') {

    const nome = pickerSearch.value.trim()

    // evita duplicado inteligente
    const existente = s.produtos.find(p =>
      normalizar(p.nome) === normalizar(nome)
    )

    let produto

    if (existente) {
      produto = existente
    } else {
      produto = await s.salvarProduto({
        nome,
        unidade_base: 'g'
      })
    }

    const ing = form.ingredientes[pickerIndex.value]
    ing.id = produto.uuid
    ing.tipo = 'produto'

    modal.value = 'receita'
    return
  }

  // fluxo normal
  const ing = form.ingredientes[pickerIndex.value]
  ing.id = item.id
  ing.tipo = item.tipo

  modal.value = 'receita'
}

/* ─────────────────────────────────────────────
   📋 LISTA
───────────────────────────────────────────── */
const lista = computed(() => {
  let r = s.receitas

  if (busca.value.trim()) {
    const q = normalizar(busca.value)
    r = r.filter(x => normalizar(x.nome).includes(q))
  }

  return [...r].sort((a, b) => a.nome?.localeCompare(b.nome))
})

const prod = reactive({
  receita: null,
  qtd: null,
  dt: nowLocal()
})

/* ─────────────────────────────────────────────
   🧠 AUTO CATEGORIA
───────────────────────────────────────────── */
watch(() => form.nome, (newNome) => {
  if (form.uuid || !newNome) return

  const n = normalizar(newNome)

  if (n.includes('trufa')) form.categoria = 'Trufa'
  else if (n.includes('cone')) form.categoria = 'Cone'
  else if (n.includes('barra')) form.categoria = 'Barra'
  else if (n.includes('brownie')) form.categoria = 'Brownie'
  else if (n.includes('bolo')) form.categoria = 'Bolo'
  else if (n.includes('ovo')) form.categoria = 'Ovo'
  else if (n.includes('recheio')) form.categoria = 'Base'
})

watch(() => form.eh_intermediaria, (val) => {
  if (!form.uuid && val === 1) form.categoria = 'Base'
})

/* ─────────────────────────────────────────────
   🪟 MODAL
───────────────────────────────────────────── */
function abrir(r) {
  Object.assign(form, {
    uuid: null,
    nome: '',
    categoria: '',
    eh_intermediaria: 0,
    rendimento: null,
    unidade_rendimento: 'un',
    peso_unitario: null,
    preco_sugerido: null,
    modo_preparo: '',
    ingredientes: []
  })

  if (r) {
    Object.assign(form, {
      ...r,
      ingredientes: JSON.parse(JSON.stringify(r.ingredientes || []))
    })
  }

  modal.value = 'receita'
}

/* ─────────────────────────────────────────────
   💾 AÇÕES
───────────────────────────────────────────── */
async function salvar() {

  // 🚨 valida peso para produto final
  if (!form.eh_intermediaria && pesoEsperado.value) {

    if (Math.abs(diferencaPeso.value) > 1) {
      s.notify('Peso da receita não bate com o rendimento!', 'error')
      return
    }
  }

  saving.value = true

  try {
    await s.salvarReceita({ ...form })
    modal.value = null
  } finally {
    saving.value = false
  }
}

async function excluir() {
  if (!confirm(`Excluir "${form.nome}"?`)) return
  await s.excluirReceita(form.uuid)
  modal.value = null
}

async function salvarProducao() {
  saving.value = true
  try {
    await s.registrarProducao({
      receita_id: prod.receita.uuid,
      receita_nome: prod.receita.nome,
      quantidade_produzida: prod.qtd,
      unidade_rendimento: prod.receita.unidade_rendimento || 'un',
      eh_intermediaria: prod.receita.eh_intermediaria,
      data_producao: prod.dt
    })

    modal.value = null
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.loading-box {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.pointer {
  cursor: pointer;
}

.mt-12 {
  margin-top: 12px;
}

.mt-4 {
  margin-top: 4px;
}

.flex-1 {
  flex: 1;
}

.flex-2 {
  flex: 2;
}

.spacer {
  flex: 1;
}

.recipe-price {
  color: var(--green);
  font-weight: 700;
  font-family: var(--mono);
}

.section-title {
  font-size: .78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--muted);
  margin: 12px 0 8px;
}

.ingredient-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.unit-tag {
  font-size: .72rem;
  color: var(--muted);
  min-width: 22px;
  text-align: center;
}

.textarea-v {
  resize: vertical;
}

.prod-summary {
  background: var(--cream);
  border-radius: var(--r-md);
  padding: 11px 14px;
  margin-bottom: 14px;
}

.recipe-cost {
  font-size: .72rem;
  color: var(--muted);
  margin-left: 4px;
}

.profit-box {
  background: var(--green-bg);
  border: 1px solid var(--green-dim);
  border-radius: var(--r-md);
  padding: 12px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profit-item {
  display: flex;
  justify-content: space-between;
  font-size: .8rem;
  color: var(--text);
}

.profit-item.highlight {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--green-dim);
  color: var(--green);
  font-size: .85rem;
}
</style>
