<template>
  <div class="tab-ajustes">
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-sliders"></i> Configurações</h2>
      </div>
      <p class="tab-subtitle">Dados do negócio, gerenciamento de contas e segurança</p>

      <!-- ── Navegação por Setores (Menus) ── -->
      <div class="aba-nav ajustes-nav">
        <button v-for="m in menus" :key="m.id" class="aba-btn"
          :class="{ active: abaAtiva === m.id }"
          @click="abaAtiva = m.id">
          <i :class="m.icon"></i> {{ m.label }}
        </button>
      </div>
    </div>

    <div class="ajustes-content">
      <!-- ── SEÇÃO 1: PERFIL DO NEGÓCIO ── -->
      <section v-if="abaAtiva === 'perfil'" class="sheet-card fade-in">
        <div class="sheet-body">
          <div class="section-label"><i class="fas fa-store"></i> Identidade da Marca</div>
          <p class="hint mb-12">Esses dados aparecem nos cabeçalhos dos documentos e etiquetas.</p>
          <div class="form-grid mt-12">
            <div class="fg">
              <label class="label">Nome da Marca</label>
              <input v-model="company.nome" class="input" placeholder="Ex: ChocoBete" />
            </div>
            <div class="fg">
              <label class="label">Razão Social</label>
              <input v-model="company.razao_social" class="input" placeholder="Nome completo ou Razão Social" />
            </div>
            <div class="fg-row">
              <div class="fg fg-2">
                <label class="label">CNPJ</label>
                <input 
                  :value="company.cnpj" 
                  @input="e => company.cnpj = maskCnpj(e.target.value)"
                  class="input" 
                  placeholder="00.000.000/0001-00" 
                />
              </div>
              <div class="fg" style="flex: 1.5">
                <label class="label">CPF do Titular</label>
                <input 
                  :value="company.cpf" 
                  @input="e => company.cpf = maskCpf(e.target.value)"
                  class="input" placeholder="000.000.000-00" />
              </div>
            </div>
            <div class="fg-row">
              <div class="fg" style="flex: 2">
                <label class="label">Município</label>
                <input v-model="company.municipio" class="input" placeholder="Ex: Rio de Janeiro" />
              </div>
              <div class="fg fg-1">
                <label class="label">UF</label>
                <input v-model="company.uf" class="input" maxlength="2" placeholder="RJ" />
              </div>
            </div>
            <div class="fg">
              <label class="label">CNAE Principal</label>
              <input 
                :value="company.cnae" 
                @input="e => company.cnae = maskCnae(e.target.value)"
                class="input" placeholder="Ex: 1091-1/01" />
            </div>
          </div>

          <div class="mt-24">
            <button class="btn btn-primary btn-full" @click="save">
              <i class="fas fa-save"></i> Salvar Dados da Empresa
            </button>
          </div>
        </div>
      </section>

      <!-- ── SEÇÃO 2: CONTAS BANCÁRIAS ── -->
      <section v-if="abaAtiva === 'financeiro'" class="sheet-card fade-in">
        <div class="sheet-body">
          <div class="section-label"><i class="fas fa-university"></i> Contas Financeiras</div>
          <p class="hint mt-4 mb-12">Configure as contas para importar extratos do PagBank, Itaú ou BB.</p>
          
          <div class="contas-list">
            <div v-for="(conta, idx) in s.contasFinanceiras" :key="conta.id" class="conta-item">
              <div class="conta-icon" :class="conta.banco">
                <i class="fas" :class="conta.banco === 'itau' ? 'fa-landmark' : (conta.banco === 'bb' ? 'fa-university' : 'fa-mobile-screen')"></i>
              </div>
              <div class="conta-info">
                <strong>{{ conta.nome }}</strong>
                <span>{{ conta.banco.toUpperCase() }} · {{ conta.natureza }}</span>
              </div>
              <div class="conta-item-acts">
                <button class="btn-action-edit" title="Editar conta" @click="abrirModalConta(conta)"><i class="fas fa-pencil"></i></button>
                <button class="btn-action-del" title="Excluir conta" @click="removerConta(idx)"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
            
            <button class="btn-add-outline mt-8" @click="abrirModalConta(null)">
              <i class="fas fa-plus"></i> Adicionar Conta
            </button>
          </div>
        </div>
      </section>

      <!-- ── SEÇÃO 3: BACKUP E SEGURANÇA ── -->
      <section v-if="abaAtiva === 'backup'" class="sheet-card fade-in">
        <div class="sheet-body">
          <div class="section-label"><i class="fas fa-cloud-arrow-up"></i> Backup & Sincronização</div>
          
          <div class="backup-grid mt-16">
            <!-- Google Drive -->
            <div class="backup-box" :class="{ active: s.googleDriveConfigured }">
              <div class="backup-hdr">
                <i class="fab fa-google-drive"></i>
                <strong>Google Drive</strong>
              </div>
              <div class="backup-status" v-if="s.googleDriveConfigured">Conectado</div>
              <div class="backup-status warn" v-else>Não configurado</div>
              <div class="backup-btns">
                <button class="backup-btn" :disabled="!s.googleDriveConfigured" @click="s.backupGoogleDrive">Salvar</button>
                <button class="backup-btn outline" :disabled="!s.googleDriveConfigured" @click="s.restaurarGoogleDrive">Restaurar</button>
              </div>
            </div>

            <!-- Arquivo Local -->
            <div class="backup-box active">
              <div class="backup-hdr">
                <i class="fas fa-file-code"></i>
                <strong>Arquivo Local</strong>
              </div>
              <div class="backup-status">JSON</div>
              <div class="backup-btns">
                <button class="backup-btn" @click="s.backupGeral">Exportar</button>
                <label class="btn-sm outline">
                  Importar
                  <input type="file" hidden accept=".json" @change="e => s.restaurarGeral(e.target.files[0])" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── SEÇÃO 4: PREFERÊNCIAS DO SISTEMA ── -->
      <section v-if="abaAtiva === 'sistema'" class="sheet-card fade-in">
        <div class="sheet-body">
          <div class="section-label"><i class="fas fa-gears"></i> Preferências de Uso</div>
          <div class="form-grid mt-12">
            <div class="fg">
              <label class="label">Próxima etiqueta (folha 77 un.)</label>
              <div class="input-with-icon">
                <i class="fas fa-tag"></i>
                <input v-model.number="company.posicao_etiqueta" type="number" class="input" min="1" max="77" />
              </div>
            </div>
            <div class="fg">
              <label class="label">Teto de Faturamento MEI Anual</label>
              <div class="input-with-icon">
                <i class="fas fa-arrow-up-wide-short"></i>
                <input v-model.number="company.teto_mei_anual" type="number" class="input" />
              </div>
              <p class="hint">Padrão: R$ 81.000,00. Altere caso haja novas resoluções do CGSN.</p>
            </div>
          </div>

          <div class="mt-24">
            <button class="btn btn-primary btn-full" @click="save">
              <i class="fas fa-save"></i> Salvar Preferências
            </button>
          </div>

          <div class="maintenance-zone mt-24">
            <p class="section-label-sm">Manutenção de Dados</p>
            <div class="maintenance-grid mt-8">
              <button class="btn btn-secondary btn-sm" @click="reclassificarLancamentos">
                <i class="fas fa-wand-magic-sparkles"></i> Reclassificar Extratos
              </button>
              <p class="hint">Aplica as regras automáticas de categorias em todos os lançamentos não editados manualmente.</p>
            </div>
          </div>

          <div class="danger-zone mt-32">
            <p class="danger-title">Zona Crítica</p>
            <div class="maintenance-grid">
              <button class="btn-danger-outline" @click="zerarDados">
                <i class="fas fa-trash-can"></i> Apagar tudo
              </button>
              <p class="hint">Remove permanentemente receitas, produtos e histórico financeiro.</p>
            </div>
          </div>
        </div>
      </section>

      <div class="version-info">ChocoStoq v3.2 · Local Storage & IndexedDB</div>
    </div>

    <!-- ── Modal de Conta Bancária ── -->
    <BaseModal v-if="modalConta" :title="formConta.id ? 'Editar Conta' : 'Nova Conta'" @close="modalConta = false">
      <div class="form-section">
        <div class="fg">
          <label class="label">Nome da Conta</label>
          <input v-model="formConta.nome" class="input" placeholder="Ex: PagBank Empresa" />
        </div>
        <div class="fg">
          <label class="label">Banco</label>
          <select v-model="formConta.banco" class="input">
            <option value="pagbank">PagBank</option>
            <option value="itau">Itaú</option>
            <option value="bb">Banco do Brasil</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="fg">
          <label class="label">Titular</label>
          <input v-model="formConta.titular" class="input" placeholder="Ex: Elisabete" />
        </div>
        <div class="fg">
          <label class="label">Natureza</label>
          <select v-model="formConta.natureza" class="input">
            <option value="empresarial">Empresarial</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </div>
        <div class="fg">
          <label class="label">Papel da Conta</label>
          <input v-model="formConta.papel" class="input" placeholder="Ex: Recebimento de vendas" />
        </div>
      </div>
      <template #foot>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="modalConta = false">Cancelar</button>
        <button class="btn btn-primary" :disabled="!formConta.nome" @click="salvarConta">Salvar</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useStore } from '../store.js'
