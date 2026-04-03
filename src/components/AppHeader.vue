<template>
  <header class="hdr">
    <div class="hdr-logo">
      <span class="logo-emoji">🍫</span>
      <div>
        <div class="hdr-name">{{ s.company.nome }}</div>
        <div class="hdr-slogan">{{ s.company.slogan }}</div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="hdr-actions">
        <button class="hdr-btn" title="Configurações" @click="s.openModal('settings')">
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>
  </header>
</template>
<script setup>
import { useStore } from '../store.js'
const s = useStore()
</script>

<style scoped>
.logo-emoji { font-size: 1.5rem; }
.hdr-right { display: flex; align-items: center; gap: 8px; }
</style>
