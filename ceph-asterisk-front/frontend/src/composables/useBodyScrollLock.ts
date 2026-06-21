import { onUnmounted, watch, type MaybeRefOrGetter, toValue } from 'vue'

let lockCount = 0

function applyBodyLock() {
  lockCount += 1
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
  }
}

function releaseBodyLock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = ''
    document.body.classList.remove('modal-open')
  }
}

export function useBodyScrollLock(isOpen: MaybeRefOrGetter<boolean>) {
  watch(
    () => toValue(isOpen),
    (open) => {
      if (open) applyBodyLock()
      else releaseBodyLock()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (toValue(isOpen)) releaseBodyLock()
  })
}
