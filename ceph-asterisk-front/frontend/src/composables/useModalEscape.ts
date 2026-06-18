import { onMounted, onUnmounted, watch, type Ref } from 'vue'

export function useModalEscape(isOpen: Ref<boolean>, onClose: () => void) {
  const handler = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen.value) {
      onClose()
    }
  }

  watch(isOpen, (open) => {
    if (open) {
      window.addEventListener('keydown', handler)
    } else {
      window.removeEventListener('keydown', handler)
    }
  })

  onMounted(() => {
    if (isOpen.value) window.addEventListener('keydown', handler)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handler)
  })
}
