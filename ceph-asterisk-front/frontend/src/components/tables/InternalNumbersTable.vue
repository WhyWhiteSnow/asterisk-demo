<template>
  <div class="internal-numbers-table">
    <div class="overflow-x-auto">
      <div v-if="loading" class="loading-state">Загрузка номеров...</div>
      <template v-else>
        <table class="table">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Caller ID</th>
              <th>Тип номера</th>
              <th>SIP-транспорт</th>
              <th>Голосовая почта</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="number in numbers" :key="number.id">
              <td>{{ number.number }}</td>
              <td>{{ number.callerId }}</td>
              <td>
                <CustomBadge variant="outline">
                  {{ number.context }}
                </CustomBadge>
              </td>
              <td>
                <CustomBadge variant="outline">
                  {{ number.sipTransport?.toUpperCase() }}
                </CustomBadge>
              </td>
              <td>
                <CustomButton size="sm" variant="outline" @click="emit('voicemail', number.number)">
                  Ящик
                </CustomButton>
              </td>
              <td class="text-right actions-cell">
                <CustomButton
                  variant="outline"
                  size="sm"
                  title="Редактировать"
                  @click="emit('edit', number.id)"
                  :disabled="readOnly || deletingNumberId === number.id"
                >
                  ✎
                </CustomButton>
                <CustomButton
                  variant="outline"
                  size="sm"
                  title="Удалить"
                  @click="emit('delete', number.id)"
                  :disabled="readOnly || deletingNumberId === number.id"
                >
                  <span v-if="deletingNumberId === number.id" class="button-loading">
                    <span class="spinner"></span>
                  </span>
                  <span v-else>✕</span>
                </CustomButton>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="numbers.length === 0" class="text-center py-8 text-gray-500">
          Нет добавленных внутренних номеров
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomBadge from '@/components/UI/CustomBadge.vue'
import type { InternalNumber } from '@/types/vats'

interface Props {
  numbers: InternalNumber[]
  loading: boolean
  deletingNumberId?: string | null
  readOnly?: boolean
}

interface Emits {
  (e: 'delete', id: string): void
  (e: 'edit', id: string): void
  (e: 'voicemail', mailbox: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<style scoped>
.internal-numbers-table {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.loading-state .spinner {
  margin-bottom: var(--spacing-md);
}

.button-loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  color: var(--color-text);
}

.table th {
  background-color: var(--color-background-soft);
  font-weight: 600;
  color: var(--color-heading);
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
}

.text-gray-500 {
  color: var(--color-text-muted);
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.py-8 {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
}

@media (max-width: 768px) {
  .table th,
  .table td {
    padding: var(--spacing-sm);
  }
  .table {
    min-width: 500px;
  }
  .py-8 {
    padding-top: var(--spacing-lg);
    padding-bottom: var(--spacing-lg);
  }
}

@media (max-width: 480px) {
  .table th,
  .table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.75rem;
  }
}
</style>
