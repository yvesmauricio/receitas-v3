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

      <!-- ── Seção: Identidade ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-tag"></i> Identidade</div>
        <div class="fg">
          <label class="label label-req">Nome da receita</label>
          <input v-model="form.nome" class="input" autofocus placeholder="Ex: Trufa Tradicional" autocomplete="off" />
        </div>

        <!-- Tipo: toggle visual -->
        <div class="fg">
          <label class="label">Tipo</label>
          <div class="type-toggle">
            <button type="button" class="type-btn" :class="{ active: Number(form.eh_intermediaria) === 0 }" @click="form.eh_intermediaria = 0">
              <span class="type-ico">🍫</span>
              <div>
                <div class="type-label">Produto final</div>
                <div class="type-sub">Para venda direta</div>
              </div>
            </button>
            <button type="button" class="type-btn" :class="{ active: Number(form.eh_intermediaria) === 1 }" @click="form.eh_intermediaria = 1">
              <span class="type-ico">🥣</span>
              <div>
                <div class="type-label">Base / Recheio</div>
                <div class="type-sub">Usada em outras receitas</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Categoria: chips horizontais -->
        <div class="fg">
          <label class="label">Categoria <span class="label-opt">(opcional)</span></label>
          <div class="cat-pill-row">
            <button
              v-for="c in ['Trufa','Cone','Barra','Brownie','Bolo','Ovo','Base']"
              :key="c"
              type="button"
              class="cat-pill"
              :class="{ active: form.categoria === c }"
              @click="form.categoria = form.categoria === c ? '' : c"
            >{{ c }}</button>
          </div>
        </div>
      </div>

      <!-- ── Seção: Rendimento ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-layer-group"></i> Rendimento &amp; Preço</div>

        <div class="render-row">
          <div class="fg render-qtd">
            <label class="label">Rendimento</label>
            <input v-model.number="form.rendimento" class="input" type="number" min="0" step="0.01" placeholder="10" inputmode="decimal" />
          </div>
          <div class="fg render-un">
            <label class="label">Unidade</label>
            <select v-model="form.unidade_rendimento" class="input">
              <option v-for="u in ['un','g','kg','pct','caixa']" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <div class="fg render-peso">
            <label class="label">Peso/un <span class="label-opt">(g)</span></label>
            <input v-model.number="form.peso_unitario" class="input" type="number" inputmode="decimal" placeholder="30" />
          </div>
        </div>

        <div class="fg">
          <label class="label">Preço de venda sugerido</label>
          <div class="input-with-prefix">
            <span class="input-prefix">R$</span>
            <input
              :value="maskMoney(form.preco_sugerido)"
              @input="e => form.preco_sugerido = parseMoney(e.target.value)"
              class="input input-prefixed" type="text" inputmode="numeric" placeholder="0,00"
            />
          </div>
        </div>

        <!-- Painel de lucratividade -->
        <div v-if="s.getCustoTotal(form) > 0" class="profit-panel">
          <div class="profit-row">
            <span class="profit-label">Custo total</span>
            <span class="profit-val cost">{{ R$(s.getCustoTotal(form)) }}</span>
          </div>
          <div class="profit-row">
            <span class="profit-label">Custo por {{ form.unidade_rendimento }}</span>
            <span class="profit-val cost">{{ R$(s.getCustoTotal(form) / (form.rendimento || 1)) }}</span>
          </div>
          <div v-if="totalIngredientesG > 0" class="profit-row">
            <span class="profit-label">Total ingredientes</span>
            <span class="profit-val">{{ totalIngredientesG.toFixed(0) }} g</span>
          </div>
          <div v-if="form.preco_sugerido" class="profit-divider"></div>
          <div v-if="form.preco_sugerido" class="profit-row profit-row-total">
            <span class="profit-label">Lucro por {{ form.unidade_rendimento }}</span>
            <span class="profit-val" :class="(form.preco_sugerido - s.getCustoTotal(form) / (form.rendimento || 1)) >= 0 ? 'gain' : 'loss'">
              {{ R$(form.preco_sugerido - s.getCustoTotal(form) / (form.rendimento || 1)) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Seção: Ingredientes ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-list-ul"></i> Ingredientes</div>

        <div v-if="!form.ingredientes.length" class="ing-empty-state">
          <i class="fas fa-plus-circle"></i>
          <span>Toque em <strong>+ Adicionar</strong> para incluir ingredientes ou bases de outras receitas</span>
        </div>

        <div v-for="(ing, i) in form.ingredientes" :key="ing._key" class="ing-row">
          <!-- Botão de selecionar ingrediente -->
          <button class="ing-pick-btn" :class="ing.tipo === 'receita' ? 'pick-base' : 'pick-insumo'" @click="abrirPicker(i)">
            <span class="ing-pick-ico">{{ ing.tipo === 'receita' ? '🥣' : '📦' }}</span>
            <span class="ing-pick-nome">{{ getNomeIng(ing) || 'Selecionar…' }}</span>
            <i class="fas fa-chevron-down ing-pick-chev"></i>
          </button>
          <!-- Qtd + unidade + remover inline -->
          <div class="ing-controls">
            <input
              v-model.number="ing.quantidade"
              class="input ing-qty"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.001"
              placeholder="0"
              :aria-label="`Quantidade de ${getNomeIng(ing)}`"
            />
            <span class="ing-unit-tag">{{ getUnidade(ing) }}</span>
            <button class="ing-remove" type="button" :aria-label="`Remover ${getNomeIng(ing)}`" @click="removerIngrediente(i)">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <button class="btn-add-ing" @click="addNovoItem">
          <i class="fas fa-plus"></i> Adicionar ingrediente
        </button>
        <button v-if="form.ingredientes.length" class="btn-ing-detail" @click="abrirModal('ingredientes-detalhes')">
          <i class="fas fa-table"></i> Ver custo detalhado
        </button>
      </div>

      <!-- ── Seção: Preparo ── -->
      <div class="form-section">
        <div class="form-section-label"><i class="fas fa-utensils"></i> Modo de preparo <span class="label-opt" style="text-transform:none;letter-spacing:0;font-weight:500">(opcional)</span></div>
        <div class="fg">
          <textarea v-model="form.modo_preparo" class="input textarea-preparo" rows="4" placeholder="Descreva o passo a passo da receita…"></textarea>
        </div>
      </div>

      <template #foot>
        <button v-if="form.uuid" class="btn btn-danger btn-icon-only" @click="excluir" title="Excluir receita">
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

    <!-- ─── Modal Picker de Ingredientes ──────────────────────── -->
    <BaseModal v-if="modal === 'picker'" title="Adicionar Ingrediente" @close="fecharModal">
      <div class="modal-inner">
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
      </div>
    </BaseModal>

    <BaseModal v-if="modal === 'ingredientes-detalhes'" title="Detalhes dos Ingredientes" @close="fecharModal">
      <div class="modal-inner">
      <div v-if="detalhesIngredientes.length" class="details-list">
        <div v-for="item in detalhesIngredientes" :key="item.key" class="details-row">
          <div class="details-main">
            <div class="details-name">{{ item.nome }}</div>
            <div class="details-sub">{{ item.quantidade }}</div>
          </div>
          <div class="details-value">{{ item.custo }}</div>
        </div>
      </div>
      <div v-else class="picker-vazio">Nenhum ingrediente adicionado</div>

      <div v-if="detalhesIngredientes.length" class="details-total">
        <span>Total</span>
        <strong>{{ R$(s.getCustoTotal(form)) }}</strong>
      </div>

      </div>
      <template #foot>
        <button class="btn btn-secondary" @click="fecharModal">Fechar</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
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
const categoriasFiltro = ['Todas', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']
let receitaScrollTop = 0
let restoreReceitaScroll = false

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

const detalhesIngredientes = computed(() =>
  form.ingredientes
    .filter(ing => ing?.id)
    .map(ing => ({
      key: ing._key,
      nome: getNomeIng(ing) || 'Item removido',
      quantidade: `${Number(ing.quantidade || 0)} ${getUnidade(ing)}`,
      custo: R$(getCustoComposicao(ing))
    }))
)

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
  receitaScrollTop = getModalBody()?.scrollTop || 0
  restoreReceitaScroll = true
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
  restoreScrollReceita()
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
  restoreScrollReceita()
}

function getModalBody() {
  return document.querySelector('.modal-body')
}

function restoreScrollReceita() {
  if (!restoreReceitaScroll) return
  nextTick(() => {
    requestAnimationFrame(() => {
      const body = getModalBody()
      if (body) body.scrollTop = receitaScrollTop
      restoreReceitaScroll = false
    })
  })
}

/* ── Lista ────────────────────────────────────────────────────── */
const lista = computed(() => {
  let r = s.receitas

  if (categoriaAtiva.value === 'Base') {
    r = r.filter(x => x.eh_intermediaria || x.categoria === 'Base')
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
/* ── Lista ── */
.loading-box { display:flex; justify-content:center; padding:40px }
.tab-content { padding-top:8px }
.spacer { flex:1 }
.mt-8  { margin-top:8px }
.mt-10 { margin-top:10px }
.mt-12 { margin-top:12px }
.mt-16 { margin-top:16px }

.cat-filter-wrap { margin:-4px -16px 0; padding:6px 0 0; background:var(--surface) }
.cat-chips { display:flex; gap:8px; overflow-x:auto; padding:0 16px 2px; scrollbar-width:none }
.cat-chips::-webkit-scrollbar { display:none }
.cat-chip { flex-shrink:0; padding:8px 16px; border-radius:20px; border:1.5px solid var(--border); background:#fff; font-size:.76rem; font-weight:700; color:var(--muted); cursor:pointer; min-height:36px }
.cat-chip.active { background:var(--brown); color:#fff; border-color:var(--brown) }

.row-chevron { color:var(--border2); font-size:.75rem; flex-shrink:0; margin-left:4px }
.recipe-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:.95rem; flex-shrink:0 }
.recipe-price  { color:var(--green); font-weight:700; font-family:var(--mono) }
.recipe-dot    { color:var(--border2) }
.recipe-profit { font-size:.75rem; color:var(--brown-mid); font-weight:700 }
.recipe-profit.negative { color:var(--red) }
.recipe-type-tag { flex-shrink:0 }

.swipe-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; width:60px; height:100%; border:none; color:#fff; font-size:.64rem; font-weight:800; letter-spacing:.3px; cursor:pointer; text-transform:uppercase }
.swipe-btn i { font-size:1.1rem }
.swipe-btn.edit { background:var(--gold-dark) }
.swipe-btn.del  { background:#dc2626 }
.swipe-btn:active { filter:brightness(.88) }

/* ── Formulário: Seções ── */
.form-section {
  padding: 16px 16px;
  border-bottom: 8px solid var(--bg);
}
.form-section:first-of-type { border-top: none }
.form-section:last-of-type  { border-bottom: none; padding-bottom: 28px }
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
.label-opt { font-size: .75rem; font-weight: 500; color: var(--muted); text-transform: none; letter-spacing: 0 }

/* ── Type toggle ── */
.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.type-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  text-align: left;
  transition: all var(--t);
  min-height: 64px;
}
.type-btn:active { transform: scale(.97) }
.type-btn.active {
  border-color: var(--brown);
  background: var(--gold-bg);
}
.type-ico  { font-size: 1.6rem; flex-shrink: 0; line-height: 1 }
.type-label { font-size: .84rem; font-weight: 800; color: var(--brown-dark); line-height: 1.2 }
.type-sub   { font-size: .72rem; color: var(--muted); margin-top: 2px }

/* ── Categoria pills (horizontal scroll) ── */
.cat-pill-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}
.cat-pill-row::-webkit-scrollbar { display: none }
.cat-pill {
  flex-shrink: 0;
  padding: 9px 16px;
  border-radius: var(--r-full);
  border: 1.5px solid var(--border);
  background: var(--cream);
  color: var(--muted);
  font-size: .8rem;
  font-weight: 700;
  white-space: nowrap;
  min-height: 40px;
  transition: all var(--t);
}
.cat-pill.active {
  background: var(--brown);
  color: #fff;
  border-color: var(--brown);
}
.cat-pill:active { transform: scale(.95) }

/* ── Rendimento row ── */
.render-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr;
  gap: 8px;
  margin-bottom: 4px;
}
.render-qtd, .render-un, .render-peso { margin-bottom: 0 }

/* ── Input com prefixo ── */
.input-with-prefix {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  overflow: hidden;
  transition: border-color var(--t);
}
.input-with-prefix:focus-within {
  border-color: var(--brown-mid);
  box-shadow: 0 0 0 3px rgba(122,69,32,.12);
}
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

/* ── Painel de lucratividade ── */
.profit-panel {
  background: var(--green-bg);
  border: 1px solid var(--green-dim);
  border-radius: var(--r-md);
  padding: 12px 14px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.profit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.profit-row-total { padding-top: 8px }
.profit-label { font-size: .82rem; color: var(--muted) }
.profit-val   { font-size: .88rem; font-weight: 800; font-family: var(--mono); color: var(--brown) }
.profit-val.cost { color: var(--orange) }
.profit-val.gain { color: var(--green) }
.profit-val.loss { color: var(--red) }
.profit-divider { height: 1px; background: var(--green-dim); margin: 2px 0 }

/* ── Ingredientes ── */
.ing-empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: var(--cream);
  border: 1.5px dashed var(--border2);
  border-radius: var(--r-md);
  font-size: .85rem;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 10px;
}
.ing-empty-state i { font-size: 1.1rem; color: var(--brown-light); flex-shrink: 0 }
.ing-empty-state strong { color: var(--brown-mid) }

.ing-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.ing-row:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0 }

/* Botão de seleção do ingrediente — linha inteira */
.ing-pick-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 11px 12px;
  border-radius: var(--r-sm);
  border: 1.5px solid var(--border);
  background: var(--surface);
  text-align: left;
  min-height: 48px;
  transition: all var(--t);
}
.ing-pick-btn:active { transform: scale(.99); background: var(--gold-bg) }
.pick-insumo { border-color: var(--border2) }
.pick-base   { border-color: #93c5fd; background: #f0f8ff }
.ing-pick-ico  { font-size: 1.1rem; flex-shrink: 0 }
.ing-pick-nome {
  flex: 1;
  font-size: .88rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.ing-pick-chev { font-size: .75rem; color: var(--muted); flex-shrink: 0 }

/* Controles de quantidade — linha abaixo */
.ing-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
}
.ing-qty {
  width: 90px;
  flex-shrink: 0;
  text-align: right;
  padding: 10px 12px;
  font-size: .95rem;
  font-family: var(--mono);
  font-weight: 700;
}
.ing-unit-tag {
  flex: 1;
  font-size: .82rem;
  color: var(--muted);
  font-weight: 600;
}
.ing-remove {
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm);
  border: 1.5px solid var(--red-bg);
  background: var(--red-bg);
  color: var(--red);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .9rem;
  flex-shrink: 0;
  transition: all var(--t);
}
.ing-remove:active { background: #fecaca; transform: scale(.93) }

/* Botões de adicionar */
.btn-add-ing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 13px;
  border: 2px dashed var(--border2);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--brown-mid);
  font-size: .875rem;
  font-weight: 700;
  margin-top: 8px;
  min-height: 50px;
  transition: all var(--t);
}
.btn-add-ing:active { background: var(--cream); border-color: var(--brown-light); transform: scale(.98) }

.btn-ing-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 11px;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--cream);
  color: var(--muted);
  font-size: .82rem;
  font-weight: 700;
  margin-top: 6px;
  min-height: 44px;
  transition: all var(--t);
}
.btn-ing-detail:active { background: var(--cream-deep) }

