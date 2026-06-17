<template>
  <span :class="['badge', `badge--${variant}`]">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'secondary' | 'outline' | 'warning'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}

.badge--default {
  background-color: var(--color-success);
  color: white;
}

.badge--secondary {
  background-color: var(--color-error);
  color: white;
}

.badge--outline {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.badge--warning {
  background-color: var(--color-warning);
  color: white;
}
</style>