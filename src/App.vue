<template>
  <div class="shell">
    <AppHeader />

    <main class="main">
      <TabInsumos   v-show="s.tab === 'insumos'" />
      <TabReceitas  v-show="s.tab === 'receitas'" />
      <TabProducao  v-show="s.tab === 'producao'" />
      <TabPainel    v-show="s.tab === 'painel'" />
      <TabFinanceiro v-show="s.tab === 'financeiro'" />
      <TabCozinha   v-show="s.tab === 'cozinha'" />
    </main>

    <AppNav />

    <!-- ─── Modal Configurações ──────────────────────────────── -->
    <BaseModal v-if="s.modal?.id === 'settings'" title="Configurações" @close="closeSettings">
      <div class="modal-inner">
      <div class="settings-section"><i class="fas fa-store"></i> Empresa</div>
      <div class="fg">
        <label class="label">Nome</label>
        <input v-model="cfg.nome" class="input" placeholder="Nome do negócio" />
      </div>
      <div class="fg">
        <label class="label">Slogan</label>
        <input v-model="cfg.slogan" class="input" placeholder="Ex: Feito com amor" />
      </div>

      <div class="settings-section"><i class="fas fa-database"></i> Backup Local</div>
      <p class="cfg-hint">Os dados ficam salvos somente neste dispositivo. Faça backups regularmente.</p>
      <div class="backup-btns">
        <button class="btn btn-secondary btn-full" @click="s.backupGeral()">
          <i class="fas fa-download"></i> Exportar JSON
        </button>
        <label class="btn btn-secondary btn-full cfg-pointer">
          <i class="fas fa-upload"></i> Importar JSON
          <input type="file" hidden accept=".json" @change="e => s.restaurarGeral(e.target.files[0])" />
        </label>
      </div>

      <div class="settings-section"><i class="fab fa-google-drive"></i> Google Drive</div>

      <div v-if="s.googleDriveConfigured" class="drive-status drive-ok">
        <div class="drive-status-ico"><i class="fab fa-google-drive"></i></div>
        <div>
          <div class="drive-status-title">Drive configurado</div>
          <div class="drive-status-sub">Backup na pasta privada do app</div>
        </div>
      </div>
      <div v-else class="drive-status drive-off">
        <div class="drive-status-ico"><i class="fas fa-plug-circle-xmark"></i></div>
        <div>
          <div class="drive-status-title">Drive não configurado</div>
          <div class="drive-status-sub">Defina VITE_GOOGLE_CLIENT_ID no ambiente</div>
        </div>
      </div>

      <div class="backup-btns" style="margin-top:12px">
        <button
          class="btn btn-secondary btn-full"
          :disabled="!s.googleDriveConfigured || driveLoading"
          @click="fazBackupDrive"
        >
          <i v-if="driveLoading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fab fa-google-drive"></i>
          Salvar no Drive
        </button>
        <button
          class="btn btn-secondary btn-full"
          :disabled="!s.googleDriveConfigured || driveLoading"
          @click="restauraDrive"
        >
          <i v-if="driveLoading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-cloud-download-alt"></i>
          Restaurar do Drive
        </button>
      </div>

      </div><!-- /modal-inner -->
      <template #foot>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="closeSettings">Cancelar</button>
        <button class="btn btn-primary" @click="salvarConfig">Salvar</button>
      </template>
    </BaseModal>

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
import { reactive, ref, onMounted, watch } from 'vue'
import { useStore } from './store.js'
import AppHeader    from './components/AppHeader.vue'
import AppNav       from './components/AppNav.vue'
import BaseModal    from './components/BaseModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import TabInsumos   from './views/TabInsumos.vue'
import TabReceitas  from './views/TabReceitas.vue'
import TabProducao  from './views/TabProducao.vue'
import TabPainel    from './views/TabPainel.vue'
import TabFinanceiro from './views/TabFinanceiro.vue'
import TabCozinha   from './views/TabCozinha.vue'

import { pushOverlayHistory, closeOverlayHistory } from './composables/overlayHistory.js'

const s = useStore()
const cfg = reactive({ ...s.company })
const driveLoading = ref(false)
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

async function fazBackupDrive() {
  driveLoading.value = true
  try { await s.backupGoogleDrive() }
  finally { driveLoading.value = false }
}

async function restauraDrive() {
  driveLoading.value = true
  try { await s.restaurarGoogleDrive() }
  finally { driveLoading.value = false }
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
.modal-inner {
  padding: 16px 20px;
}
.cfg-hint {
  font-size: .8rem;
  color: var(--muted);
  margin-bottom: 12px;
  line-height: 1.5;
}
.cfg-pointer { cursor: pointer; }
.backup-btns { display: flex; flex-direction: column; gap: 9px; }

.drive-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: var(--r-md);
  margin-bottom: 4px;
}
.drive-ok  { background: var(--green-bg); border: 1px solid var(--green-dim); }
.drive-off { background: var(--cream);    border: 1px solid var(--border2); }

.drive-status-ico {
  width: 38px;
  height: 38px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.drive-ok  .drive-status-ico { background: var(--green-dim); color: var(--green); }
.drive-off .drive-status-ico { background: var(--border);    color: var(--muted); }

.drive-status-title { font-size: .875rem; font-weight: 700; }
.drive-ok  .drive-status-title { color: var(--green); }
.drive-off .drive-status-title { color: var(--muted); }
.drive-status-sub  { font-size: .74rem; color: var(--muted); margin-top: 2px; }
.spacer { flex: 1; }
</style>
