import type { Ref } from 'vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import { useModalEscape } from '@/composables/useModalEscape'

export function useModalOverlay(isOpen: Ref<boolean>, onClose: () => void) {
  useModalEscape(isOpen, onClose)
  useBodyScrollLock(isOpen)
}
