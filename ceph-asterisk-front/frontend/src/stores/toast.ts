import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  const queue = ref<Omit<Toast, 'id'>[]>([])
  let nextId = 0

  const showNext = () => {
    if (toasts.value.length > 0 || queue.value.length === 0) return

    const pending = queue.value.shift()!
    const id = nextId++
    toasts.value.push({ ...pending, id })

    if (pending.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, pending.duration ?? 3000)
    }
  }

  const addToast = (toast: Omit<Toast, 'id'>) => {
    queue.value.push(toast)
    showNext()
  }

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
    showNext()
  }

  return { toasts, addToast, removeToast }
})
