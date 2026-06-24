import { onMounted, onUnmounted, watch, type Ref } from 'vue'

function hasOpenSelect(): boolean {
  return Boolean(document.querySelector('[data-select-open="true"]'))
}

export function useModalEscape(isOpen: Ref<boolean>, onClose: () => void) {
  const handler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !isOpen.value) return
    if (hasOpenSelect()) return
    onClose()
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
