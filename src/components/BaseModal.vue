<template>
  <Teleport to="body">
    <div class="modal-bg" :class="{ center }" @click.self="!persistent && emit('close')">
      <div class="modal-box">
        <div class="modal-hdr">
          <span class="modal-title"><slot name="title">{{ title }}</slot></span>
          <button class="modal-x" @click="emit('close')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body"><slot /></div>
        <div v-if="$slots.foot" class="modal-foot"><slot name="foot" /></div>
      </div>
    </div>
  </Teleport>
</template>
<script setup>
defineProps({ title: String, center: Boolean, persistent: Boolean })
const emit = defineEmits(['close'])
</script>

<style scoped>
.modal-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg); /* Fundo sólido para focar totalmente na tarefa */
  z-index: 2000;
  display: flex;
  animation: fade-in 0.2s ease-out;
}

.modal-box {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  border-radius: 0 !important;
  display: flex;
  flex-direction: column;
  box-shadow: none !important;
  border: none !important;
}

.modal-hdr {
  /* Suporte para Safe Area (entalhe da câmera/notch no topo) */
  padding-top: calc(12px + env(safe-area-inset-top)) !important;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  /* Scroll suave no iOS/Android */
  -webkit-overflow-scrolling: touch; 
}

.modal-foot {
  background: var(--card);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  /* Suporte para a barra de gestos no Android/iOS */
  padding-bottom: calc(16px + env(safe-area-inset-bottom)) !important;
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

/* Removemos o handle (alça) pois agora o modal não é mais deslizante */
.modal-handle { display: none; }
</style>
