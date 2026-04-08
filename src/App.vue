<template>
  <div class="shell">
    <AppHeader />

    <main class="main">
      <TabInsumos   v-show="s.tab === 'insumos'" />
      <TabReceitas  v-show="s.tab === 'receitas'" />
      <TabProducao  v-show="s.tab === 'producao'" />
      <TabPainel    v-show="s.tab === 'painel'" />
    </main>

    <AppNav />

    <!-- ─── Modal Configurações (global) ─────────────────────── -->
    <BaseModal v-if="s.modal?.id === 'settings'" title="Configurações" @close="closeSettings">
      <div class="settings-section"><i class="fas fa-store"></i> Empresa</div>
      <div class="fg"><label class="label">Nome</label><input v-model="cfg.nome" class="input" /></div>
      <div class="fg"><label class="label">Slogan</label><input v-model="cfg.slogan" class="input" /></div>

      <div class="settings-section"><i class="fas fa-database"></i> Backup e Segurança</div>
      <p class="settings-hint">Os dados ficam salvos apenas neste dispositivo. Faça backups regulares.</p>
      <div class="backup-btns">
        <button class="btn btn-secondary btn-full" @click="s.backupGeral()"><i class="fas fa-download"></i> Exportar Backup JSON</button>
        <label class="btn btn-secondary btn-full pointer">
          <i class="fas fa-upload"></i> Importar Backup JSON
          <input type="file" hidden accept=".json" @change="e => s.restaurarGeral(e.target.files[0])" />
        </label>
        <button class="btn btn-secondary btn-full" :disabled="!s.googleDriveConfigured" @click="s.backupGoogleDrive()">
          <i class="fab fa-google-drive"></i> Salvar backup no Google Drive
        </button>
        <button class="btn btn-secondary btn-full" :disabled="!s.googleDriveConfigured" @click="s.restaurarGoogleDrive()">
          <i class="fas fa-cloud-download-alt"></i> Restaurar do Google Drive
        </button>
      </div>
      <p class="settings-hint" :class="{ 'settings-hint-error': !s.googleDriveConfigured }">
        {{ s.googleDriveConfigured
          ? 'O backup do Drive usa a conta Google autenticada no celular e salva o arquivo na pasta privada do app.'
          : 'Para ativar o backup no Google Drive, defina VITE_GOOGLE_CLIENT_ID no ambiente do app.' }}
      </p>

      <template #foot>
        <button class="btn btn-secondary" @click="closeSettings">Cancelar</button>
        <button class="btn btn-primary" @click="salvarConfig">Salvar</button>
      </template>
    </BaseModal>

    <!-- ─── Diálogo de Confirmação Global ────────────────────── -->
    <ConfirmDialog />

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
import { reactive, onMounted, watch } from 'vue'
import { useStore } from './store.js'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import BaseModal from './components/BaseModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import TabInsumos from './views/TabInsumos.vue'
import TabReceitas from './views/TabReceitas.vue'
import TabProducao from './views/TabProducao.vue'
import TabPainel from './views/TabPainel.vue'
import { pushOverlayHistory, closeOverlayHistory } from './composables/overlayHistory.js'

const s = useStore()

const cfg = reactive({ ...s.company })
let settingsHistoryToken = null

function salvarConfig() {
  s.saveCompany({ ...cfg })
  s.notify('Configurações salvas!')
  closeSettings()
}

function closeSettings() {
  if (!s.modal?.id) return
  closeOverlayHistory(settingsHistoryToken, () => {
    settingsHistoryToken = null
    s.closeModal()
  })
}

onMounted(async () => {
  await s.init()
  Object.assign(cfg, s.company)
})

watch(() => s.modal?.id, (next, prev) => {
  if (next === prev) return

  if (next === 'settings' && !settingsHistoryToken) {
    settingsHistoryToken = pushOverlayHistory(() => {
      settingsHistoryToken = null
      s.closeModal()
    })
    return
  }

  if (prev === 'settings' && next !== 'settings') {
    settingsHistoryToken = null
  }
})
</script>

<style scoped>
.settings-hint { font-size: .75rem; color: var(--muted); margin-bottom: 10px; }
.settings-hint-error { color: var(--red); }
.pointer { cursor: pointer; }
.settings-section { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: var(--gold-dark); margin: 18px 0 10px; display: flex; align-items: center; gap: 7px; }
.backup-btns { display: flex; flex-direction: column; gap: 8px; }
</style>
