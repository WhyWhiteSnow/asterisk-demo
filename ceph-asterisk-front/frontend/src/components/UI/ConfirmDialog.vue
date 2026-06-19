<script setup lang="ts">
import { watch } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import { useConfirmStore } from '@/stores/confirm'

const confirmStore = useConfirmStore()

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && confirmStore.isOpen) {
    confirmStore.answer(false)
  }
}

watch(
  () => confirmStore.isOpen,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="confirmStore.isOpen && confirmStore.options"
      class="confirm-overlay"
      @click.self="confirmStore.answer(false)"
    >
      <div class="confirm-dialog" role="alertdialog" aria-modal="true">
        <h2 class="confirm-title">{{ confirmStore.options.title }}</h2>
        <p class="confirm-message">{{ confirmStore.options.message }}</p>
        <div class="confirm-actions">
          <CustomButton variant="outline" @click="confirmStore.answer(false)">
            {{ confirmStore.options.cancelText }}
          </CustomButton>
          <CustomButton
            :variant="confirmStore.options.variant === 'danger' ? 'danger' : 'primary'"
            @click="confirmStore.answer(true)"
          >
            {{ confirmStore.options.confirmText }}
          </CustomButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-modal) + 20);
  padding: var(--spacing-md);
}

.confirm-dialog {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.confirm-title {
  margin: 0 0 var(--spacing-sm);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
}

.confirm-message {
  margin: 0 0 var(--spacing-lg);
  color: var(--color-text);
  line-height: 1.5;
  white-space: pre-wrap;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .confirm-actions {
    flex-direction: column-reverse;
  }

  .confirm-actions :deep(.custom-button) {
    width: 100%;
  }
}
</style>