import { maskCpf, maskCnpj, maskCnae } from '../utils.js'
import { useConfirm } from '../composables/useConfirm.js'
import BaseModal from '../components/BaseModal.vue'

const s = useStore()
const confirm = useConfirm()
const company = reactive({ ...s.company })

// 🔄 Sincroniza o formulário local quando os dados são carregados do banco (Store Init)
// Isso evita que a tela mostre dados padrão caso o banco demore a responder
watch(() => s.company, (novoValor) => {
  if (novoValor) {
    // Copia os dados da store para o estado local do formulário
    Object.assign(company, JSON.parse(JSON.stringify(novoValor)))
  }
}, { deep: true, immediate: true })

const abaAtiva = ref('perfil')
const menus = [
  { id: 'perfil',     label: 'Identidade', icon: 'fas fa-id-card' },
  { id: 'financeiro', label: 'Financeiro', icon: 'fas fa-university' },
  { id: 'backup',     label: 'Backup',     icon: 'fas fa-cloud-arrow-up' },
  { id: 'sistema',    label: 'Sistema',    icon: 'fas fa-gears' }
]

// ── Gerenciamento de Contas ──
const modalConta = ref(false)
const formConta = reactive({ id: null, nome: '', banco: 'pagbank', titular: '', natureza: 'pessoal', papel: '' })

