<template>
  <div class="tabs">
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