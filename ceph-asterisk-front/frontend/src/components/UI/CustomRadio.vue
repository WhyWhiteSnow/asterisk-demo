<template>
  <label class="custom-radio" :class="{ 'is-disabled': disabled }">
    <input
      type="radio"
      :name="name"
      :value="value"
      :checked="modelValue === value"
      :disabled="disabled"
      @change="handleChange"
    />
    <span class="custom-radio__indicator"></span>
    <span class="custom-radio__label" v-if="$slots.default || label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string | number | boolean
  value: string | number | boolean
  name?: string
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | boolean): void
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    emit('update:modelValue', target.value)
  }
}
</script>

<style scoped>
.custom-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: color var(--transition-fast);
}

.custom-radio.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.custom-radio input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.custom-radio__indicator {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-background-card);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.custom-radio__indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  transition: transform var(--transition-fast);
}

.custom-radio input:checked + .custom-radio__indicator {
  border-color: var(--color-primary);
}

.custom-radio input:checked + .custom-radio__indicator::after {
  transform: translate(-50%, -50%) scale(1);
}

.custom-radio:hover .custom-radio__indicator {
  border-color: var(--color-primary-light);
}

.custom-radio__label {
  user-select: none;
}
</style>