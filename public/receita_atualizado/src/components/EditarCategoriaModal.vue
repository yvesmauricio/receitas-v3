<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box">

      <div class="modal-hdr">
        <div class="modal-hdr-left">
          <i class="fas fa-tag"></i>
          <div>
            <h2>{{ modoLote ? `Categorizar ${ids.length} lançamentos` : 'Editar Lançamento' }}</h2>
            <p class="modal-sub">{{ modoLote ? 'Todos receberão a mesma categoria' : lancamento?.descricao }}</p>
          </div>
        </div>
        <button class="close-btn" @click="emit('close')"><i class="fas fa-xmark"></i></button>
      </div>

      <div v-if="!modoLote && lancamento" class="lancamento-info">
        <div class="info-row">
          <span>Data</span><strong>{{ formatarData(lancamento.data) }}</strong>
        </div>
        <div class="info-row">
          <span>Valor</span>
          <strong :class="lancamento.valor >= 0 ? 'c-green' : 'c-red'">
            {{ lancamento.valor >= 0 ? '+' : '' }}{{ R$(lancamento.valor) }}
          </strong>
        </div>
        <div class="info-row">
          <span>Conta</span>
          <strong :class="lancamento.banco === 'pagbank' ? 'badge-pb' : (lancamento.banco === 'bb' ? 'badge-bb' : 'badge-it')">
            {{ lancamento.conta_nome || (lancamento.banco === 'pagbank' ? 'PagBank' : (lancamento.banco === 'bb' ? 'Banco do Brasil' : 'Itaú')) }}
          </strong>
        </div>
      </div>

      <div class="modal-body">
        <p class="label-escolha">Categoria MEI:</p>
        <div v-for="grupo in gruposOrdenados" :key="grupo.nome" class="grupo">
          <div class="grupo-titulo">
            <span class="grupo-natureza" :class="'nat-' + grupo.natureza">{{ labelNatureza(grupo.natureza) }}</span>
            {{ grupo.nome }}
          </div>
          <div class="categoria-grid">
            <button v-for="cat in grupo.categorias" :key="cat.nome"
              class="cat-btn" :class="{ selected: novaCategoria === cat.nome }"
              @click="novaCategoria = cat.nome">
              <i class="fas" :class="cat.icon"></i>
              <span>{{ cat.nome }}</span>
              <i v-if="novaCategoria === cat.nome" class="fas fa-check check-icon"></i>
            </button>
          </div>
        </div>

        <div v-if="!modoLote && mesmaDescricaoRelacionados.length > 1" class="escopo-box">
          <p class="escopo-label">Aplicar alteração em:</p>
          <div class="escopo-grid">
            <button
              class="escopo-btn"
              :class="{ selected: escopoEdicao === 'apenas-este' }"
              @click="escopoEdicao = 'apenas-este'"
            >
              <i class="fas fa-file-circle-check"></i>
              <span>Apenas este lançamento</span>
            </button>
            <button
              class="escopo-btn"
              :class="{ selected: escopoEdicao === 'mesma-descricao' }"
              @click="escopoEdicao = 'mesma-descricao'"
            >
              <i class="fas fa-layer-group"></i>
              <span>Todos com a mesma descrição ({{ mesmaDescricaoRelacionados.length }})</span>
            </button>
          </div>
          <p class="escopo-hint">Descrição considerada: {{ lancamento?.descricao }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="emit('close')">Cancelar</button>
        <button class="btn-save" :disabled="!novaCategoria || salvando" @click="salvar">
          <i class="fas" :class="salvando ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ salvando ? 'Salvando...' : (modoLote ? `Aplicar a ${ids.length}` : 'Salvar') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStore } from '../store.js'
import { R$ } from '../utils.js'

const props = defineProps({
  lancamento: { type: Object, default: null },
  ids:        { type: Array,  default: () => [] }
})
const emit = defineEmits(['close', 'salvo'])

const s = useStore()
const novaCategoria = ref('')
const salvando = ref(false)
const escopoEdicao = ref('apenas-este')

const modoLote = computed(() => props.ids.length > 0)

watch(() => props.lancamento, (l) => {
  if (l) {
    novaCategoria.value = l.categoria || ''
    escopoEdicao.value = 'apenas-este'
  }
}, { immediate: true })

const mesmaDescricaoRelacionados = computed(() => {
  if (!props.lancamento?.descricao) return []
  const descricaoNormalizada = normalizarDescricao(props.lancamento.descricao)
  return s.financeiro.filter(item => normalizarDescricao(item.descricao) === descricaoNormalizada)
})

const gruposOrdenados = computed(() => {
  const map = new Map()
  for (const cat of s.CATEGORIAS_MEI) {
    if (!map.has(cat.grupo)) map.set(cat.grupo, { nome: cat.grupo, natureza: cat.natureza, categorias: [] })
    map.get(cat.grupo).categorias.push(cat)
  }
  return [...map.values()]
})

function labelNatureza(n) {
  return { entrada: '↑ Receita', operacional: '↓ Operacional', pessoal: '↓ Pessoal', interna: '⇄ Interna' }[n] || n
}

function formatarData(dataIso) {
  if (!dataIso) return ''
  const [ano, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}

function normalizarDescricao(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

async function salvar() {
  if (!novaCategoria.value) return
  salvando.value = true
  try {
    if (modoLote.value) {
      await s.atualizarLancamentosEmLote(props.ids, { categoria: novaCategoria.value })
    } else if (escopoEdicao.value === 'mesma-descricao') {
      await s.atualizarLancamentosEmLote(
        mesmaDescricaoRelacionados.value.map(item => item.id),
        { categoria: novaCategoria.value }
      )
    } else {
      await s.atualizarLancamentoFinanceiro(props.lancamento.id, { categoria: novaCategoria.value })
    }
    emit('salvo')
    emit('close')
  } catch (e) {
    console.error(e)
    s.notify('Erro ao salvar categoria.', 'error')
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(30,18,8,.55); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
.modal-box { background: var(--surface); border-radius: var(--r-xl) var(--r-xl) 0 0; width: 100%; max-width: 480px; max-height: 92vh; display: flex; flex-direction: column; animation: slideUp .22s var(--t-spring); }
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-hdr-left { display: flex; gap: 10px; align-items: flex-start; }
.modal-hdr-left > i { margin-top: 3px; color: var(--gold-dark); font-size: 1rem; }
.modal-hdr h2 { font-size: .98rem; font-weight: 700; color: var(--brown-dark); margin: 0 0 3px; }
.modal-sub { font-size: .78rem; color: var(--muted); margin: 0; line-height: 1.4; word-break: break-word; }
.close-btn { width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--bg); color: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.lancamento-info { padding: 10px 16px; background: var(--cream); border-bottom: 1px solid var(--border); display: flex; gap: 16px; flex-shrink: 0; flex-wrap: wrap; }
.info-row { display: flex; flex-direction: column; gap: 2px; }
.info-row span { font-size: .65rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.info-row strong { font-size: .82rem; color: var(--text); }
.badge-pb { color: var(--gold-dark); }
.badge-it { color: var(--blue); }
.badge-bb { color: #0f4ea8; }

.modal-body { flex: 1; overflow-y: auto; padding: 14px 16px; -webkit-overflow-scrolling: touch; min-height: 0; }
.label-escolha { font-size: .8rem; font-weight: 700; color: var(--brown-dark); margin: 0 0 12px; }
.grupo { margin-bottom: 16px; }
.grupo-titulo { font-size: .72rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.grupo-natureza { padding: 2px 7px; border-radius: var(--r-full); font-size: .65rem; font-weight: 800; }
.nat-entrada    { background: var(--green-bg);  color: var(--green); }
.nat-operacional{ background: var(--red-bg);    color: var(--red); }
.nat-pessoal    { background: var(--orange-bg); color: var(--orange); }
.nat-interna    { background: var(--blue-bg);   color: var(--blue); }

.categoria-grid { display: flex; flex-direction: column; gap: 6px; }
.cat-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: var(--r-md); background: var(--bg); color: var(--text); text-align: left; transition: all var(--t); }
.cat-btn i:first-child { width: 20px; text-align: center; color: var(--muted); font-size: .85rem; flex-shrink: 0; }
.cat-btn span { flex: 1; font-size: .85rem; font-weight: 500; }
.cat-btn.selected { border-color: var(--brown); background: var(--gold-bg); color: var(--brown-dark); }
.cat-btn.selected i:first-child { color: var(--gold-dark); }
.check-icon { color: var(--brown) !important; font-size: .75rem !important; width: auto !important; }
.cat-btn:active { transform: scale(.98); }

.escopo-box { margin-top: 18px; padding: 14px; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--cream); }
.escopo-label { font-size: .8rem; font-weight: 700; color: var(--brown-dark); margin: 0 0 10px; }
.escopo-grid { display: flex; flex-direction: column; gap: 8px; }
.escopo-btn { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border: 1.5px solid var(--border); border-radius: var(--r-md); background: var(--bg); color: var(--text); text-align: left; transition: all var(--t); }
.escopo-btn i { width: 18px; text-align: center; color: var(--muted); flex-shrink: 0; }
.escopo-btn span { flex: 1; font-size: .84rem; }
.escopo-btn.selected { border-color: var(--brown); background: var(--gold-bg); color: var(--brown-dark); }
.escopo-btn.selected i { color: var(--gold-dark); }
.escopo-hint { margin: 10px 0 0; font-size: .74rem; line-height: 1.45; color: var(--muted); word-break: break-word; }

.modal-footer { padding: 12px 16px max(20px, env(safe-area-inset-bottom)); border-top: 1px solid var(--border); display: flex; gap: 10px; flex-shrink: 0; }
.btn-cancel, .btn-save { flex: 1; padding: 12px; border: none; border-radius: var(--r-md); font-size: .9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px; transition: all var(--t); }
.btn-cancel { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }
.btn-cancel:active { background: var(--cream); }
.btn-save { background: var(--brown); color: #fff; flex: 2; }
.btn-save:active:not(:disabled) { background: var(--brown-dark); }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }
.c-green { color: var(--green); }
.c-red   { color: var(--red); }
</style>
