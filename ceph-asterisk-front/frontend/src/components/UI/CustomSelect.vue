<template>
  <div class="select-container" ref="containerRef">
    <label v-if="label" class="select-label">{{ label }}</label>
    <div
      class="select-wrapper"
      :class="{
        'select--open': isOpen,
        'select--disabled': disabled,
      }"
      :data-select-open="isOpen ? 'true' : undefined"
    >
      <div class="select-trigger" @click="toggleDropdown" ref="triggerRef">
        <span class="select-value">
          {{ selectedOption?.label || placeholder }}
        </span>
        <svg
          class="select-arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          :class="{ 'select-arrow--open': isOpen }"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="select-dropdown teleported-dropdown"
        data-select-open="true"
        :style="dropdownStyle"
      >
        <div
          v-for="option in options"
          :key="option.value"
          class="select-option"
          :class="{
            'select-option--selected': isSelected(option),
            'select-option--disabled': option.disabled,
          }"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'

const dropdownRef = ref<HTMLElement | null>(null)

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string | number | null
  options: SelectOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'change', value: string | number | null): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Выберите опцию...',
  disabled: false,
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref({})

const selectedOption = computed(() => {
  const current = props.modelValue
  if (current === null || current === undefined || current === '') return undefined
  return props.options.find(
    (option) => String(option.value) === String(current)
  )
})

const isSelected = (option: SelectOption) => {
  if (props.modelValue === null || props.modelValue === undefined) return false
  return String(option.value) === String(props.modelValue)
}

const updateDropdownPosition = async () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()

  // Исходная позиция — снизу
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
    zIndex: 10000,
  }

  // Дожидаемся рендеринга реального размера списка
  await nextTick()
  if (dropdownRef.value) {
    const dropdownHeight = dropdownRef.value.offsetHeight
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    // Если внизу не помещается, а сверху места больше — показываем сверху
    if (dropdownHeight > spaceBelow && spaceAbove > spaceBelow) {
      dropdownStyle.value = {
        ...dropdownStyle.value,
        top: `${rect.top - dropdownHeight}px`,
      }
    }
  }
}

const toggleDropdown = async () => {
  if (props.disabled) return
  if (!isOpen.value) {
    isOpen.value = true
    await nextTick()
    updateDropdownPosition()
  } else {
    isOpen.value = false
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

const isTargetInsideSelect = (target: Node | null): boolean => {
  if (!target) return false
  return Boolean(
    containerRef.value?.contains(target) || dropdownRef.value?.contains(target),
  )
}

const handlePointerOutside = (event: Event) => {
  if (!isOpen.value) return
  if (isTargetInsideSelect(event.target as Node)) return
  closeDropdown()
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isOpen.value) return
  event.preventDefault()
  event.stopPropagation()
  closeDropdown()
}

const selectOption = (option: SelectOption) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closeDropdown()
}

const addGlobalListeners = () => {
  document.addEventListener('mousedown', handlePointerOutside, true)
  document.addEventListener('touchstart', handlePointerOutside, true)
  document.addEventListener('keydown', handleEscape, true)
  window.addEventListener('scroll', updateDropdownPosition, true)
  window.addEventListener('resize', updateDropdownPosition)
}

const removeGlobalListeners = () => {
  document.removeEventListener('mousedown', handlePointerOutside, true)
  document.removeEventListener('touchstart', handlePointerOutside, true)
  document.removeEventListener('keydown', handleEscape, true)
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition)
}

watch(isOpen, (newVal) => {
  if (newVal) {
    updateDropdownPosition()
    addGlobalListeners()
  } else {
    removeGlobalListeners()
  }
})

onUnmounted(() => {
  removeGlobalListeners()
})
</script>

<style scoped>
.select-container {
  margin-bottom: var(--spacing-md);
  width: 100%;
  position: relative;
}
.select-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
.select-wrapper {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-base);
}
.select-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
.select-wrapper.select--open {
  border-color: var(--color-primary);
}
.select-wrapper.select--disabled {
  background-color: var(--color-background-soft);
  cursor: not-allowed;
  opacity: 0.6;
}
.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  cursor: pointer;
  user-select: none;
}
.select-wrapper.select--disabled .select-trigger {
  cursor: not-allowed;
}
.select-value {
  color: var(--color-text);
  font-size: 1rem;
}
.select-arrow {
  color: var(--color-text-muted);
  transition: transform var(--transition-base);
  flex-shrink: 0;
  margin-left: var(--spacing-xs);
}
.select-arrow--open {
  transform: rotate(180deg);
}
/* teleported dropdown стили (глобальные, не scoped) */
.teleported-dropdown {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 200px;
  overflow-y: auto;
  position: fixed;
  margin-top: 4px;
}
.select-option {
  padding: 0.5rem 0.625rem;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-background-soft);
}
.select-option:last-child {
  border-bottom: none;
}
.select-option:hover {
  background-color: var(--color-background-soft);
}
.select-option--selected {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}
.select-option--selected:hover {
  background-color: var(--color-primary-light);
}
.select-option--disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
  background-color: var(--color-background-soft);
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-base);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>