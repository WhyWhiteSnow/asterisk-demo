<template>
  <div class="input-container">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="input-wrapper" :class="{ 'input-wrapper--error': hasError }">
      <div v-if="withIcon" class="icon-wrapper">
        <slot name="icon">
          <svg
            class="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </slot>
      </div>
      <input
        :type="currentType"
        :placeholder="placeholder"
        :value="stringValue"
        @input="handleInput"
        class="input-field"
        :class="{ 'with-icon': withIcon, 'with-toggle': showToggle }"
        :disabled="disabled"
      />
      <button
        v-if="showToggle"
        type="button"
        class="password-toggle"
        @click="toggleVisibility"
        :aria-label="isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
      >
        <svg
          v-if="isPasswordVisible"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <svg
          v-else
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 2L22 22M6.712 6.712C4.132 8.188 2 12 2 12C2 12 6 20 12 20C14.1 20 16.2 18.8 17.6 17M9.5 9.5C8.5 10.5 8 11.8 8 13C8 15.2 9.8 17 12 17C13.2 17 14.5 16.5 15.5 15.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M15 9C15 7.3 13.7 6 12 6C11.2 6 10.5 6.3 10 6.8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue: string | number | null | undefined
  label?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  withIcon?: boolean
  hasError?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | number | null | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  withIcon: true,
  hasError: false,
  modelValue: ''
})

const emit = defineEmits<Emits>()

const stringValue = computed(() => {
  if (props.modelValue === undefined || props.modelValue === null) {
    return ''
  }
  return String(props.modelValue)
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  if (value === '') {
    emit('update:modelValue', '')
    return
  }

  if (props.type === 'number') {
    const numValue = Number(value)
    emit('update:modelValue', isNaN(numValue) ? undefined : numValue)
  } else {
    emit('update:modelValue', value)
  }
}

// Логика показа/скрытия пароля
const isPasswordVisible = ref(false)
const showToggle = computed(() => props.type === 'password')
const currentType = computed(() => {
  if (props.type !== 'password') return props.type
  return isPasswordVisible.value ? 'text' : 'password'
})

const toggleVisibility = () => {
  isPasswordVisible.value = !isPasswordVisible.value
}
</script>

<style scoped>
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-fast);
  overflow: hidden;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  padding: var(--spacing-sm);
  font-size: 1rem;
  color: var(--color-text);
  background: transparent;
}

.input-field.with-icon {
  padding-left: 0;
}

.input-field.with-toggle {
  padding-right: 2rem;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.password-toggle:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.input-container {
  margin-bottom: var(--spacing-md);
  width: 100%;
}

.input-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-fast);
  overflow: hidden;
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.input-wrapper--error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 2px var(--color-error-light);
}

.input-wrapper--error:focus-within {
  border-color: var(--color-error);
  box-shadow: 0 0 0 2px var(--color-error-light);
}

.input-wrapper:disabled {
  background-color: var(--color-background-soft);
  cursor: not-allowed;
  opacity: 0.6;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-sm);
  color: var(--vt-c-gray);
}

.search-icon {
  flex-shrink: 0;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  padding: var(--spacing-sm);
  font-size: 1rem;
  color: var(--color-text);
  background: transparent;
}

.input-field.with-icon {
  padding-left: 0;
}

.input-field:disabled {
  cursor: not-allowed;
}

.input-field::placeholder {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.input-field::-webkit-outer-spin-button,
.input-field::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-field[type='number'] {
  -moz-appearance: textfield;
}
</style>