function abrirModalConta(conta = null) {
  if (conta) {
    Object.assign(formConta, JSON.parse(JSON.stringify(conta)))
  } else {
    Object.assign(formConta, { id: null, nome: '', banco: 'pagbank', titular: '', natureza: 'pessoal', papel: '' })
  }
  modalConta.value = true
}

function salvarConta() {
  const lista = [...s.contasFinanceiras]
  if (formConta.id) {
    const idx = lista.findIndex(c => c.id === formConta.id)
    if (idx !== -1) lista[idx] = { ...formConta }
  } else {
    lista.push({ ...formConta, id: `cta-${Date.now()}` })
  }
  s.saveContasFinanceiras(lista)
  modalConta.value = false
  s.notify('Conta salva com sucesso!')
}

function save() {
  s.saveCompany({ ...company })
  s.notify('Alterações salvas com sucesso!')
}

async function removerConta(idx) {
  const ok = await confirm.ask('Deseja remover esta conta bancária? Lançamentos vinculados a ela não serão apagados.', {
    title: 'Remover Conta',
    confirmLabel: 'Remover',
    type: 'danger'
  })
  if (ok) {
    const novas = [...s.contasFinanceiras]
    novas.splice(idx, 1)
    s.saveContasFinanceiras(novas)
    s.notify('Conta removida!')
  }
}

