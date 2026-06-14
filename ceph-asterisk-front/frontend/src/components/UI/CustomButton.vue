<template>
  <button class="custom-button">
    <slot></slot>
  </button>
</template>

<style scoped>
.custom-button {
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text);
  background-color: var(--color-background-mute);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: var(--spacing-sm);
}

.custom-button:hover {
  background-color: var(--color-surface-hover);
}
</style>