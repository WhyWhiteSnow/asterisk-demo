<template>
  <button
    :class="['switch', { 'switch--checked': modelValue }]"
    @click="$emit('update:modelValue', !modelValue)"
    type="button"
  >
    <span class="switch-thumb" />
  </button>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
}

defineProps<Props>()
defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  background-color: var(--color-border);
  border-radius: 50%;
  transition: background-color var(--transition-fast);
  cursor: pointer;
  border: none;
}

.switch--checked {
  background-color: var(--color-primary);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.switch--checked .switch-thumb {
  transform: translateX(20px);
}
</style>