<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        @click="removeToast(toast.id)"
      >
        <span v-if="showIcon" class="toast__icon">
          <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 3L3 20H21L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="toast__message">{{ toast.message }}</span>
        <button class="toast__close" @click.stop="removeToast(toast.id)">✕</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import { storeToRefs } from 'pinia'

interface Props {
  showIcon?: boolean
}
withDefaults(defineProps<Props>(), { showIcon: true })

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)
const { removeToast } = toastStore
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  min-width: 240px;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 4px solid;
  transition: all var(--transition-base);
  cursor: pointer;
  backdrop-filter: blur(4px);
  background-color: var(--color-background-card);
}

.toast--success {
  border-left-color: var(--color-success);
}
.toast--error {
  border-left-color: var(--color-error);
}
.toast--info {
  border-left-color: var(--color-info);
}
.toast--warning {
  border-left-color: var(--color-warning);
}

.toast__icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toast__message {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  word-break: break-word;
}

.toast__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text-muted);
  padding: 4px;
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
  line-height: 1;
}

.toast__close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

/* Анимации */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: currentColor;
}
.toast--success .toast__icon { color: var(--color-success); }
.toast--error .toast__icon { color: var(--color-error); }
.toast--warning .toast__icon { color: var(--color-warning); }
.toast--info .toast__icon { color: var(--color-info); }

/* Адаптив */
@media (max-width: 640px) {
  .toast-container {
    bottom: 10px;
    right: 10px;
    left: 10px;
  }
  .toast {
    max-width: none;
    width: auto;
  }
}
</style>