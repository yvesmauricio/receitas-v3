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
          v-for="r in lista"
          :key="r.uuid"
          :row-id="r.uuid"
          :width="120"
        >
          <!-- Conteúdo principal -->
          <div class="list-row" @click="abrir(r)">
            <div class="recipe-icon" :class="r.eh_intermediaria ? 'badge-blue' : 'badge-gold'">
              <i :class="r.eh_intermediaria ? 'fas fa-blender' : 'fas fa-cookie-bite'"></i>
            </div>
            <div class="row-info">
              <div class="row-name">{{ r.nome }}</div>
              <div class="row-sub">
                <span class="recipe-price">Venda: {{ R$(r.preco_sugerido || 0) }}</span>
                <span class="recipe-dot">•</span>
                <span class="recipe-profit" :class="{ negative: getLucroValor(r) < 0 }">
                  Lucro: {{ R$(getLucroValor(r)) }} ({{ getLucroPercentual(r) }})
                </span>
              </div>
            </div>
            <span class="badge recipe-type-tag" :class="r.eh_intermediaria ? 'badge-blue' : 'badge-gold'">
              {{ r.eh_intermediaria ? 'Base/Recheio' : 'Produto final' }}
            </span>
            <i class="fas fa-chevron-right row-chevron"></i>
          </div>

          <!-- Ações de swipe -->
          <template #actions>
            <button class="swipe-btn edit" @click="abrir(r)">
              <i class="fas fa-pencil"></i>
              <span>Editar</span>
            </button>
            <button class="swipe-btn del" @click="excluirDieto(r)">
              <i class="fas fa-trash"></i>
              <span>Excluir</span>
            </button>
          </template>
        </SwipeRow>
      </template>

      <div v-else class="empty">
        <i class="fas fa-book-open"></i>
        <h3>{{ busca ? 'Nenhum resultado' : 'Nenhuma receita ainda' }}</h3>
        <button v-if="!busca" class="btn btn-primary mt-12" @click="abrir(null)">
          <i class="fas fa-plus"></i> Nova Receita
        </button>
      </div>
    </section>

    <!-- ─── Modal Receita ──────────────────────────────────────── -->
    <BaseModal v-if="modal === 'receita'" :title="form.uuid ? 'Editar Receita' : 'Nova Receita'" @close="fecharModal">
      <div class="fg">
        <label class="label label-req">Nome</label>
        <input v-model="form.nome" class="input" autofocus placeholder="Ex: Trufa Tradicional" />
      </div>
      <div class="fg">
        <label class="label">Tipo</label>
        <div class="segmented" :class="{ 'is-base': Number(form.eh_intermediaria) === 1 }">
          <div class="segmented-thumb"></div>
          <button
            type="button"
            class="segmented-btn"
            :class="{ active: Number(form.eh_intermediaria) === 0 }"
            @click="form.eh_intermediaria = 0"
          >
            <span class="choice-icon">🍫</span>
            <span class="choice-text">Produto final</span>
          </button>
          <button
            type="button"
            class="segmented-btn"
            :class="{ active: Number(form.eh_intermediaria) === 1 }"
            @click="form.eh_intermediaria = 1"
          >
            <span class="choice-icon">🥣</span>
            <span class="choice-text">Base/Recheio</span>
          </button>
        </div>
      </div>
      <div class="fg">
        <label class="label">Categoria</label>
        <div class="chips-elegant">
          <button
            type="button"
            class="choice-pill"
            :class="{ active: form.categoria === '' }"
            @click="form.categoria = ''"
          >
            Nenhuma
          </button>
          <button
            v-for="c in ['Trufa','Cone','Barra','Brownie','Bolo','Ovo','Base']"
            :key="c"
            type="button"
            class="choice-pill"
            :class="{ active: form.categoria === c }"
            @click="form.categoria = c"
          >
            {{ c }}
          </button>
        </div>
      </div>
      <div class="inline-pair">
        <div class="fg flex-3">
          <label class="label">Rendimento</label>
          <input v-model.number="form.rendimento" class="input" type="number" min="0" step="0.01" placeholder="Ex: 10" inputmode="decimal" />
        </div>
        <div class="fg flex-1">
          <label class="label">Unidade</label>
          <select v-model="form.unidade_rendimento" class="input">
            <option v-for="u in ['un','g','kg','pct','caixa']" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
      </div>
      <div class="fg">
        <label class="label">Peso por unidade (g)</label>
        <input v-model.number="form.peso_unitario" class="input" type="number" inputmode="decimal" placeholder="Ex: 30" />
      </div>
      <div class="fg">
        <label class="label">Preço Sugerido (R$)</label>
        <input
          :value="maskMoney(form.preco_sugerido)"
          @input="e => form.preco_sugerido = parseMoney(e.target.value)"
          class="input" type="text" inputmode="numeric" placeholder="0,00"
        />
      </div>

      <div v-if="s.getCustoTotal(form) > 0" class="profit-box">
        <div v-if="totalIngredientesG > 0" class="profit-details">
          <div class="profit-item"><span>Total ingredientes:</span><strong>{{ totalIngredientesG.toFixed(2) }} g</strong></div>
          <div v-if="pesoEsperado && !form.eh_intermediaria" class="profit-item">
            <span>Peso esperado:</span><strong>{{ pesoEsperado.toFixed(2) }} g</strong>
          </div>
          <div v-if="pesoEsperado && !form.eh_intermediaria" class="profit-item" :class="Math.abs(diferencaPeso) > 1 ? 'highlight-warn' : 'highlight-ok'">
            <span>Diferença:</span><strong>{{ diferencaPeso > 0 ? '+' : '' }}{{ diferencaPeso.toFixed(2) }} g</strong>
          </div>
        </div>
        <div class="profit-divider"></div>
        <div class="profit-item"><span>Custo Total:</span><strong>{{ R$(s.getCustoTotal(form)) }}</strong></div>
        <div class="profit-item"><span>Custo por unidade:</span><strong>{{ R$(s.getCustoTotal(form) / (form.rendimento || 1)) }}</strong></div>
        <div v-if="form.preco_sugerido" class="profit-item highlight">
          <span>💰 Lucro p/ {{ form.unidade_rendimento }}:</span>
          <strong>{{ R$(form.preco_sugerido - (s.getCustoTotal(form) / (form.rendimento || 1))) }}</strong>
        </div>
      </div>

      <div class="section-title">🧂 Ingredientes</div>

      <div v-if="!form.ingredientes.length" class="ing-empty">
        <i class="fas fa-info-circle"></i>
        Toque em <strong>+ Ingrediente</strong> para adicionar ingredientes (chocolate, leite condensado...) ou
        <strong>bases 🥣</strong> - outra receita usada como ingrediente.
      </div>

      <div v-for="(ing, i) in form.ingredientes" :key="ing._key" class="ingredient-row">
        <button class="ing-select-btn" :class="ing.tipo === 'receita' ? 'is-base' : 'is-insumo'" @click="abrirPicker(i)">
          <span class="ing-badge">{{ ing.tipo === 'receita' ? '🥣' : '📦' }}</span>
          <span class="ing-nome">{{ getNomeIng(ing) || 'Toque para selecionar…' }}</span>
          <i class="fas fa-chevron-down ing-chevron"></i>
        </button>
        <div class="ing-qtd-group">
          <input v-model.number="ing.quantidade" class="input ing-qtd-input" type="number" inputmode="decimal" min="0" step="0.001" placeholder="0" />
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
        <button class="btn btn-secondary" @click="fecharModal">Cancelar</button>
        <button class="btn btn-primary" :disabled="!form.nome || saving" @click="salvar">
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ form.uuid ? 'Salvar' : 'Criar' }}</span>
        </button>
      </template>
    </BaseModal>

    <!-- ─── Modal Picker de Ingredientes ──────────────────────── -->
    <BaseModal v-if="modal === 'picker'" title="Adicionar Ingrediente" @close="fecharModal">
      <div class="search-wrap mt-8">
        <i class="fas fa-search search-icon"></i>
        <input v-model="pickerSearch" class="search-input" type="search" placeholder="Buscar ou digitar para criar…" autofocus />
      </div>
      <div class="chips mt-10">
        <button v-for="t in pickerTabs" :key="t.v" class="chip" :class="{ active: pickerTab === t.v }" @click="pickerTab = t.v">{{ t.l }}</button>
      </div>
      <div class="picker-list mt-10">
        <div v-if="podeCriarNovo" class="picker-row picker-criar" @click="criarNovoInsumo">
          <span class="picker-criar-icon"><i class="fas fa-plus"></i></span>
          <div class="picker-row-info">
            <div class="picker-row-nome">Criar "{{ pickerSearch.trim() }}" como ingrediente</div>
            <div class="picker-row-sub">Será cadastrado em gramas automaticamente</div>
          </div>
        </div>
        <template v-if="pickerTab !== 'insumos' && pickerBases.length">
          <div class="picker-grupo-label">🥣 Bases/Recheios (de outra receita)</div>
          <div v-for="item in pickerBases" :key="item.key" class="picker-row picker-row-base" @click="selecionarItem(item)">
            <span class="picker-tipo-badge">🥣</span>
            <div class="picker-row-info">
              <div class="picker-row-nome">{{ item.nome }}</div>
              <div class="picker-row-sub">Rende {{ item.rendimento }} {{ item.unidade }} • Base/Recheio</div>
            </div>
            <i class="fas fa-plus c-gold"></i>
          </div>
        </template>
        <template v-if="pickerTab !== 'bases' && pickerInsumos.length">
          <div class="picker-grupo-label">📦 Ingredientes</div>
          <div v-for="item in pickerInsumos" :key="item.key" class="picker-row" @click="selecionarItem(item)">
            <span class="picker-tipo-badge">📦</span>
            <div class="picker-row-info">
              <div class="picker-row-nome">{{ item.nome }}</div>
              <div class="picker-row-sub">{{ item.unidade }} • Ingrediente</div>
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