async function reclassificarLancamentos() {
  s.loading = true
  try {
    const total = await s.reclassificarTodosFinanceiro()
    if (total > 0) s.notify(`${total} lançamentos atualizados!`)
  } finally {
    s.loading = false
  }
}

async function zerarDados() {
  const ok = await confirm.ask('ATENÇÃO: Todos os produtos, receitas, produções e dados financeiros serão apagados permanentemente. Deseja continuar?', {
    title: 'Zerar Banco de Dados',
    confirmLabel: 'Apagar tudo',
    type: 'danger'
  })
  if (ok) {
    s.notify('Função de reset total bloqueada nesta versão por segurança.', 'warning')
  }
}
</script>

<style scoped>
.tab-ajustes { padding-bottom: 120px; }
.ajustes-nav { margin-top: 8px; border-top: 1px solid var(--border); display: flex; margin-left: -16px; margin-right: -16px; overflow-x: auto; scrollbar-width: none; }
.ajustes-nav::-webkit-scrollbar { display: none; }
.aba-btn { flex: 1; padding: 12px 6px; border: none; background: transparent; color: var(--muted); font-size: .78rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; border-bottom: 2px solid transparent; transition: all var(--t); }
.aba-btn i { font-size: 1rem; }
.aba-btn.active { color: var(--brown); border-bottom-color: var(--brown); background: var(--gold-bg); }

.ajustes-content { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.form-grid { display: flex; flex-direction: column; gap: 14px; }
.fg-row { display: flex; gap: 12px; }
.input-with-icon { position: relative; }
.input-with-icon i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: .85rem; }
.input-with-icon .input { padding-left: 34px; }

.contas-list { display: flex; flex-direction: column; gap: 8px; }
.conta-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); }
.conta-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: .9rem; }
.conta-icon.pagbank { background: #f3bc00; color: #000; }
.conta-icon.itau { background: #ec7000; }
.conta-icon.bb { background: #f3bc00; color: #0038a8; }
.conta-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.conta-info strong { font-size: .85rem; color: var(--text); }
.conta-info span { font-size: .7rem; color: var(--muted); font-weight: 600; }
.conta-item-acts { display: flex; gap: 4px; }
.btn-action-del { width: 32px; height: 32px; background: transparent; border: none; color: var(--red); font-size: .85rem; }
.btn-action-edit { width: 32px; height: 32px; background: transparent; border: none; color: var(--brown-mid); font-size: .85rem; }

.backup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.backup-box { background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px; display: flex; flex-direction: column; gap: 8px; opacity: .6; }
.backup-box.active { opacity: 1; border-color: var(--gold); background: var(--gold-bg); }
.backup-hdr { display: flex; align-items: center; gap: 6px; font-size: .82rem; color: var(--brown-dark); }
.backup-status { font-size: .65rem; font-weight: 800; text-transform: uppercase; color: var(--muted); }
.backup-status.warn { color: var(--red); }
.backup-btns { display: flex; flex-direction: column; gap: 5px; }
.backup-btn { width: 100%; padding: 6px; border: none; border-radius: 6px; background: var(--brown); color: #fff; font-size: .75rem; font-weight: 700; }
.backup-btn.outline { background: transparent; border: 1px solid var(--brown); color: var(--brown); }

.danger-zone { border-top: 1px solid var(--border); padding-top: 16px; }
.danger-title { font-size: .7rem; font-weight: 800; color: var(--red); text-transform: uppercase; margin-bottom: 8px; }

.version-info { text-align: center; font-size: .7rem; color: var(--muted); font-weight: 600; margin-top: 20px; }
</style>