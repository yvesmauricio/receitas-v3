<template>
  <header class="hdr">
    <div class="hdr-logo">
      <div class="hdr-logo-icon">🍫</div>
      <div class="hdr-text">
        <div class="hdr-name">{{ s.company.nome }}</div>
        <div class="hdr-slogan">{{ s.company.slogan }}</div>
      </div>
    </div>
    <div class="hdr-right">
      <div class="hdr-actions">
        <button class="hdr-btn" :class="{ active: s.tab === 'ajustes' }" title="Configurações" @click="s.setTab('ajustes')">
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