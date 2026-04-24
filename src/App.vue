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
      <div class="grid-2">
        <div class="fg">
          <label class="label">Razão Social</label>
          <input v-model="cfg.razao_social" class="input" placeholder="Nome empresarial" />
        </div>
        <div class="fg">
          <label class="label">CNPJ</label>
          <input v-model="cfg.cnpj" class="input" placeholder="00.000.000/0000-00" />
        </div>
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">CPF do Titular</label>
          <input v-model="cfg.cpf" class="input" placeholder="000.000.000-00" />
        </div>
        <div class="fg">
          <label class="label">CNAE Principal</label>
          <input v-model="cfg.cnae" class="input" placeholder="Ex: 1091-1/01" />
        </div>
      </div>
      <div class="grid-2">
        <div class="fg">
          <label class="label">Município / UF</label>
          <div class="input-group-row">
            <input v-model="cfg.municipio" class="input" style="flex:3" placeholder="Cidade" />
            <input v-model="cfg.uf" class="input" style="flex:1" placeholder="UF" maxlength="2" />
          </div>
        </div>
      </div>

      <div class="settings-section"><i class="fas fa-building-columns"></i> Contas Financeiras</div>
      <p class="cfg-hint">Cadastre as contas da empresa e as contas pessoais para separar corretamente pró-labore, despesas da casa e movimentações entre titulares.</p>
      <div class="contas-list">
        <div v-for="(conta, idx) in contasCfg" :key="conta.id" class="conta-card">
          <div class="conta-card-top">
            <strong>Conta {{ idx + 1 }}</strong>
            <button class="conta-remove" @click="removerConta(idx)">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
          <div class="fg">
            <label class="label">Nome da conta</label>
            <input v-model="conta.nome" class="input" placeholder="Ex: PagBank PJ" />
          </div>
          <div class="fg">
            <label class="label">Banco</label>
            <select v-model="conta.banco" class="input">
              <option value="">Selecione</option>
              <option value="pagbank">PagBank</option>
              <option value="itau">Itaú</option>
              <option value="bb">Banco do Brasil</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div class="fg">
            <label class="label">Titular</label>
            <input v-model="conta.titular" class="input" placeholder="Ex: Empresa, Yves ou Esposa" />
          </div>
          <div class="fg">
            <label class="label">Natureza</label>
            <select v-model="conta.natureza" class="input">
              <option value="empresarial">Empresarial</option>
              <option value="pessoal">Pessoal</option>
            </select>
          </div>
          <div class="fg">
            <label class="label">Papel</label>
            <input v-model="conta.papel" class="input" placeholder="Ex: recebimento, pró-labore, despesas da casa" />
          </div>
        </div>
      </div>
      <button class="btn btn-secondary btn-full" @click="adicionarConta">
        <i class="fas fa-plus"></i> Adicionar conta
      </button>

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
const contasCfg = ref([])
const driveLoading = ref(false)
let settingsHistoryToken = null

function salvarConfig() {
  const contaIncompleta = contasCfg.value.find(conta => {
    const temAlgumDado = conta.nome || conta.banco || conta.titular || conta.papel
    return temAlgumDado && (!conta.nome || !conta.banco)
  })
  if (contaIncompleta) {
    s.notify('Preencha pelo menos nome e banco em cada conta cadastrada.', 'warning')
    return
  }
  s.saveCompany({ ...cfg })
  s.saveContasFinanceiras(contasCfg.value)
  s.notify('Configurações salvas!')
  closeSettings()
}

function novaConta() {
  return {
    id: `conta-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome: '',
    banco: '',
    titular: '',
    natureza: 'pessoal',
    papel: ''
  }
}

function adicionarConta() {
  contasCfg.value = [...contasCfg.value, novaConta()]
}

function removerConta(index) {
  contasCfg.value = contasCfg.value.filter((_, idx) => idx !== index)
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
  contasCfg.value = s.contasFinanceiras.map(conta => ({ ...conta }))
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

watch(() => s.modal?.id, (modalId) => {
  if (modalId === 'settings') {
    Object.assign(cfg, s.company)
    contasCfg.value = s.contasFinanceiras.map(conta => ({ ...conta }))
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
.contas-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.conta-card { padding: 12px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--bg); }
.conta-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: var(--brown-dark); }
.conta-remove { width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--red-bg); color: var(--red); display: flex; align-items: center; justify-content: center; }
.input-group-row { display: flex; gap: 8px; }
</style>
