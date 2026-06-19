import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'danger'
}

export const useConfirmStore = defineStore('confirm', () => {
  const isOpen = ref(false)
  const options = ref<ConfirmOptions | null>(null)
  let resolveFn: ((value: boolean) => void) | null = null

  const confirm = (opts: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      options.value = {
        title: opts.title ?? 'Подтверждение',
        message: opts.message,
        confirmText: opts.confirmText ?? 'Подтвердить',
        cancelText: opts.cancelText ?? 'Отмена',
        variant: opts.variant ?? 'primary',
      }
      isOpen.value = true
      resolveFn = resolve
    })

  const answer = (value: boolean) => {
    isOpen.value = false
    resolveFn?.(value)
    resolveFn = null
    options.value = null
  }

  return { isOpen, options, confirm, answer }
})
