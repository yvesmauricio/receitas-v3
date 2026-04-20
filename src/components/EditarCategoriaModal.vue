<template>
  <div v-if="lancamento" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <h2>Editar Categoria</h2>
        <button @click="emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <p><strong>Descrição:</strong> {{ lancamento?.descricao }}</p>
        <p><strong>Data:</strong> {{ lancamento?.data }}</p>
        <p><strong>Valor:</strong> {{ lancamento?.valor }}</p>

        <label for="categoria">
          <strong>Nova Categoria:</strong>
        </label>
        <select id="categoria" v-model="novaCategoria">
          <option value="">-- Selecione --</option>
          <option value="Receita">Receita</option>
          <option value="Moradia">Moradia</option>
          <option value="Mercado">Mercado</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Impostos e taxas">Impostos e taxas</option>
          <option value="Cartao e compras">Cartao e compras</option>
          <option value="Taxas e servicos">Taxas e servicos</option>
          <option value="Rendimento financeiro">Rendimento financeiro</option>
          <option value="Outras entradas">Outras entradas</option>
          <option value="Outras saidas">Outras saidas</option>
        </select>
      </div>

      <div class="modal-footer">
        <button @click="emit('close')" class="btn-secondary">Cancelar</button>
        <button @click="salvar" class="btn-primary">Salvar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStore } from '../store.js'

const props = defineProps({ lancamento: Object })
const emit = defineEmits(['close', 'salvo'])

const s = useStore()
const novaCategoria = ref('')

watch(() => props.lancamento, (novo) => {
  if (novo) {
    novaCategoria.value = novo.categoria || ''
  }
}, { immediate: true })

async function salvar() {
  if (!novaCategoria.value) {
    alert('Selecione uma categoria!')
    return
  }
  try {
    await s.atualizarLancamentoFinanceiro(props.lancamento.id, { 
      categoria: novaCategoria.value 
    })
    emit('salvo')
    emit('close')
  } catch (e) {
    console.error('Erro ao atualizar:', e)
    alert('Erro ao atualizar categoria')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-box {
  background: var(--surface);
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--muted);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-body p {
  margin: 0;
  font-size: 0.95rem;
}

.modal-body label {
  font-size: 0.95rem;
  margin-top: 8px;
}

select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
}

select:focus {
  outline: none;
  border-color: var(--brown);
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 8px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s;
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text);
}

.btn-secondary:active {
  background: var(--border);
}

.btn-primary {
  background: var(--brown);
  color: white;
}

.btn-primary:active {
  background: var(--brown-dark);
}
</style>
