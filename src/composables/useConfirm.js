import { reactive } from 'vue'

const state = reactive({
  visible: false,
  title: '',
  message: '',
  icon: 'fas fa-exclamation-circle',
  type: 'danger',          // 'danger' | 'warning' | 'primary'
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  resolve: null
})

export function useConfirm() {
  function ask(message, opts = {}) {
    return new Promise(resolve => {
      state.visible     = true
      state.title       = opts.title        || 'Tem certeza?'
      state.message     = message
      state.icon        = opts.icon         || 'fas fa-exclamation-circle'
      state.type        = opts.type         || 'danger'
      state.confirmLabel = opts.confirmLabel || 'Confirmar'
      state.cancelLabel  = opts.cancelLabel  || 'Cancelar'
      state.resolve     = resolve
    })
  }

  function respond(result) {
    state.visible = false
    const res = state.resolve
    state.resolve = null
    if (res) res(result)
  }

  return { state, ask, respond }
}
