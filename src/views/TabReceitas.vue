<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-book-open"></i> Receitas</h2>
        <div class="tab-actions">
          <button class="btn-icon" @click="abrirSimulador" title="Simulador de Combos e BI"><i class="fas fa-chart-line"></i></button>
          <button class="btn-icon" @click="gerarRelatorio" title="Gerar Relatório de Receitas"><i class="fas fa-file-pdf"></i></button>
          <button class="btn btn-primary btn-sm" @click="abrir(null)"><i class="fas fa-plus"></i> Nova</button>
        </div>
      </div>
      <div class="search-wrap">
        <i class="fas fa-search search-icon"></i>
        <input v-model="busca" class="search-input" type="search" placeholder="Buscar receita…" />
      </div>
      <CategoryFilter v-model="categoriaAtiva" :items="categoriasFiltro" />
    </div>

    <section class="tab-content">
      <div v-if="s.loading" class="loading-box"><div class="spinner spinner-sm"></div></div>

      <template v-else-if="listaFiltrada.length">
        <AppListRow
          v-for="r in listaFiltrada"
          :key="r.uuid"
          :id="r.uuid"
          @click="abrir(r)"
        >
          <template #icon>
            <div class="recipe-icon" :class="r.eh_intermediaria ? 'badge-blue' : 'badge-gold'">
              <i :class="r.eh_intermediaria ? 'fas fa-blender' : 'fas fa-cookie-bite'"></i>
            </div>
          </template>
          <template #title>{{ r.nome }}</template>
          <template #sub>
            <span class="recipe-price">Venda: {{ R$(r.preco_sugerido || 0) }}</span>
            <span class="ing-dot">•</span>
            <span class="recipe-profit" :class="{ 
              negative: s.getLucroInfo(r).valor < 0,
              'profit-low': s.getLucroInfo(r).percentual < 40 && s.getLucroInfo(r).valor >= 0,
              'profit-high': s.getLucroInfo(r).percentual > 65 }">
              Lucro: {{ R$(s.getLucroInfo(r).valor) }} ({{ s.getLucroInfo(r).percentual.toFixed(0) }}%)
            </span>
          </template>

          <!-- Ações de swipe -->
          <template #actions>
            <button class="swipe-btn edit" @click="abrir(r)">
              <i class="fas fa-pencil"></i>
              <span>Editar</span>
            </button>
            <button class="swipe-btn del" @click="excluirDireto(r)">
              <i class="fas fa-trash"></i>
              <span>Excluir</span>
            </button>
          </template>
        </AppListRow>
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

        <div class="fg">
          <label class="label">Texto da etiqueta <span class="label-opt">(opcional)</span></label>
          <input v-model="form.nome_etiqueta" class="input" placeholder="Ex: Tradicional" autocomplete="off" />
          <div class="hint">Se vazio, a etiqueta usa o nome da receita sem a categoria.</div>
        </div>

        <!-- Tipo: toggle visual -->
        <div class="fg">
          <label class="label">Tipo</label>
          <div class="option-grid option-grid-2">
            <button type="button" class="option-card" :class="{ active: Number(form.eh_intermediaria) === 0 }" @click="form.eh_intermediaria = 0">
              <i class="fas fa-cookie-bite option-ico"></i>
              <span class="option-label">Produto Final</span>
            </button>
            <button type="button" class="option-card" :class="{ active: Number(form.eh_intermediaria) === 1 }" @click="form.eh_intermediaria = 1">
              <i class="fas fa-blender option-ico"></i>
              <span class="option-label">Base / Recheio</span>
            </button>
          </div>
        </div>

        <!-- Categoria: chips horizontais -->
        <div class="fg">
          <label class="label">Categoria <span class="label-opt">(opcional)</span></label>
          <div class="cat-pill-row">
            <button
              v-for="c in categoriasFiltro.filter(x => x !== 'Todas')"
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

        <div class="render-row-slim">
          <div class="fg">
            <label class="label">Rendimento</label>
            <input v-model.number="form.rendimento" class="input" type="number" min="0" step="0.01" placeholder="10" inputmode="decimal" />
          </div>
          <div class="fg">
            <label class="label">Unidade</label>
            <div class="unit-pill-grid unit-pill-grid-5">
              <button v-for="u in ['un','g','kg','pct','cx']" 
                :key="u" type="button" class="unit-pill"
                :class="{ active: form.unidade_rendimento === u }"
                @click="form.unidade_rendimento = u">{{ u }}</button>
            </div>
          </div>
        </div>

        <div class="fg">
          <label class="label">Peso de 1 unidade <span class="label-opt">(opcional, em gramas)</span></label>
          <input v-model.number="form.peso_unitario" class="input" type="number" inputmode="decimal" placeholder="Ex: 30" />
        </div>

        <div class="fg" v-if="s.getCustoTotal(form) > 0">
          <label class="label">Sugerir preço por Markup (Inteligência de Lucro)</label>
          <div class="markup-grid">
            <button type="button" class="markup-btn" @click="form.preco_sugerido = arredondarPreco((s.getCustoTotal(form) / (form.rendimento || 1)) * 2)">
              <span>2.0x</span><small>50% margem</small>
            </button>
            <button type="button" class="markup-btn" @click="form.preco_sugerido = arredondarPreco((s.getCustoTotal(form) / (form.rendimento || 1)) * 3)">
              <span>3.0x</span><small>67% margem</small>
            </button>
            <button type="button" class="markup-btn highlight" @click="form.preco_sugerido = arredondarPreco((s.getCustoTotal(form) / (form.rendimento || 1)) * 4)">
              <span>4.0x</span><small>75% margem</small>
            </button>
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
            <span class="profit-val" :class="s.getLucroInfo(form).valor >= 0 ? 'gain' : 'loss'">
              {{ R$(s.getLucroInfo(form).valor) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Seção: Ingredientes ── -->
      <div class="form-section" id="section-ingredientes">
        <div class="form-section-label"><i class="fas fa-list-ul"></i> Ingredientes</div>

        <div v-if="!form.ingredientes.length" class="ing-empty-state">
          <i class="fas fa-plus-circle"></i>
          <span>Toque em <strong>+ Adicionar</strong> para incluir ingredientes ou bases de outras receitas</span>
        </div>

        <div v-for="(ing, i) in form.ingredientes" :key="ing._key" class="ing-row-slim">
          <div
            class="ing-row-content"
            :class="{
              'is-recipe': ing.tipo === 'receita',
              'is-invalid': ingredienteIncompleto(ing),
              'is-duplicate': ingredienteDuplicado(ing, i)
            }"
          >
            <!-- Seleção e Nome -->
            <button class="ing-btn-name" @click="abrirPicker(i)">
              <span class="ing-ico-sm">{{ ing.tipo === 'receita' ? '🥣' : '📦' }}</span>
              <span class="ing-name-txt">{{ getNomeIng(ing) || 'Selecionar…' }}</span>
            </button>

            <!-- Quantidade Integrada -->
            <div class="ing-qty-field">
              <input v-model.number="ing.quantidade" type="number" inputmode="decimal" class="ing-input-slim" placeholder="0" />
              <span class="ing-unit-slim">{{ getUnidade(ing) }}</span>
            </div>

            <!-- Ações Rápidas -->
            <div class="ing-actions-slim">
              <button type="button" class="btn-action-slim" :class="{ active: ing.gera_peso !== false }" 
                @click="ing.gera_peso = ing.gera_peso === false ? true : false">
                <i class="fas fa-balance-scale"></i>
              </button>
              <button type="button" class="btn-action-slim btn-del-slim" @click="removerIngrediente(i)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="ing-row-meta">
            <span v-if="ingredienteIncompleto(ing)" class="ing-meta-chip warn">Selecione o item e informe a quantidade</span>
            <span v-else-if="ingredienteDuplicado(ing, i)" class="ing-meta-chip warn">Ingrediente repetido na receita</span>
            <span v-if="ing.id && Number(ing.quantidade || 0) > 0" class="ing-meta-chip cost">Custo: {{ R$(getCustoComposicao(ing)) }}</span>
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
        <div class="form-section-label"><i class="fas fa-utensils"></i> Modo de preparo <span class="label-opt">(opcional)</span></div>
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

    <!-- ─── Modal Simulador de Combos & BI ───────────────────── -->
    <BaseModal v-if="modal === 'simulador'" title="Estratégia de Venda & Combos" @close="fecharModal">
      <div class="modal-inner scroll-sec">
        <!-- Insights de Produção (BI) -->
        <div class="section-label">🧠 Insights de Produção Real</div>
        <div class="bi-grid mb-16">
          <div class="bi-card popular">
            <span class="bi-lbl">🔥 Mais Produzidos (Saída)</span>
            <div class="bi-list">
              <div v-for="r in topSaida" :key="r.uuid" class="bi-item">
                {{ r.nome }} <small>{{ popularidadeMap[r.uuid] }}x</small>
              </div>
            </div>
          </div>
          <div class="bi-card profit">
            <span class="bi-lbl">💎 Mais Lucrativos (% Margem)</span>
            <div class="bi-list">
              <div v-for="r in topLucro" :key="r.uuid" class="bi-item">
                {{ r.nome }} <small>{{ s.getLucroInfo(r).percentual.toFixed(0) }}%</small>
              </div>
            </div>
          </div>
        </div>

        <div class="alert" :class="comboFeedback.class" style="cursor: default">
          <i class="fas fa-lightbulb"></i>
          <div class="alert-body">
            <div class="alert-title">{{ comboFeedback.title }}</div>
            <div class="alert-sub" v-html="comboFeedback.msg"></div>
          </div>
        </div>

        <div v-if="escalaSugerida.length && comboPrecoVenda > 0" class="price-ladder mt-16">
          <div class="ladder-title">📈 Escala de Preço Sugerida (Promoção)</div>
          <div class="ladder-grid">
            <div v-for="p in escalaSugerida" :key="p.qtd" class="ladder-item">
              <span class="l-qtd">{{ p.qtd }} un</span>
              <strong class="l-val">{{ R$(p.total) }}</strong>
              <small class="l-unit">({{ R$(p.unitario) }}/un)</small>
            </div>
          </div>
        </div>

        <div class="section-label mt-16">📦 Itens do Combo / Kit</div>
        <div class="combo-builder">
          <div v-for="(item, idx) in comboItens" :key="idx" class="combo-item-row">
            <select v-model="item.id" class="input sm" style="flex: 2">
              <option value="">Selecione uma receita...</option>
              <option v-for="r in s.receitas" :key="r.uuid" :value="r.uuid">
                {{ r.nome }}{{ getRecipeInsights(r) }}
              </option>
            </select>
            <input v-model.number="item.qtd" type="number" class="input sm" style="flex: 0.8" placeholder="Qtd" />
            <button class="btn-icon danger" @click="comboItens.splice(idx, 1)"><i class="fas fa-times"></i></button>
          </div>
          <button class="btn-add-outline mt-8" @click="comboItens.push({ id: '', qtd: 1 })">
            <i class="fas fa-plus"></i> Adicionar ao Combo
          </button>
        </div>

        <div v-if="statsCombo.custo > 0" class="profit-panel combo-result mt-16">
          <div class="profit-row">
            <span>Custo Total do Combo</span>
            <strong>{{ R$(statsCombo.custo) }}</strong>
          </div>
          <div class="profit-row">
            <span>Preço Sugerido (Markup 3x)</span>
            <strong class="c-green">{{ R$(statsCombo.custo * 3) }}</strong>
          </div>
          <div class="fg mt-12">
            <label class="label">Preço Final do Combo (Sua Venda)</label>
            <div class="input-with-prefix">
              <span class="input-prefix">R$</span>
              <input v-model.number="comboPrecoVenda" class="input input-prefixed" type="number" />
            </div>
          </div>
          <div class="profit-divider"></div>
          <div class="profit-row profit-row-total">
            <span>Lucro Estimado no Combo</span>
            <span :class="statsCombo.lucro >= 0 ? 'gain' : 'loss'">
              {{ R$(statsCombo.lucro) }} ({{ statsCombo.margem.toFixed(0) }}%)
            </span>
          </div>
        </div>
      </div>
      <template #foot>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="fecharModal">Fechar</button>
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
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="fecharModal">Fechar</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { useStore } from '../store.js'
import { R$, normalizar, nowLocal, maskMoney, parseMoney, isInsumoSemPeso } from '../utils.js'
import BaseModal from '../components/BaseModal.vue'
import AppListRow from '../components/AppListRow.vue'
import CategoryFilter from '../components/CategoryFilter.vue'
import { useModalStack } from '../composables/useModalStack.js'
import { useConfirm } from '../composables/useConfirm.js'
import { useDeleteConfirm } from '../composables/useDeleteConfirm.js'
import { useListFilter } from '../composables/useListFilter.js'
import { gerarRelatorioReceitas } from '../composables/useGerarDocumento.js'

const s = useStore()
const { modal, abrirModal, fecharModal } = useModalStack()
const confirm = useConfirm()
const { confirmarExclusao } = useDeleteConfirm()

const saving = ref(false)

const pickerSearch = ref('')
const pickerTab    = ref('todos')
const pickerIndex  = ref(null)
const pickerTabs   = [{ v:'todos', l:'Tudo' }, { v:'insumos', l:'📦 Ingredientes' }, { v:'bases', l:'🥣 Bases' }]
const categoriasFiltro = ['Todas', 'Trufa', 'Cone', 'Barra', 'Brownie', 'Bolo', 'Ovo', 'Base']

// Mapeamos as categorias para a propriedade 'tipo' que o composable espera
const categoryMap = categoriasFiltro.reduce((acc, cat) => {
  if (cat !== 'Todas') acc[cat] = cat
  return acc
}, {})

const { busca, categoriaAtiva, listaFiltrada } = useListFilter(
  computed(() => s.receitas.map(r => ({ ...r, tipo: r.eh_intermediaria ? 'Base' : r.categoria }))),
  categoryMap,
  'Trufa'
)

/* ── Simulador Combo ── */
const comboItens = ref([{ id: '', qtd: 1 }])
const comboPrecoVenda = ref(0)
const statsCombo = computed(() => {
  let custo = 0
  comboItens.value.forEach(item => {
    const r = s.receitas.find(x => x.uuid === item.id)
    if (r) {
      const custoUnit = s.getCustoTotal(r) / (r.rendimento || 1)
      custo += custoUnit * (item.qtd || 0)
    }
  })
  const lucro = comboPrecoVenda.value - custo
  const margem = comboPrecoVenda.value > 0 ? (lucro / comboPrecoVenda.value) * 100 : 0
  return { custo, lucro, margem }
})

/* ── Inteligência de Estratégia (BI) ── */
const topSaida = computed(() => {
  return [...s.receitas]
    .filter(r => (popularidadeMap.value[r.uuid] || 0) > 0)
    .sort((a, b) => popularidadeMap.value[b.uuid] - popularidadeMap.value[a.uuid])
    .slice(0, 3)
})

const topLucro = computed(() => {
  return [...s.receitas]
    .sort((a, b) => s.getLucroInfo(b).percentual - s.getLucroInfo(a).percentual)
    .slice(0, 3)
})

const comboFeedback = computed(() => {
  if (comboItens.value.length <= 1 || !comboItens.value[0].id) {
    return { title: 'Monte seu Kit', msg: 'Combine itens de <strong>alta saída</strong> com itens de <strong>alta margem</strong>.', class: 'alert-orange' }
  }
  const hasPopular = comboItens.value.some(i => topSaida.value.some(ts => ts.uuid === i.id))
  const hasProfitable = comboItens.value.some(i => topLucro.value.some(tl => tl.uuid === i.id))

  if (hasPopular && hasProfitable) return { title: 'Combo Equilibrado!', msg: 'Ótima escolha! Você está usando um campeão de vendas para puxar um produto de alto lucro.', class: 'alert-green' }
  if (hasPopular) return { title: 'Combo de Volume', msg: 'Este combo foca em vender muito, mas cuidado: adicione algo de <strong>alto lucro</strong> para compensar.', class: 'alert-blue' }
  return { title: 'Combo de Margem', msg: 'Margem excelente, mas garanta que o cliente veja valor. Adicione um item <strong>favorito</strong> para facilitar a venda.', class: 'alert-orange' }
})

const escalaSugerida = computed(() => {
  if (comboPrecoVenda.value <= 0) return []
  const p = comboPrecoVenda.value
  return [
    { qtd: 1, total: p, unitario: p },
    { qtd: 2, total: arredondarPreco((p * 2) * 0.92), unitario: (arredondarPreco((p * 2) * 0.92) / 2) },
    { qtd: 3, total: arredondarPreco((p * 3) * 0.88), unitario: (arredondarPreco((p * 3) * 0.88) / 3) },
    { qtd: 5, total: arredondarPreco((p * 5) * 0.84), unitario: (arredondarPreco((p * 5) * 0.84) / 5) }
  ]
})

function arredondarPreco(v) {
  if (!v || v <= 0) return 0
  // Arredonda sempre para cima para o próximo 0,50 (Ex: 5,12 -> 5,50 | 5,97 -> 6,00)
  // Isso garante que você nunca perca margem no arredondamento e o preço fique "limpo".
  return Math.ceil(v * 2) / 2
}

watch(statsCombo, (val) => {
  if (comboPrecoVenda.value === 0 && val.custo > 0) comboPrecoVenda.value = arredondarPreco(val.custo * 3)
})

const popularidadeMap = computed(() => {
  const map = {}
  // Analisa o histórico de produções para identificar o que mais sai
  s.producoes.forEach(p => { map[p.receita_id] = (map[p.receita_id] || 0) + 1 })
  return map
})

function getRecipeInsights(r) {
  const info = s.getLucroInfo(r)
  const isHighMargin = info.percentual > 65
  const isPopular = (popularidadeMap.value[r.uuid] || 0) >= 3
  
  if (isHighMargin && isPopular) return ' [⭐ Campeão]'
  if (isHighMargin) return ' [💎 Alta Margem]'
  if (isPopular) return ' [🔥 Alta Saída]'
  return ''
}

const getEmptyForm = () => ({
  uuid: null,
  nome: '',
  nome_etiqueta: '',
  categoria: '',
  eh_intermediaria: 0,
  rendimento: null,
  unidade_rendimento: 'un',
  peso_unitario: null,
  preco_sugerido: null,
  modo_preparo: '',
  ingredientes: []
})

const form = reactive(getEmptyForm())

let receitaScrollTop = 0
let restoreReceitaScroll = false

const pickerBases = computed(() => {
  const q = normalizar(pickerSearch.value)
  return s.receitas
    .filter(r => r.uuid !== form.uuid && (!q || normalizar(r.nome).includes(q)))
    .map(r => ({ id: r.uuid, nome: r.nome, tipo: 'receita', unidade: r.unidade_rendimento || 'g', rendimento: r.rendimento || '?', key: 'r' + r.uuid }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
})

const pickerInsumos = computed(() => {
  const q = normalizar(pickerSearch.value)
  return s.produtos
    .filter(p => !q || normalizar(p.nome).includes(q))
    .map(p => ({ 
      id: p.uuid, nome: p.nome, tipo: 'produto', 
      unidade: p.unidade_base || 'g', key: 'p' + p.uuid 
    }))
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

const totalIngredientesG = computed(() => s.getPesoTotal(form))
const lucro = computed(() => s.getLucroInfo(form))

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

  if (!form.nome_etiqueta?.trim()) {
    form.nome_etiqueta = limparPrefixoCategoria(v)
  }
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

function ingredienteIncompleto(ing) {
  return !ing?.id || Number(ing.quantidade || 0) <= 0
}

function ingredienteDuplicado(ing, idxAtual) {
  if (!ing?.id) return false
  return form.ingredientes.some((item, idx) =>
    idx !== idxAtual && item?.id === ing.id && item?.tipo === ing.tipo
  )
}

function limparPrefixoCategoria(nome) {
  return String(nome || '')
    .replace(/^\s*(trufa|cone|barra|brownie|bolo|ovo)\s+/i, '')
    .trim()
}

/* ── Ingredientes ─────────────────────────────────────────────── */
function addNovoItem() {
  form.ingredientes.push({ _key: Math.random().toString(36).slice(2, 11), id: '', tipo: 'produto', quantidade: null, gera_peso: true })
  abrirPicker(form.ingredientes.length - 1)
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
  // Define o padrão automaticamente: embalagens e itens com nomes específicos começam desativados
  ing.gera_peso = item.tipo !== 'embalagem' && !isInsumoSemPeso(item.nome)
  
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

/* ── Modal ────────────────────────────────────────────────────── */
function abrir(r) {
  Object.assign(form, getEmptyForm())
  if (r) Object.assign(form, {
    uuid: r.uuid, nome: r.nome, nome_etiqueta: r.nome_etiqueta || '', categoria: r.categoria, eh_intermediaria: r.eh_intermediaria,
    rendimento: r.rendimento, unidade_rendimento: r.unidade_rendimento, peso_unitario: r.peso_unitario,
    preco_sugerido: r.preco_sugerido, modo_preparo: r.modo_preparo,
    ingredientes: (r.ingredientes || []).map(i => ({ ...i, _key: i.id + Math.random() }))
  })
  abrirModal('receita')
}

function abrirSimulador() {
  comboItens.value = [{ id: '', qtd: 1 }]
  comboPrecoVenda.value = 0
  abrirModal('simulador')
}

function gerarRelatorio() {
  gerarRelatorioReceitas({
    empresa: s.company,
    receitas: listaFiltrada.value,
    produtos: s.produtos,
    todasReceitas: s.receitas
  })
}

/* ── Salvar / Excluir ─────────────────────────────────────────── */
async function salvar() {
  if (!form.eh_intermediaria && pesoEsperado.value && Math.abs(diferencaPeso.value) > 5) {
    const ok = await confirm.ask(
      `A soma dos ingredientes (${totalIngredientesG.value.toFixed(0)}g) difere do peso esperado (${pesoEsperado.value.toFixed(0)}g). Deseja salvar assim mesmo?`,
      { title: 'Divergência de Peso', type: 'warning', confirmLabel: 'Salvar mesmo assim' }
    )
    if (!ok) return 
  }

  // Alerta de Prejuízo: Se houver preço de venda e o lucro for negativo
  if (form.preco_sugerido > 0 && lucro.value.valor < 0) {
    const ok = await confirm.ask(
      `O preço de venda (${R$(form.preco_sugerido)}) está abaixo do custo de produção (${R$(lucro.value.custoUnit)}). Você terá um prejuízo de ${R$(Math.abs(lucro.value.valor))} por unidade. Deseja salvar assim mesmo?`,
      { title: 'Aviso de Prejuízo', type: 'danger', confirmLabel: 'Salvar com Prejuízo' }
    )
    if (!ok) return
  }

  saving.value = true
  try {
    const payload = { ...form }
    if (!payload.uuid) payload.uuid = crypto.randomUUID()
    payload.ingredientes = payload.ingredientes.map(({ _key, ...rest }) => rest)
    await s.salvarReceita(payload)
    fecharModal()
  } catch (error) {
    if (!error?.validation) console.error(error)
  } finally { saving.value = false }
}

// Excluir via botão dentro do modal (receita já aberta)
async function excluir() {
  if (!form.uuid) return
  await confirmarExclusao({
    nome: form.nome, entidade: 'receita',
    onConfirm: () => s.excluirReceita(form.uuid),
    onDone: fecharModal,
  })
}

// Excluir direto pelo swipe (sem modal aberto)
async function excluirDireto(r) {
  await confirmarExclusao({
    nome: r.nome, entidade: 'receita',
    onConfirm: () => s.excluirReceita(r.uuid),
  })
}
</script>

<style scoped>
/* ── Ícones e badges de receita (exclusivos desta tela) ── */
.recipe-icon  { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:.95rem; flex-shrink:0 }
.recipe-price  { color:var(--green); font-weight:700; font-family:var(--mono) }
.recipe-dot    { color:var(--border2) }
.recipe-profit { font-size:.75rem; color:var(--brown-mid); font-weight:700 }
.recipe-profit.negative { color:var(--red) }
.recipe-profit.profit-low { color: var(--orange); }
.recipe-profit.profit-high { color: var(--green); font-weight: 800; }

.alert-green { background: var(--green-bg); border: 1px solid var(--green-dim); color: var(--green); }
.alert-blue { background: var(--blue-bg); border: 1px solid #bfdbfe; color: var(--blue); }

/* ── Categoria pills no modal (scroll interno) ── */
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
.cat-pill.active { background: var(--brown); color: #fff; border-color: var(--brown); }
.cat-pill:active { transform: scale(.95) }

/* ── Grids de rendimento ── */
.render-row      { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; margin-bottom: 4px; }
.render-row-slim { display: grid; grid-template-columns: 1fr 1.8fr; gap: 10px; margin-bottom: 4px; }

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
.profit-row       { display: flex; justify-content: space-between; align-items: center; }
.profit-row-total { padding-top: 8px }
.profit-label { font-size: .82rem; color: var(--muted) }
.profit-val   { font-size: .88rem; font-weight: 800; font-family: var(--mono); color: var(--brown) }
.profit-val.cost { color: var(--orange) }
.profit-val.gain { color: var(--green) }
.profit-val.loss { color: var(--red) }
.profit-divider { height: 1px; background: var(--green-dim); margin: 2px 0 }

/* ── Markup Helpers ── */
.markup-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}
.markup-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: all var(--t);
}
.markup-btn:active { transform: scale(0.95); background: var(--cream-deep); }
.markup-btn.highlight { border-color: var(--green); background: var(--green-bg); }
.markup-btn span { font-size: 0.9rem; font-weight: 800; color: var(--brown-dark); }
.markup-btn small { font-size: 0.65rem; color: var(--muted); font-weight: 600; text-transform: uppercase; }

/* ── BI Cards ── */
.bi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bi-card { background: var(--surface); padding: 10px; border-radius: var(--r-md); border: 1px solid var(--border); }
.bi-lbl { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px; }
.bi-list { display: flex; flex-direction: column; gap: 4px; }
.bi-item { font-size: 0.72rem; font-weight: 700; color: var(--brown-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bi-item small { color: var(--muted); font-weight: 500; margin-left: 2px; }

/* ── Price Ladder ── */
.price-ladder { background: var(--brown-dark); border-radius: var(--r-lg); padding: 12px; color: #fff; }
.ladder-title { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--gold-light); margin-bottom: 10px; text-align: center; }
.ladder-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ladder-item { 
  display: flex; flex-direction: column; align-items: center; 
  background: rgba(255,255,255,0.1); padding: 8px 4px; border-radius: var(--r-md);
}
.l-qtd { font-size: 0.65rem; font-weight: 700; opacity: 0.8; }
.l-val { font-size: 0.9rem; font-weight: 800; color: var(--gold-light); margin: 2px 0; }
.l-unit { font-size: 0.55rem; opacity: 0.6; }

/* ── Combo Builder ── */
.combo-item-row { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; }
.combo-result { background: var(--surface); border: 2px solid var(--gold); }
.c-green { color: var(--green) !important; }

/* ── Ingredientes no formulário ── */
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

.ing-row-slim    { margin-bottom: 6px; }
.ing-row-content {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 4px 4px 4px 8px;
  min-height: 52px;
}
.ing-row-content.is-recipe { background: #f0f8ff; border-color: #bfdbfe; }
.ing-row-content.is-invalid { border-color: #f59e0b; background: #fffaf0; }
.ing-row-content.is-duplicate { border-color: #ef4444; }

.ing-btn-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  text-align: left;
  min-width: 0;
  padding: 0;
}
.ing-ico-sm   { font-size: 1rem; flex-shrink: 0; }
.ing-name-txt { font-size: .82rem; font-weight: 700; color: var(--brown-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ing-qty-field {
  display: flex;
  align-items: center;
  background: var(--bg);
  border-radius: var(--r-xs);
  border: 1px solid var(--border);
  padding-right: 6px;
  width: 85px;
  flex-shrink: 0;
}
.ing-input-slim {
  width: 100%;
  border: none;
  background: var(--surface);
  padding: 6px 4px;
  font-size: .88rem;
  font-family: var(--mono);
  font-weight: 800;
  text-align: right;
  border-radius: var(--r-xs) 0 0 var(--r-xs);
}
.ing-input-slim:focus { outline: none; background: #fff; }
.ing-unit-slim  { font-size: .65rem; font-weight: 800; color: var(--muted); margin-left: 2px; text-transform: lowercase; }

.ing-row-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 4px 0 8px;
}
.ing-meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: var(--r-full);
  font-size: .7rem;
  font-weight: 700;
}
.ing-meta-chip.warn { background: #fff3cd; color: #92400e; }
.ing-meta-chip.cost { background: var(--cream); color: var(--brown-mid); }

.ing-actions-slim { display: flex; gap: 4px; }
.btn-action-slim {
  width: 34px; height: 34px;
  border-radius: var(--r-xs);
  border: 1px solid var(--border);
  background: #fff;
  color: var(--border2);
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem;
}
.btn-action-slim.active { color: var(--gold-dark); background: var(--gold-bg); border-color: var(--gold-dark); }
.btn-del-slim { background: var(--red-bg); color: var(--red); border-color: transparent; }

/* ── Botões de adicionar ingrediente ── */
.btn-add-ing {
  display: flex; align-items: center; justify-content: center;
  gap: 7px; width: 100%; padding: 13px;
  border: 2px dashed var(--border2); border-radius: var(--r-md);
  background: transparent; color: var(--brown-mid);
  font-size: .875rem; font-weight: 700; margin-top: 8px; min-height: 50px;
  transition: all var(--t);
}
.btn-add-ing:active { background: var(--cream); border-color: var(--brown-light); transform: scale(.98) }

.btn-ing-detail {
  display: flex; align-items: center; justify-content: center;
  gap: 7px; width: 100%; padding: 11px;
  border: 1.5px solid var(--border); border-radius: var(--r-sm);
  background: var(--cream); color: var(--muted);
  font-size: .82rem; font-weight: 700; margin-top: 6px; min-height: 44px;
  transition: all var(--t);
}
.btn-ing-detail:active { background: var(--cream-deep) }

/* ── Textarea modo de preparo ── */
.textarea-preparo { resize: vertical; min-height: 96px; line-height: 1.6; }

/* ── Modal: detalhes de ingredientes ── */
.details-list { display: flex; flex-direction: column; gap: 8px; }
.details-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface);
}
.details-main { min-width: 0 }
.details-name  { font-size: .9rem; font-weight: 700; color: var(--text) }
.details-sub   { font-size: .78rem; color: var(--muted); margin-top: 3px }
.details-value { font-size: .86rem; font-weight: 800; color: var(--brown); white-space: nowrap }
.details-total {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 14px; padding: 12px 14px; border-radius: var(--r-sm);
  background: var(--cream); border: 1px solid var(--border); font-size: .9rem; color: var(--brown-dark);
}

/* ── Picker de ingredientes / sub-receitas ── */
.picker-list { display: flex; flex-direction: column; gap: 4px; }
.picker-grupo-label { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); padding: 12px 4px 6px; }
.picker-row {
  display: flex; align-items: center; gap: 10px; padding: 13px 12px;
  border-radius: var(--r-sm); border: 1.5px solid var(--border);
  background: var(--surface); cursor: pointer; min-height: 56px; transition: background var(--t);
}
.picker-row:active     { background: var(--gold-bg) }
.picker-row-base       { border-color: #bfdbfe; background: #f0f8ff; }
.picker-row-base:active { background: #dbeafe }
.picker-criar          { border-color: var(--green-dim); background: var(--green-bg); }
.picker-criar:active   { background: #d1fae5 }
.picker-criar-icon {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--green); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0;
}
.picker-tipo-badge { font-size: 1.2rem; flex-shrink: 0 }
.picker-row-info  { flex: 1; min-width: 0 }
.picker-row-nome  { font-size: .9rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.picker-row-sub   { font-size: .78rem; color: var(--muted); margin-top: 2px }
.picker-vazio     { text-align: center; color: var(--muted); font-size: .875rem; padding: 28px 0 }

@media (max-width: 380px) {
  .render-row { grid-template-columns: 1fr 1fr; }
  .render-peso { grid-column: 1 / -1; }
}
</style>