const pickerSearch = ref('')
const pickerTab    = ref('todos')
const pickerIndex  = ref(null)
const pickerTabs   = [{ v:'todos', l:'Tudo' }, { v:'insumos', l:'📦 Ingredientes' }, { v:'bases', l:'🥣 Bases' }]
const modalHistory = []
const categoriasFiltro = ['Todas', 'Sem categoria', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']

const form = reactive({
  uuid: null, nome: '', categoria: '', eh_intermediaria: 0,
  rendimento: null, unidade_rendimento: 'un',
  peso_unitario: null, preco_sugerido: null, modo_preparo: '', ingredientes: []
})

/* ── Picker ──────────────────────────────────────────────────── */
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

/* ── Custo / Peso ─────────────────────────────────────────────── */
const totalIngredientesG = computed(() => {
  let total = 0
  for (const ing of form.ingredientes) {
    if (!ing?.id) continue
    const qtd = Number(ing.quantidade || 0)
    if (qtd <= 0) continue
    if (ing.tipo === 'produto') {
      const p = s.produtos.find(x => x.uuid === ing.id)
      if (!p || p.tipo === 'embalagem') continue
      total += qtd
    } else if (ing.tipo === 'receita') {
      const sub  = s.receitas.find(r => r.uuid === ing.id)
      if (!sub) continue
      const unit = String(sub.unidade_rendimento || '').toLowerCase().trim()
      if (unit === 'g')       total += qtd
      else if (unit === 'kg') total += qtd * 1000
      else if (unit === 'un') { const pw = Number(sub.peso_unitario || 0); if (pw > 0) total += qtd * pw }
      else total += qtd
    }
  }
  return total
})

const pesoEsperado  = computed(() => (!form.rendimento || !form.peso_unitario) ? null : form.rendimento * form.peso_unitario)
const diferencaPeso = computed(() => !pesoEsperado.value ? 0 : totalIngredientesG.value - pesoEsperado.value)

/* ── Watchers ─────────────────────────────────────────────────── */
watch(() => form.ingredientes, () => {
  if (!form.eh_intermediaria) return
  const total = totalIngredientesG.value
  if (total > 0) {
    form.rendimento = total
    form.unidade_rendimento = 'g'
    if (form.unidade_rendimento === 'g' && !form.peso_unitario) form.peso_unitario = 1
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

/* ── Helpers ──────────────────────────────────────────────────── */
function getNomeIng(ing) {
  if (!ing.id) return ''
  const alvo = ing.tipo === 'receita' ? s.receitas.find(r => r.uuid === ing.id) : s.produtos.find(p => p.uuid === ing.id)
  return alvo?.nome || '⚠️ Removido'
}
function getUnidade(ing) {
  if (ing.tipo === 'receita') return s.receitas.find(r => r.uuid === ing.id)?.unidade_rendimento || 'g'
  return s.produtos.find(p => p.uuid === ing.id)?.unidade_base || 'g'
}
function getCustoComposicao(ing) {
  const qtd = Number(ing.quantidade || 0)
  if (qtd <= 0 || !ing.id) return 0
  if (ing.tipo === 'receita') {
    const sub = s.receitas.find(r => r.uuid === ing.id)
    if (!sub || !sub.rendimento) return 0
    return (s.getCustoTotal(sub) / (sub.rendimento || 1)) * qtd
  }
  const prod = s.produtos.find(p => p.uuid === ing.id)
  if (!prod || !prod.fator_conversao) return 0
  return ((prod.custo_por_unidade || 0) / (prod.fator_conversao || 1)) * qtd
}
function getLucroValor(receita) {
  const venda = Number(receita?.preco_sugerido || 0)
  const rendimento = Number(receita?.rendimento || 1) || 1
  const custoUnit = s.getCustoTotal(receita) / rendimento
  return venda - custoUnit
}
function getLucroPercentual(receita) {
  const venda = Number(receita?.preco_sugerido || 0)
  if (venda <= 0) return '0%'
  const lucro = getLucroValor(receita)
  return `${((lucro / venda) * 100).toFixed(0)}%`
}

/* ── Ingredientes ─────────────────────────────────────────────── */
function addNovoItem() {
  form.ingredientes.push({ _key: Math.random().toString(36).slice(2, 11), id: '', tipo: 'produto', quantidade: null })
  abrirPicker(form.ingredientes.length - 1)
}
function abrirModal(next) {
  const previous = modal.value
  const token = pushOverlayHistory(() => {
    modalHistory.pop()
    modal.value = previous
  })
  modalHistory.push({ token, previous })
  modal.value = next
}
function fecharModal() {
  const current = modalHistory.at(-1)
  if (!current) {
    modal.value = null
    return
  }
  closeOverlayHistory(current.token, () => {
    modalHistory.pop()
    modal.value = current.previous
  })
}
function abrirPicker(idx) {
  pickerIndex.value = idx
  pickerSearch.value = ''
  pickerTab.value = 'todos'
  abrirModal('picker')
}
function removerIngrediente(idx) { form.ingredientes.splice(idx, 1) }
function selecionarItem(item) {
  const ing = form.ingredientes[pickerIndex.value]
  ing.id = item.id; ing.tipo = item.tipo
  fecharModal()
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
  fecharModal()
}

/* ── Lista ────────────────────────────────────────────────────── */
const lista = computed(() => {
  let r = s.receitas

  if (categoriaAtiva.value === 'Base') {
    r = r.filter(x => x.eh_intermediaria || x.categoria === 'Base')
  } else if (categoriaAtiva.value === 'Sem categoria') {
    r = r.filter(x => !x.categoria)
  } else if (categoriaAtiva.value !== 'Todas') {
    r = r.filter(x => x.categoria === categoriaAtiva.value)
  }

  if (busca.value.trim()) {
    const q = normalizar(busca.value)
    r = r.filter(x => {
      const tipo = x.eh_intermediaria ? 'base intermediaria recheio' : 'final produto'
      return normalizar(`${x.nome} ${x.categoria || ''} ${tipo}`).includes(q)
    })
  }
  return [...r].sort((a, b) => a.nome?.localeCompare(b.nome))
})

/* ── Modal ────────────────────────────────────────────────────── */
function abrir(r) {
  Object.assign(form, { uuid: null, nome: '', categoria: '', eh_intermediaria: 0, rendimento: null, unidade_rendimento: 'un', peso_unitario: null, preco_sugerido: null, modo_preparo: '', ingredientes: [] })
  if (r) Object.assign(form, {
    uuid: r.uuid, nome: r.nome, categoria: r.categoria, eh_intermediaria: r.eh_intermediaria,
    rendimento: r.rendimento, unidade_rendimento: r.unidade_rendimento, peso_unitario: r.peso_unitario,
    preco_sugerido: r.preco_sugerido, modo_preparo: r.modo_preparo,
    ingredientes: (r.ingredientes || []).map(i => ({ ...i, _key: i.id + Math.random() }))
  })
  abrirModal('receita')
}

/* ── Salvar / Excluir ─────────────────────────────────────────── */
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
    fecharModal()
  } finally { saving.value = false }
}

// Excluir via botão dentro do modal (receita já aberta)
async function excluir() {
  if (!form.uuid) return
  closeAll()
  const ok = await confirm.ask(
    `Deseja excluir a receita "${form.nome}"? Esta ação não pode ser desfeita.`,
    { title: 'Excluir Receita', icon: 'fas fa-trash', confirmLabel: 'Excluir' }
  )
  if (!ok) return
  await s.excluirReceita(form.uuid)
  fecharModal()
}

// Excluir direto pelo swipe (sem modal aberto)
async function excluirDieto(r) {
  closeAll()
  const ok = await confirm.ask(
    `Deseja excluir a receita "${r.nome}"? Esta ação não pode ser desfeita.`,
    { title: 'Excluir Receita', icon: 'fas fa-trash', confirmLabel: 'Excluir' }
  )
  if (!ok) return
  await s.excluirReceita(r.uuid)
}
</script>

<style scoped>
.loading-box { display:flex; justify-content:center; padding:40px; }
.tab-content { padding-top: 10px; }
.spacer      { flex:1; }
.mt-8  { margin-top:8px; }
.mt-10 { margin-top:10px; }
.mt-12 { margin-top:12px; }
.mt-16 { margin-top:16px; }

.row-chevron { color: var(--border2); font-size: 0.75rem; flex-shrink: 0; margin-left: 4px; }
.recipe-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.recipe-price { color:var(--green); font-weight:700; font-family:var(--mono); }
.recipe-dot   { color: var(--border2); }
.recipe-profit { font-size:.78rem; color:var(--brown-mid); font-weight:700; }
.recipe-profit.negative { color: var(--red); }
.recipe-type-tag { margin-left: auto; flex-shrink: 0; }
.cat-filter-wrap { margin: -4px -16px 0; padding: 6px 0 0; background: var(--surface); }
.cat-chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px 2px; scrollbar-width: none; }
.cat-chips::-webkit-scrollbar { display: none; }
.cat-chip { flex-shrink: 0; padding: 7px 14px; border-radius: 20px; border: 1px solid var(--border); background: #fff; font-size: 0.75rem; font-weight: 700; color: var(--muted); cursor: pointer; }
.cat-chip.active { background: var(--brown); color: #fff; border-color: var(--brown); }

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

/* Profit box */
.profit-box { background:var(--green-bg); border:1px solid var(--green-dim); border-radius:var(--r-md); padding:12px 14px; margin:12px 0; display:flex; flex-direction:column; gap:5px; }
.profit-details { display:flex; flex-direction:column; gap:5px; }
.profit-divider { height:1px; background:var(--green-dim); margin:4px 0; }
.profit-item { display:flex; justify-content:space-between; font-size:.85rem; color:var(--text); }
.profit-item.highlight { padding-top:6px; border-top:1px dashed var(--green-dim); color:var(--green); font-size:.9rem; }
.profit-item.highlight-warn { color:var(--orange); }
.profit-item.highlight-ok   { color:var(--green); opacity:.8; }

.section-title { font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:16px 0 8px; }
.ing-empty { background:var(--cream); border:1px dashed var(--border2); border-radius:var(--r-md); padding:12px 14px; font-size:.85rem; color:var(--muted); line-height:1.6; margin-bottom:10px; }
.ing-empty i { color:var(--brown-light); margin-right:4px; }

.ingredient-row { display:flex; align-items:center; gap:6px; margin-bottom:8px; }
.ing-select-btn { flex:1; min-width:0; display:flex; align-items:center; gap:6px; padding:9px 10px; border-radius:var(--r-sm); border:1.5px solid var(--border); background:var(--surface); text-align:left; }
.ing-select-btn:active { transform:scale(.98); }
.ing-select-btn.is-insumo { border-color:var(--border2); }
.ing-select-btn.is-base   { border-color:#93c5fd; background:#eff6ff; }
.ing-badge   { font-size:1rem; flex-shrink:0; }
.ing-nome    { flex:1; font-size:.85rem; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.ing-chevron { font-size:.7rem; color:var(--muted); flex-shrink:0; }
.ing-qtd-group { display:flex; align-items:center; gap:3px; flex-shrink:0; }
.ing-qtd-input { width:68px; padding:9px 8px; text-align:right; font-size:.9rem; }
.ing-unidade { font-size:.75rem; color:var(--muted); min-width:20px; }
.ing-cost    { font-size:.85rem; font-weight:700; color:var(--brown); min-width:60px; text-align:right; flex-shrink:0; }
.ing-del     { flex-shrink:0; }
.ing-add-btn { margin-top:6px; }
.textarea-v  { resize:vertical; }

.picker-list { display:flex; flex-direction:column; gap:2px; }
.picker-grupo-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); padding:12px 4px 6px; }
.picker-row { display:flex; align-items:center; gap:10px; padding:11px 12px; border-radius:var(--r-sm); border:1px solid var(--border); background:var(--surface); cursor:pointer; }
.picker-row:active { background:var(--gold-bg); }
.picker-row-base   { border-color:#bfdbfe; background:#f0f8ff; }
.picker-row-base:active { background:#dbeafe; }
.picker-criar { border-color:var(--green-dim); background:var(--green-bg); }
.picker-criar:active { background:#d1fae5; }
.picker-criar-icon { width:32px; height:32px; border-radius:50%; background:var(--green); color:#fff; display:flex; align-items:center; justify-content:center; font-size:.85rem; flex-shrink:0; }
.picker-tipo-badge { font-size:1.1rem; flex-shrink:0; }
.picker-row-info { flex:1; min-width:0; }
.picker-row-nome { font-size:.9rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.picker-row-sub  { font-size:.78rem; color:var(--muted); margin-top:2px; }
.picker-vazio    { text-align:center; color:var(--muted); font-size:.875rem; padding:24px 0; }
.c-gold { color:var(--gold); }

.inline-pair { display:flex; gap:10px; align-items:flex-start; }
.flex-1 { flex:1; }
.flex-3 { flex:3; }
.segmented {
  position:relative;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:4px;
  padding:4px;
  border-radius:16px;
  background:linear-gradient(180deg, #f7f0e5 0%, #f2e6d6 100%);
  border:1px solid #eadfce;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8);
}
.segmented-thumb {
  position:absolute;
  top:4px;
  left:4px;
  width:calc(50% - 6px);
  height:calc(100% - 8px);
  border-radius:12px;
  background:linear-gradient(180deg, #fffdf9 0%, #fff6eb 100%);
  box-shadow:0 8px 18px rgba(61,32,8,.10), 0 1px 2px rgba(61,32,8,.08);
  transition:transform .22s ease;
}
.segmented.is-base .segmented-thumb { transform:translateX(calc(100% + 4px)); }
.segmented-btn {
  position:relative;
  z-index:1;
  min-height:52px;
  border:none;
  background:transparent;
  border-radius:12px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:10px 12px;
  color:var(--muted);
  transition:color var(--t), transform var(--t);
}
.segmented-btn.active { color:var(--brown); }
.segmented-btn:active,
.choice-pill:active { transform:scale(.98); }
.choice-icon { font-size:1rem; line-height:1; filter:saturate(.9); }
.choice-text { font-size:.88rem; font-weight:800; letter-spacing:-.1px; }
.chips-elegant {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.choice-pill {
  border:1px solid #e7dac7;
  background:linear-gradient(180deg, #fffdfa 0%, #fbf4ea 100%);
  color:var(--brown-mid);
  min-height:42px;
  border-radius:var(--r-full);
  padding:9px 14px;
  font-size:.83rem;
  font-weight:700;
  white-space:nowrap;
  box-shadow:0 1px 0 rgba(255,255,255,.9), 0 1px 3px rgba(61,32,8,.04);
  transition:all var(--t);
}
.choice-pill.active {
  background:linear-gradient(135deg, var(--brown) 0%, #6a3a14 100%);
  border-color:#5f3412;
  color:#fff;
  box-shadow:0 8px 16px rgba(61,32,8,.16);
}
</style>
