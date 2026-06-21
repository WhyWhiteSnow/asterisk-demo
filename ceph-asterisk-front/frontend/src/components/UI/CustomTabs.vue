<template>
  <div class="tabs" :class="{ 'tabs--bordered': bordered }">
    <div class="tabs-list">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tabs-trigger', { 'tabs-trigger--active': modelValue === tab.value }]"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="tabs-content">
      <slot :name="modelValue"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  value: string
  label: string
}

interface Props {
  modelValue: string
  tabs: Tab[]
  bordered?: boolean
}

defineProps<Props>()
defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.tabs {
  width: 100%;
}

.tabs-list {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-lg);
  gap: var(--spacing-xs);
}

.tabs--bordered .tabs-list {
  border-bottom: none;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-xs);
}

.tabs-trigger {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.tabs--bordered .tabs-trigger {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.tabs--bordered .tabs-trigger--active {
  border-color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.tabs-trigger--active {
  border-bottom-color: var(--color-primary);
  color: var(--color-primary);
}

.tabs-trigger:hover {
  color: var(--color-text);
}

.tabs-content {
  width: 100%;
}
</style>