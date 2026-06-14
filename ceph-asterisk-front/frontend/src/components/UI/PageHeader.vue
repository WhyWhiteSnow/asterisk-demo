<template>
  <header class="page-header">
    <div class="header-info">
      <h2 class="header-title">{{ title }}</h2>
      <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
}

defineProps<Props>()
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin: var(--spacing-md) 0;
  padding: 0 var(--spacing-md);
  width: 100%;
}

.header-info {
  flex: 1;
}

.header-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 0.5rem 0;
}

.header-subtitle {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>