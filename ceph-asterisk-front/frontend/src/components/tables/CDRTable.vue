<template>
  <div class="cdr-table-container">
    <div class="table-wrapper">
      <table class="cdr-table">
        <thead>
          <tr>
            <th class="column-answer">Дата ответа</th>
            <th class="column-end">Дата окончания</th>
            <th class="column-from">От</th>
            <th class="column-to">Кому</th>
            <th class="column-duration">Длительность</th>
            <th class="column-status">Статус</th>
            <th class="column-vats">ВАТС</th>
            <th class="column-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(call, index) in callsData" :key="index" class="table-row">
            <td class="cell-answer">{{ call.answerDateTime }}</td>
            <td class="cell-end">{{ call.endDateTime }}</td>
            <td class="cell-from">{{ call.from }}</td>
            <td class="cell-to">{{ call.to }}</td>
            <td class="cell-duration">{{ call.duration }}</td>
            <td class="cell-status">
              <span class="status-badge" :class="getStatusClass(call.status)">
                {{ call.status }}
              </span>
            </td>
            <td class="cell-vats">{{ call.vats }}</td>
            <td class="cell-actions">
              <CustomButton variant="outline" size="sm" @click="emit('details', call)">
                Детали
              </CustomButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallRecord } from '@/types/cdr'
import CustomButton from '@/components/UI/CustomButton.vue'

interface Props {
  callsData: CallRecord[]
}

interface Emits {
  (e: 'details', call: CallRecord): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const getStatusClass = (status: string): string => {
  const statusClasses: { [key: string]: string } = {
    Отвечен: 'status-success',
    'Не отвечен': 'status-warning',
    Занято: 'status-error',
    Неуспешный: 'status-error',
  }
  return statusClasses[status] || 'status-default'
}
</script>

<style scoped>
.cdr-table-container {
  width: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.cdr-table {
  width: 100%;
  border-collapse: collapse;
  font-family: inherit;
  font-size: 0.9rem;
  min-width: 800px;
}

.cdr-table th {
  background-color: var(--color-background-soft);
  padding: var(--spacing-md) var(--spacing-sm);
  text-align: left;
  font-weight: 600;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.cdr-table td {
  padding: 0.875rem var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
}

.table-row:hover {
  background-color: var(--color-background-soft);
  transition: background-color var(--transition-fast);
}

/* Ширины колонок */
.column-date {
  width: 15%;
  min-width: 140px;
}

.column-from {
  width: 15%;
  min-width: 120px;
}

.column-to {
  width: 15%;
  min-width: 120px;
}

.column-duration {
  width: 10%;
  min-width: 80px;
}

.column-status {
  width: 15%;
  min-width: 120px;
}

.column-vats {
  width: 20%;
  min-width: 150px;
}

/* Стили для ячеек */
.cell-date {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.cell-from,
.cell-to {
  font-weight: 500;
  color: var(--color-heading);
}

.cell-duration {
  text-align: center;
  font-family: 'SF Mono', 'Courier New', monospace;
  font-weight: 600;
  color: var(--color-text);
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}

.cell-status {
  text-align: center;
}

.status-badge {
  padding: 0.375rem var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 500;
  display: inline-block;
  min-width: 80px;
  text-align: center;
  border: 1px solid transparent;
}

.status-success {
  background-color: rgba(39, 174, 96, 0.1);
  color: var(--color-success);
  border-color: rgba(39, 174, 96, 0.2);
}

.status-warning {
  background-color: rgba(243, 156, 18, 0.1);
  color: var(--color-warning);
  border-color: rgba(243, 156, 18, 0.2);
}

.status-error {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--color-error);
  border-color: rgba(231, 76, 60, 0.2);
}

.status-default {
  background-color: var(--color-background-mute);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.cell-vats {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

/* Стили для скроллбара */
.table-wrapper::-webkit-scrollbar {
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: var(--color-background-soft);
  border-radius: var(--radius-full);
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}

/* Анимации */
@keyframes fadeInRow {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.table-row {
  animation: fadeInRow 0.3s ease forwards;
}

.table-row:nth-child(even) {
  background-color: var(--color-background-mute);
}

.table-row:nth-child(even):hover {
  background-color: var(--color-background-soft);
}

/* Адаптивность */
@media (max-width: 768px) {
  .cdr-table-container {
    border-radius: var(--radius-md);
    margin: 0;
  }

  .cdr-table {
    min-width: 700px;
  }

  .cdr-table th,
  .cdr-table td {
    padding: var(--spacing-sm) var(--spacing-xs);
    font-size: 0.8rem;
  }

  .status-badge {
    padding: 0.25rem var(--spacing-xs);
    min-width: 70px;
    font-size: 0.75rem;
  }

  .cell-date,
  .cell-vats {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .cdr-table {
    min-width: 600px;
  }

  .cdr-table th,
  .cdr-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.75rem;
  }

  .status-badge {
    min-width: 60px;
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
  }

  .column-date,
  .column-from,
  .column-to,
  .column-status,
  .column-vats {
    min-width: 100px;
  }
}

/* Улучшенная типографика для чисел */
.cell-duration::before {
  content: '';
  display: inline-block;
  width: 0.5rem;
}
</style>