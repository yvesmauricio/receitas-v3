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
      <div v-for="r in lista" :key="r.uuid" class="list-row">
        <div class="row-info pointer" @click="abrir(r)">
          <div class="row-name">{{ r.nome }}</div>
          <div class="row-sub">
            <span class="badge" :class="r.eh_intermediaria ? 'badge-blue' : 'badge-gold'">
              {{ r.eh_intermediaria ? '🥣 Base' : '🍫 Final' }}
            </span>
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
      <button v-if="!busca" class="btn btn-primary mt-12" @click="abrir(null)">
        <i class="fas fa-plus"></i> Nova Receita
      </button>
    </div>

    <!-- Modal Receita -->
    <BaseModal v-if="modal === 'receita'" :title="form.uuid ? 'Editar Receita' : 'Nova Receita'" @close="modal = null">
      <div class="fg">
        <label class="label label-req">Nome</label>
        <input v-model="form.nome" class="input" autofocus placeholder="Ex: Trufa Tradicional" />
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Tipo</label>
          <select v-model="form.eh_intermediaria" class="input">
            <option :value="0">🍫 Produto Final</option>
            <option :value="1">🥣 Base / Recheio</option>
          </select>
        </div>
        <div class="fg">
          <label class="label">Categoria</label>
          <select v-model="form.categoria" class="input">
            <option value="">Nenhuma</option>
            <option v-for="c in ['Trufa','Cone','Barra','Brownie','Bolo','Ovo','Base']" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Rendimento (Qtd)</label>
          <input v-model.number="form.rendimento" class="input" type="number" min="0" step="0.01" placeholder="Ex: 10" />
        </div>
        <div class="fg">
          <label class="label">Unidade</label>
          <select v-model="form.unidade_rendimento" class="input">
            <option v-for="u in ['un','g','kg','pct','caixa']" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Peso Unit. (g)</label>
          <input v-model.number="form.peso_unitario" class="input" type="number" inputmode="decimal" placeholder="Ex: 30" />
        </div>
        <div class="fg">
          <label class="label">Preço Sugerido (R$)</label>
          <input 
            :value="maskMoney(form.preco_sugerido)" 
            @input="e => form.preco_sugerido = parseMoney(e.target.value)"
            class="input" 
            type="text" 
            inputmode="numeric" 
            placeholder="0,00" 
          />
        </div>
      </div>

      <div v-if="s.getCustoTotal(form) > 0" class="profit-box">
        <div v-if="totalIngredientesG > 0" class="profit-details">
          <div class="profit-item">
            <span>Total ingredientes:</span>
            <strong>{{ totalIngredientesG.toFixed(2) }} g</strong>
          </div>
          <div v-if="pesoEsperado && !form.eh_intermediaria" class="profit-item">
            <span>Peso esperado:</span>
            <strong>{{ pesoEsperado.toFixed(2) }} g</strong>
          </div>
          <div v-if="pesoEsperado && !form.eh_intermediaria" class="profit-item" :class="Math.abs(diferencaPeso) > 1 ? 'highlight-warn' : 'highlight-ok'">
            <span>Diferença:</span>
            <strong>{{ diferencaPeso > 0 ? '+' : '' }}{{ diferencaPeso.toFixed(2) }} g</strong>
          </div>
        </div>
        <div class="profit-divider"></div>
        <div class="profit-item">
          <span>Custo Total:</span>
          <strong>{{ R$(s.getCustoTotal(form)) }}</strong>
        </div>
        <div class="profit-item">
          <span>Custo por {{ form.unidade_rendimento }}:</span>
          <strong>{{ R$(s.getCustoTotal(form) / (form.rendimento || 1)) }}</strong>
        </div>
        <div v-if="form.preco_sugerido" class="profit-item highlight">
          <span>💰 Lucro p/ {{ form.unidade_rendimento }}:</span>
          <strong>{{ R$(form.preco_sugerido - (s.getCustoTotal(form) / (form.rendimento || 1))) }}</strong>
        </div>
      </div>

      <div class="section-title">🧂 Ingredientes</div>

      <div v-if="!form.ingredientes.length" class="ing-empty">
        <i class="fas fa-info-circle"></i>
        Toque em <strong>+ Ingrediente</strong> para adicionar insumos (chocolate, leite condensado…) ou
        <strong>bases 🥣</strong> — outra receita usada como ingrediente, como um recheio pronto.
      </div>

      <div v-for="(ing, i) in form.ingredientes" :key="ing._key" class="ingredient-row">
        <button
          class="ing-select-btn"
          :class="ing.tipo === 'receita' ? 'is-base' : 'is-insumo'"
          @click="abrirPicker(i)"
        >
          <span class="ing-badge">{{ ing.tipo === 'receita' ? '🥣' : '📦' }}</span>
          <span class="ing-nome">{{ getNomeIng(ing) || 'Toque para selecionar…' }}</span>
          <i class="fas fa-chevron-down ing-chevron"></i>
        </button>
        <div class="ing-qtd-group">
          <input
            v-model.number="ing.quantidade"
            class="input ing-qtd-input"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.001"
            placeholder="0"
          />
          <span class="ing-unidade">{{ getUnidade(ing) }}</span>
          <div class="ing-cost">{{ R$(getCustoComposicao(ing)) }}</div>
        </div>
        <button class="btn-icon danger ing-del" @click="removerIngrediente(i)">
          <i class="fas fa-trash"></i>
        </button>
      </div>

      <button class="btn btn-secondary btn-full ing-add-btn" @click="addNovoItem">
        <i class="fas fa-plus"></i> Ingrediente
      </button>

      <div class="fg mt-16">
        <label class="label">Modo de Preparo</label>
        <textarea v-model="form.modo_preparo" class="input textarea-v" rows="3" placeholder="Passo a passo…"></textarea>
      </div>

      <template #foot>
        <button v-if="form.uuid" class="btn btn-danger" @click="excluir"><i class="fas fa-trash"></i></button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="modal = null">Cancelar</button>
        <button class="btn btn-primary" :disabled="!form.nome || saving" @click="salvar">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ form.uuid ? 'Salvar' : 'Criar' }}</span>
        </button>
      </template>
    </BaseModal>

    <!-- Modal Produção rápida -->
    <BaseModal v-if="modal === 'producao'" title="Registrar Produção" @close="modal = null">
      <div class="prod-summary">
        <div style="font-size:1rem;font-weight:700;">{{ prod.receita?.nome }}</div>
        <div style="font-size:.8rem;color:var(--muted);margin-top:2px;">
          Rende: {{ prod.receita?.rendimento }} {{ prod.receita?.unidade_rendimento }}
        </div>
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label label-req">Quantidade</label>
          <input v-model.number="prod.qtd" class="input" type="number" inputmode="decimal" placeholder="0,00" />
        </div>
        <div class="fg">
          <label class="label">Unidade</label>
          <input :value="prod.receita?.unidade_rendimento || 'un'" class="input input-ro" readonly />
        </div>
      </div>
      <div class="fg">
        <label class="label">Data/Hora</label>
        <input v-model="prod.dt" class="input" type="datetime-local" />
      </div>
      <template #foot>
        <button class="btn btn-secondary" @click="modal = null">Cancelar</button>
        <button class="btn btn-primary" :disabled="!prod.qtd || saving" @click="salvarProducao">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-industry"></i> Registrar
        </button>
      </template>
    </BaseModal>

    <!-- Modal Picker de Ingredientes -->
    <BaseModal v-if="modal === 'picker'" title="Adicionar Ingrediente" @close="modal = 'receita'">
      <div class="search-wrap mt-8">
        <i class="fas fa-search search-icon"></i>
        <input
          v-model="pickerSearch"
          class="search-input"
          type="search"
          placeholder="Buscar ou digitar para criar…"
          autofocus
        />
      </div>

      <div class="chips mt-10">
        <button v-for="t in pickerTabs" :key="t.v" class="chip" :class="{ active: pickerTab === t.v }" @click="pickerTab = t.v">
          {{ t.l }}
        </button>
      </div>

      <div class="picker-list mt-10">
        <!-- Criar novo insumo -->
        <div v-if="podeCriarNovo" class="picker-row picker-criar" @click="criarNovoInsumo">
          <span class="picker-criar-icon"><i class="fas fa-plus"></i></span>
          <div class="picker-row-info">
            <div class="picker-row-nome">Criar "{{ pickerSearch.trim() }}" como insumo</div>
            <div class="picker-row-sub">Será cadastrado em gramas automaticamente</div>
          </div>
        </div>

        <!-- Bases -->
        <template v-if="pickerTab !== 'insumos' && pickerBases.length">
          <div class="picker-grupo-label">🥣 Bases / Recheios (de outra receita)</div>
          <div
            v-for="item in pickerBases"
            :key="item.key"
            class="picker-row picker-row-base"
            @click="selecionarItem(item)"
          >
            <span class="picker-tipo-badge">🥣</span>
            <div class="picker-row-info">
              <div class="picker-row-nome">{{ item.nome }}</div>
              <div class="picker-row-sub">Rende {{ item.rendimento }} {{ item.unidade }} • Base</div>
            </div>
            <i class="fas fa-plus c-gold"></i>
          </div>
        </template>

        <!-- Insumos -->
        <template v-if="pickerTab !== 'bases' && pickerInsumos.length">
          <div class="picker-grupo-label">📦 Insumos</div>
          <div
            v-for="item in pickerInsumos"
            :key="item.key"
            class="picker-row"
            @click="selecionarItem(item)"
          >
            <span class="picker-tipo-badge">📦</span>
            <div class="picker-row-info">
              <div class="picker-row-nome">{{ item.nome }}</div>
              <div class="picker-row-sub">{{ item.unidade }} • Insumo</div>
            </div>
            <i class="fas fa-plus c-gold"></i>
          </div>
        </template>

        <div v-if="!pickerBases.length && !pickerInsumos.length && !podeCriarNovo" class="picker-vazio">
          Nenhum item encontrado
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar, nowLocal, maskMoney, parseMoney } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'

