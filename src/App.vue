<template>
  <div class="shell">
    <AppHeader />

    <main class="main">
      <TabInsumos   v-show="s.tab === 'insumos'" />
      <TabReceitas  v-show="s.tab === 'receitas'" />
      <TabProducao  v-show="s.tab === 'producao'" />
    </main>

    <AppNav />

    <!-- ─── Modal Configurações (global) ─────────────────────── -->
    <BaseModal v-if="s.modal?.id === 'settings'" title="Configurações" @close="s.closeModal()">
      <div class="settings-section"><i class="fas fa-store"></i> Empresa</div>
      <div class="fg"><label class="label">Nome</label><input v-model="cfg.nome" class="input" /></div>
      <div class="fg"><label class="label">Slogan</label><input v-model="cfg.slogan" class="input" /></div>

      <div class="settings-section"><i class="fas fa-database"></i> Backup e Segurança</div>
      <p class="settings-hint">Os dados ficam salvos apenas neste dispositivo. Faça backups regulares.</p>
      <div class="grid-2">
        <button class="btn btn-secondary" @click="s.backupGeral()"><i class="fas fa-download"></i> Exportar JSON</button>
        <label class="btn btn-secondary pointer">
          <i class="fas fa-upload"></i> Importar JSON
          <input type="file" hidden accept=".json" @change="e => s.restaurarGeral(e.target.files[0])" />
        </label>
      </div>

      <template #foot>
        <button class="btn btn-secondary" @click="s.closeModal()">Cancelar</button>
        <button class="btn btn-primary" @click="salvarConfig">Salvar</button>
      </template>
    </BaseModal>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="s.toast" :key="s.toast.id" class="toast" :class="`toast-${s.toast.tipo}`">{{ s.toast.msg }}</div>
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
import { reactive, onMounted } from 'vue'
import { useStore } from './store.js'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import BaseModal from './components/BaseModal.vue'
import TabInsumos from './views/TabInsumos.vue'
import TabReceitas from './views/TabReceitas.vue'
import TabProducao from './views/TabProducao.vue'

const s = useStore()

// Settings form — reativos ao store
const cfg = reactive({ ...s.company })

function salvarConfig() {
  s.saveCompany({ ...cfg })
  s.notify('Configurações salvas!')
  s.closeModal()
}

onMounted(async () => {
  await s.init()
  // Após o init carregar o IndexedDB, sincronizamos os objetos do formulário
  Object.assign(cfg, s.company)
})
</script>

<style scoped>
.settings-hint { font-size: .75rem; color: var(--muted); margin-bottom: 10px; }
.pointer { cursor: pointer; }
</style>