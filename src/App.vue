<template>
  <div class="shell">
    <AppHeader />

    <main class="main">
      <TabInsumos   v-show="s.tab === 'insumos'" />
      <TabReceitas  v-show="s.tab === 'receitas'" />
      <TabProducao  v-show="s.tab === 'producao'" />
      <TabPainel    v-show="s.tab === 'painel'" />
      <TabInteligencia v-show="s.tab === 'inteligencia'" />
      <TabFinanceiro v-show="s.tab === 'financeiro'" />
      <TabCozinha   v-show="s.tab === 'cozinha'" />
      <TabAjustes   v-show="s.tab === 'ajustes'" />
    </main>

    <AppNav />

    <!-- ─── Confirmação Global ───────────────────────────────── -->
    <ConfirmDialog />

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="s.toast" :key="s.toast.id" class="toast" :class="`toast-${s.toast.tipo}`">
        {{ s.toast.msg }}
      </div>
    </Transition>

    <!-- Loader global -->
    <Transition name="fade">
      <div v-if="s.loading" class="loader-overlay">
        <div class="spinner"></div>
        <p>Carregando dados…</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useStore } from './store.js'
import AppHeader    from './components/AppHeader.vue'
import AppNav       from './components/AppNav.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import TabInsumos   from './views/TabInsumos.vue'
import TabReceitas  from './views/TabReceitas.vue'
import TabProducao  from './views/TabProducao.vue'
import TabPainel    from './views/TabPainel.vue'
import TabInteligencia from './views/TabInteligencia.vue'
import TabFinanceiro from './views/TabFinanceiro.vue'
import TabCozinha   from './views/TabCozinha.vue'
import TabAjustes    from './views/TabAjustes.vue'

const s = useStore()

onMounted(async () => {
  await s.init()
})
</script>

<style scoped>
</style>
