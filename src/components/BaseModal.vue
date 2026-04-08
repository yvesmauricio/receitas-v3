<template>
  <Teleport to="body">
    <div class="modal-bg" :class="{ center, fullscreen }" @click.self="!persistent && emit('close')">
      <div class="modal-box" :class="{ fullscreen }">
        <div v-if="!center && !fullscreen" class="modal-handle"></div>
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
defineProps({
  title: String,
  center: Boolean,
  persistent: Boolean,
  fullscreen: {
    type: Boolean,
    default: true
  }
})
const emit = defineEmits(['close'])
</script>
