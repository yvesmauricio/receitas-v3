<template>
  <div class="tab-financeiro">
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-money-check-dollar"></i> Financeiro</h2>
        <button v-if="s.financeiro.length" class="btn-reimportar" @click="reimportarCSV" :disabled="reimportando">
          <i class="fas" :class="reimportando ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
          {{ reimportando ? 'Reimportando...' : 'Reimportar' }}
        </button>
      </div>
      <p class="tab-subtitle">
        Concilie o extrato do PagBank, acompanhe os recebimentos PIX e consolide o relatório mensal
        do MEI.
      </p>
    </div>

    <ImportadorExtrato @editar-lancamento="abrirModalEdicao" />

    <ImportadorOutroBanco />

    <div v-if="!s.financeiro.length" class="empty-state">
      <p>Nenhum lançamento importado ainda.</p>
      <p>Importe um arquivo CSV do PagBank para começar.</p>
    </div>

    <div v-else class="lancamentos-section">
      <div class="section-title">
        <div class="section-title-content">
          <h3>Todos os lançamentos ({{ s.financeiro.length }})</h3>
          <span class="hint-text">Clique para editar categoria • Deslize para mais ações</span>
        </div>
      </div>
      <div class="lancamentos-list">
        <div
          v-for="item in s.financeiro"
          :key="item.id"
          class="lancamento-row"
          @click="abrirModalEdicao(item)"
        >
          <div class="row-left">
            <div class="row-title">{{ item.descricao }}</div>
            <div class="row-subtitle">
              {{ formatarData(item.data) }} •
              <span class="badge">{{ item.categoria }}</span>
              • {{ item.tipo }}
            </div>
          </div>
          <div class="row-right" :class="item.valor >= 0 ? 'green' : 'red'">
            {{ R$(Math.abs(item.valor)) }}
          </div>
        </div>
      </div>
    </div>

    <EditarCategoriaModal
      v-if="lancamentoEmEdicao"
      :lancamento="lancamentoEmEdicao"
      @close="lancamentoEmEdicao = null"
      @salvo="lancamentoEmEdicao = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ImportadorExtrato from '../components/ImportadorExtrato.vue'
import ImportadorOutroBanco from '../components/ImportadorOutroBanco.vue'
import EditarCategoriaModal from '../components/EditarCategoriaModal.vue'
import { useStore } from '../store.js'
import { R$ } from '../utils.js'

const s = useStore()
const lancamentoEmEdicao = ref(null)
const reimportando = ref(false)

function formatarData(dataIso) {
  if (!dataIso) return ''
  const [ano, mes, dia] = dataIso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataIso
}

function abrirModalEdicao(lancamento) {
  lancamentoEmEdicao.value = lancamento
}

async function reimportarCSV() {
  reimportando.value = true
  try {
    const nomeEmCache = localStorage.getItem('pagbank_csv_nome')
    
    if (!nomeEmCache) {
      s.notify('Nenhum arquivo em cache. Importe um novo extrato.', 'warning')
      return
    }

    s.notify(`Recarregando ${nomeEmCache}...`, 'success', 2000)
    await new Promise(r => setTimeout(r, 1200))
    await s.carregarFinanceiro()
    
    s.notify('Dados recarregados com sucesso!', 'success', 2500)
  } catch (error) {
    console.error(error)
    s.notify('Erro ao recarregar dados.', 'error')
  } finally {
    reimportando.value = false
  }
}

onMounted(() => {
  s.carregarFinanceiro()
})
</script>

<style scoped>
.tab-financeiro {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--muted);
  text-align: center;
}

.empty-state p {
  margin: 8px 0;
}

.tab-hdr {
  padding: 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-hdr-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.tab-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-reimportar {
  padding: 6px 12px;
  background: var(--brown);
  color: #fff;
  border: none;
  border-radius: var(--r-md);
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background var(--t), transform var(--t);
  flex-shrink: 0;
}

.btn-reimportar:active:not(:disabled) {
  background: var(--brown-dark);
  transform: scale(.95);
}

.btn-reimportar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tab-subtitle {
  font-size: .8rem;
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

.lancamentos-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  padding: 12px 16px;
  font-size: .9rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.section-title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title-content h3 {
  margin: 0;
  font-size: .95rem;
  color: var(--text);
  text-transform: none;
  font-weight: 600;
  letter-spacing: normal;
}

.hint-text {
  font-size: .75rem;
  color: var(--muted);
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
}

.lancamentos-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.entry-title {
  font-size: .95rem;
  font-weight: 500;
  color: var(--text);
  word-break: break-word;
}

.entry-sub {
  font-size: .8rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--gold-bg);
  color: var(--gold-dark);
  border-radius: 3px;
  font-weight: 600;
  font-size: .75rem;
}

.category-badge.manual {
  background: var(--blue-bg);
  color: var(--blue);
}

.category-badge i {
  font-size: .6rem;
}

.entry-value {
  font-size: .95rem;
  font-weight: 600;
  text-align: right;
}

.c-green {
  color: var(--green);
}

.c-red {
  color: var(--red);
}

.lancamentos-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.lancamento-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.2s;
}

.lancamento-row:active {
  background: var(--bg-hover);
}

.row-left {
  flex: 1;
  min-width: 0;
}

.row-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
  word-break: break-word;
  margin-bottom: 4px;
}

.row-subtitle {
  font-size: 0.8rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  background: var(--gold-bg);
  color: var(--gold-dark);
  border-radius: 3px;
  font-weight: 600;
  font-size: 0.75rem;
}

.row-right {
  font-size: 0.95rem;
  font-weight: 600;
  text-align: right;
  margin-left: 12px;
  flex-shrink: 0;
}

.row-right.green {
  color: var(--green);
}

.row-right.red {
  color: var(--red);
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: var(--r-sm);
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background var(--t);
  white-space: nowrap;
}

.action-edit {
  background: var(--blue-bg);
  color: var(--blue);
}

.action-edit:active {
  background: var(--blue-dark);
  color: #fff;
}

.action-delete {
  background: var(--red-bg);
  color: var(--red);
}

.action-delete:active {
  background: var(--red-dark);
  color: #fff;
}
</style>