/* ── Textarea preparo ── */
.textarea-preparo {
  resize: vertical;
  min-height: 96px;
  line-height: 1.6;
}

/* ── Footer ── */
.btn-icon-only { min-width: 48px; padding: 12px }

/* ── Detalhes de ingredientes (modal) ── */
.details-list { display:flex; flex-direction:column; gap:8px }
.details-row {
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:12px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface)
}
.details-main { min-width:0 }
.details-name { font-size:.9rem; font-weight:700; color:var(--text) }
.details-sub  { font-size:.78rem; color:var(--muted); margin-top:3px }
.details-value { font-size:.86rem; font-weight:800; color:var(--brown); white-space:nowrap }
.details-total {
  display:flex; align-items:center; justify-content:space-between;
  margin-top:14px; padding:12px 14px; border-radius:var(--r-sm);
  background:var(--cream); border:1px solid var(--border);
  font-size:.9rem; color:var(--brown-dark)
}

/* ── Picker de ingredientes ── */
.picker-list { display:flex; flex-direction:column; gap:4px }
.picker-grupo-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); padding:12px 4px 6px }
.picker-row {
  display:flex; align-items:center; gap:10px; padding:13px 12px;
  border-radius:var(--r-sm); border:1.5px solid var(--border);
  background:var(--surface); cursor:pointer; min-height:56px; transition:background var(--t)
}
.picker-row:active { background:var(--gold-bg) }
.picker-row-base   { border-color:#bfdbfe; background:#f0f8ff }
.picker-row-base:active { background:#dbeafe }
.picker-criar      { border-color:var(--green-dim); background:var(--green-bg) }
.picker-criar:active { background:#d1fae5 }
.picker-criar-icon {
  width:36px; height:36px; border-radius:50%;
  background:var(--green); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:.9rem; flex-shrink:0
}
.picker-tipo-badge { font-size:1.2rem; flex-shrink:0 }
.picker-row-info { flex:1; min-width:0 }
.picker-row-nome { font-size:.9rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.picker-row-sub  { font-size:.78rem; color:var(--muted); margin-top:2px }
.picker-vazio    { text-align:center; color:var(--muted); font-size:.875rem; padding:28px 0 }
.c-gold { color:var(--gold-dark) }

@media (max-width:380px) {
  .render-row { grid-template-columns: 1fr 1fr; }
  .render-peso { grid-column: 1 / -1; }
  .type-label { font-size:.8rem }
}
/* padding dos modals picker / detalhes */
.modal-inner { padding: 16px 16px 24px }
</style>
