<template>
  <nav class="nav">
    <button v-for="n in nav" :key="n.id" class="nav-btn" :class="{ active: s.tab === n.id }" @click="s.setTab(n.id)">
      <i :class="n.icon"></i>
      <span>{{ n.label }}</span>
    </button>
  </nav>
</template>
<script setup>
import { useStore } from '../store.js'
const s = useStore()
const nav = [
  { id: 'insumos',    icon: 'fas fa-box-open',        label: 'Insumos' },
  { id: 'receitas',   icon: 'fas fa-book-open',        label: 'Receitas' },
  { id: 'producao',   icon: 'fas fa-industry',         label: 'Produção' },
  { id: 'painel',     icon: 'fas fa-chart-pie',       label: 'Painel' }
]
</script>