const s = useStore()

const busca  = ref('')
const modal  = ref(null)
const saving = ref(false)

const pickerSearch = ref('')
const pickerTab    = ref('todos')
const pickerIndex  = ref(null)

const pickerTabs = [
  { v: 'todos',   l: 'Tudo'     },
  { v: 'insumos', l: '📦 Insumos' },
  { v: 'bases',   l: '🥣 Bases'   }
]

const form = reactive({
  uuid: null, nome: '', categoria: '', eh_intermediaria: 0,
  rendimento: null, unidade_rendimento: 'un',
  peso_unitario: null, preco_sugerido: null, modo_preparo: '', ingredientes: []
})

/* ── Picker ──────────────────────────────────────────────── */
const pickerInsumos = computed(() => {
  const q = normalizar(pickerSearch.value)
  return s.produtos
    .filter(p => !q || normalizar(p.nome).includes(q))
    .map(p => ({ id: p.uuid, nome: p.nome, tipo: 'produto', unidade: p.unidade_base || 'g', key: 'p' + p.uuid }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
})

const pickerBases = computed(() => {
  const q = normalizar(pickerSearch.value)
  return s.receitas
    .filter(r => r.uuid !== form.uuid && (!q || normalizar(r.nome).includes(q)))
    .map(r => ({ id: r.uuid, nome: r.nome, tipo: 'receita', unidade: r.unidade_rendimento || 'g', rendimento: r.rendimento || '?', key: 'r' + r.uuid }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
})

const podeCriarNovo = computed(() => {
  const nome = pickerSearch.value.trim()
  if (!nome) return false
  const q = normalizar(nome)
  return !s.produtos.some(p => normalizar(p.nome) === q) && !s.receitas.some(r => normalizar(r.nome) === q)
})

/* ── Custo / Peso ────────────────────────────────────────── */
const totalIngredientesG = computed(() => {
  let total = 0

  for (const ing of form.ingredientes) {
    if (!ing?.id) continue

    const qtd = Number(ing.quantidade || 0)
    if (qtd <= 0) continue

    // 📦 PRODUTO
    if (ing.tipo === 'produto') {
      const p = s.produtos.find(x => x.uuid === ing.id)

      // embalagem não entra no peso
      if (!p || p.tipo === 'embalagem') continue

      total += qtd
      continue
    }

    // 🥣 RECEITA (BASE)
    if (ing.tipo === 'receita') {
      const sub = s.receitas.find(r => r.uuid === ing.id)
      if (!sub) continue

      const unit = String(sub.unidade_rendimento || '').toLowerCase().trim()

      if (unit === 'g') {
        total += qtd
      } else if (unit === 'kg') {
        total += qtd * 1000
      } else if (unit === 'un') {
        const pesoUnit = Number(sub.peso_unitario || 0)

        if (pesoUnit > 0) {
          total += qtd * pesoUnit
        } else {
          console.warn('⚠️ Base sem peso_unitario:', sub.nome)
        }
      } else {
        // fallback seguro
        total += qtd
      }
    }
  }

  return total
})
const pesoEsperado  = computed(() => (!form.rendimento || !form.peso_unitario) ? null : form.rendimento * form.peso_unitario)
const diferencaPeso = computed(() => !pesoEsperado.value ? 0 : totalIngredientesG.value - pesoEsperado.value)

/* ── Watchers ────────────────────────────────────────────── */
watch(() => form.ingredientes, () => {
  if (!form.eh_intermediaria) return
  const total = totalIngredientesG.value
  if (total > 0) { 
    form.rendimento = total
    form.unidade_rendimento = 'g'
    // Para bases/recheios em 'g', o peso unitário deve ser 1 para consistência.
    // Se já foi definido pelo usuário, mantemos. Caso contrário, forçamos 1.
    if (form.unidade_rendimento === 'g' && (form.peso_unitario === null || form.peso_unitario === undefined || form.peso_unitario === 0)) {
      form.peso_unitario = 1
    }
  }
}, { deep: true })

watch(() => form.nome, (v) => {
  if (form.uuid || !v) return
  const n = normalizar(v)
  if      (n.includes('trufa'))   form.categoria = 'Trufa'
  else if (n.includes('cone'))    form.categoria = 'Cone'
  else if (n.includes('barra'))   form.categoria = 'Barra'
  else if (n.includes('brownie')) form.categoria = 'Brownie'
  else if (n.includes('bolo'))    form.categoria = 'Bolo'
  else if (n.includes('ovo'))     form.categoria = 'Ovo'
  else if (n.includes('recheio')) form.categoria = 'Base'
})
watch(() => form.eh_intermediaria, (val) => {
  if (!form.uuid && val === 1) form.categoria = 'Base'
})

/* ── Helpers ─────────────────────────────────────────────── */
function getNomeIng(ing) {
  if (!ing.id) return ''
  const alvo = ing.tipo === 'receita' ? s.receitas.find(r => r.uuid === ing.id) : s.produtos.find(p => p.uuid === ing.id)
  return alvo?.nome || '⚠️ Removido'
}
function getUnidade(ing) {
  if (ing.tipo === 'receita') return s.receitas.find(r => r.uuid === ing.id)?.unidade_rendimento || 'g'
  return s.produtos.find(p => p.uuid === ing.id)?.unidade_base || 'g'
}

/**
 * Calcula o custo de um ingrediente específico (produto ou sub-receita)
 * dentro da receita atual.
 * @param {object} ing - O objeto ingrediente da lista form.ingredientes.
 * @returns {number} O custo total desse ingrediente para a quantidade especificada.
 */
function getCustoComposicao(ing) {
  const qtd = Number(ing.quantidade || 0);
  if (qtd <= 0 || !ing.id) return 0;

  if (ing.tipo === 'receita') {
    const sub = s.receitas.find(r => r.uuid === ing.id);
    if (!sub || !sub.rendimento) return 0;
    return (s.getCustoTotal(sub) / (sub.rendimento || 1)) * qtd;
  } else { // ing.tipo === 'produto'
    const prod = s.produtos.find(p => p.uuid === ing.id);
    if (!prod || !prod.fator_conversao) return 0;
    const custoUnit = (prod.custo_por_unidade || 0) / (prod.fator_conversao || 1);
    return custoUnit * qtd;
  }
}

/* ── Ingredientes ────────────────────────────────────────── */
function addNovoItem() {
  form.ingredientes.push({ _key: Math.random().toString(36).slice(2, 11), id: '', tipo: 'produto', quantidade: null })
  abrirPicker(form.ingredientes.length - 1)
}
function abrirPicker(idx) {
  pickerIndex.value = idx
  pickerSearch.value = ''
  pickerTab.value = 'todos'
  modal.value = 'picker'
}
function removerIngrediente(idx) { form.ingredientes.splice(idx, 1) }

function selecionarItem(item) {
  const ing = form.ingredientes[pickerIndex.value]
  ing.id = item.id; ing.tipo = item.tipo
  modal.value = 'receita'
}

async function criarNovoInsumo() {
  const nome = pickerSearch.value.trim()
  if (!nome) return
  const existente = s.produtos.find(p => normalizar(p.nome) === normalizar(nome))
  let produto = existente
  if (!produto) {
    const novo = { uuid: crypto.randomUUID(), nome, unidade_base: 'g' }
    await s.salvarProduto(novo)
    produto = novo
  }
  const ing = form.ingredientes[pickerIndex.value]
  ing.id = produto.uuid; ing.tipo = 'produto'
  modal.value = 'receita'
}

/* ── Lista ───────────────────────────────────────────────── */
const lista = computed(() => {
  let r = s.receitas
  if (busca.value.trim()) { const q = normalizar(busca.value); r = r.filter(x => normalizar(x.nome).includes(q)) }
  return [...r].sort((a, b) => a.nome?.localeCompare(b.nome))
})

const prod = reactive({ receita: null, qtd: null, dt: nowLocal() })

/* ── Modal ───────────────────────────────────────────────── */
function abrir(r) {
  Object.assign(form, {
    uuid: null, nome: '', categoria: '', eh_intermediaria: 0,
    rendimento: null, unidade_rendimento: 'un', peso_unitario: null,
    preco_sugerido: null, modo_preparo: '', ingredientes: []
  })
  if (r) Object.assign(form, {
    uuid: r.uuid, nome: r.nome, categoria: r.categoria,
    eh_intermediaria: r.eh_intermediaria, rendimento: r.rendimento,
    unidade_rendimento: r.unidade_rendimento, peso_unitario: r.peso_unitario,
    preco_sugerido: r.preco_sugerido, modo_preparo: r.modo_preparo,
    ingredientes: (r.ingredientes || []).map(i => ({ ...i, _key: i.id + Math.random() }))
  })
  modal.value = 'receita'
}

/* ── Salvar / Excluir ────────────────────────────────────── */
async function salvar() {
  if (!form.eh_intermediaria && pesoEsperado.value && Math.abs(diferencaPeso.value) > 1) {
    s.notify('Peso da receita não bate com o rendimento!', 'error'); return
  }
  saving.value = true
  try {
    const payload = { ...form }
    if (!payload.uuid) payload.uuid = crypto.randomUUID()
    payload.ingredientes = payload.ingredientes.map(({ _key, ...rest }) => rest)
    await s.salvarReceita(payload)
    modal.value = null
  } finally { saving.value = false }
}

async function excluir() {
  if (!form.uuid) return
  if (!confirm(`Excluir "${form.nome}"?`)) return
  await s.excluirReceita(form.uuid); modal.value = null
}

async function salvarProducao() {
  saving.value = true
  try {
    await s.registrarProducao({
      uuid: crypto.randomUUID(), receita_id: prod.receita.uuid,
      receita_nome: prod.receita.nome, quantidade_produzida: prod.qtd,
      unidade_rendimento: prod.receita.unidade_rendimento || 'un',
      eh_intermediaria: prod.receita.eh_intermediaria, data_producao: prod.dt
    })
    modal.value = null
  } finally { saving.value = false }
}
</script>

<style scoped>
.loading-box { display:flex; justify-content:center; padding:40px; }
.pointer     { cursor:pointer; }
.spacer      { flex:1; }
.mt-8  { margin-top:8px; }
.mt-10 { margin-top:10px; }
.mt-12 { margin-top:12px; }
.mt-16 { margin-top:16px; }

.recipe-price { color:var(--green); font-weight:700; font-family:var(--mono); }
.recipe-cost  { font-size:.78rem; color:var(--muted); }

/* Profit box */
.profit-box { background:var(--green-bg); border:1px solid var(--green-dim); border-radius:var(--r-md); padding:12px 14px; margin:12px 0; display:flex; flex-direction:column; gap:5px; }
.profit-details { display:flex; flex-direction:column; gap:5px; }
.profit-divider { height:1px; background:var(--green-dim); margin:4px 0; }
.profit-item { display:flex; justify-content:space-between; font-size:.85rem; color:var(--text); }
.profit-item.highlight { padding-top:6px; border-top:1px dashed var(--green-dim); color:var(--green); font-size:.9rem; }
.profit-item.highlight-warn { color:var(--orange); }
.profit-item.highlight-ok { color:var(--green); opacity: 0.8; }

/* Section title */
.section-title { font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:16px 0 8px; }

/* Ingrediente vazio */
.ing-empty { background:var(--cream); border:1px dashed var(--border2); border-radius:var(--r-md); padding:12px 14px; font-size:.85rem; color:var(--muted); line-height:1.6; margin-bottom:10px; }
.ing-empty i { color:var(--brown-light); margin-right:4px; }

/* Linha de ingrediente */
.ingredient-row { display:flex; align-items:center; gap:6px; margin-bottom:8px; }

/* Botão seletor de ingrediente */
.ing-select-btn {
  flex:1; min-width:0;
  display:flex; align-items:center; gap:6px;
  padding:9px 10px;
  border-radius:var(--r-sm);
  border:1.5px solid var(--border);
  background:var(--surface);
  text-align:left;
  transition:border-color var(--t), background var(--t);
}
.ing-select-btn:active { transform:scale(.98); }
.ing-select-btn.is-insumo { border-color:var(--border2); }
.ing-select-btn.is-base   { border-color:#93c5fd; background:#eff6ff; }

.ing-badge   { font-size:1rem; flex-shrink:0; }
.ing-nome    { flex:1; font-size:.85rem; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.ing-chevron { font-size:.7rem; color:var(--muted); flex-shrink:0; }

/* Quantidade */
.ing-qtd-group { display:flex; align-items:center; gap:3px; flex-shrink:0; }
.ing-qtd-input { width:68px; padding:9px 8px; text-align:right; font-size:.9rem; }
.ing-unidade   { font-size:.75rem; color:var(--muted); min-width:20px; }
.ing-cost {
  font-size: .85rem; font-weight: 700; color: var(--brown);
  min-width: 60px; text-align: right; flex-shrink: 0;
}
.ing-del       { flex-shrink:0; }
.ing-add-btn   { margin-top:6px; }

.textarea-v { resize:vertical; }

.prod-summary { background:var(--cream); border-radius:var(--r-md); padding:12px 14px; margin-bottom:14px; }

.picker-list { display:flex; flex-direction:column; gap:2px; }
.picker-grupo-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); padding:12px 4px 6px; }
.picker-row {
  display:flex; align-items:center; gap:10px;
  padding:11px 12px; border-radius:var(--r-sm);
  border:1px solid var(--border); background:var(--surface);
  cursor:pointer; transition:background var(--t), border-color var(--t);
}
.picker-row:active { background:var(--gold-bg); }
.picker-row-base { border-color:#bfdbfe; background:#f0f8ff; }
.picker-row-base:active { background:#dbeafe; }
.picker-criar { border-color:var(--green-dim); background:var(--green-bg); }
.picker-criar:active { background:#d1fae5; }
.picker-criar-icon {
  width:32px; height:32px; border-radius:50%;
  background:var(--green); color:#fff;
  display:flex; align-items:center; justify-content:center;
  font-size:.85rem; flex-shrink:0;
}
.picker-tipo-badge { font-size:1.1rem; flex-shrink:0; }
.picker-row-info { flex:1; min-width:0; }
.picker-row-nome { font-size:.9rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.picker-row-sub  { font-size:.78rem; color:var(--muted); margin-top:2px; }
.picker-vazio    { text-align:center; color:var(--muted); font-size:.875rem; padding:24px 0; }
.c-gold { color:var(--gold); }
</style>
