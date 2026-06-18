<script setup lang="ts">
import type { VatsTableItem } from '@/types/vats'
import type { VatsUiStatus } from '@/utils/vatsStatus'
import CustomButton from '@/components/UI/CustomButton.vue'

interface Props {
  tableData: VatsTableItem[]
}

interface Emits {
  (e: 'edit', vats: VatsTableItem): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const getStatusClass = (status: VatsUiStatus) => {
  switch (status) {
    case 'Активна':
      return 'status-active'
    case 'Создаётся':
      return 'status-creating'
    case 'Ошибка':
      return 'status-error'
    default:
      return 'status-inactive'
  }
}

const getStatusIconClass = (status: VatsUiStatus) => {
  switch (status) {
    case 'Активна':
      return 'status-icon-active'
    case 'Создаётся':
      return 'status-icon-creating'
    case 'Ошибка':
      return 'status-icon-error'
    default:
      return 'status-icon-inactive'
  }
}
</script>

<template>
  <div class="table-container">
    <div class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th class="column-name">Наименование</th>
            <th class="column-status">Статус</th>
            <th class="column-server">Имя Docker-контейнера</th>
            <th class="column-port">Порт</th>
            <th class="column-date">Дата создания</th>
            <th class="column-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in tableData"
            :key="item.id"
            class="table-row"
          >
            <td class="cell-name">
              <div class="name-content">
                <span class="status-icon" :class="getStatusIconClass(item.status)">●</span>
                {{ item.name }}
              </div>
            </td>
            <td class="cell-status">
              <span class="status-badge" :class="getStatusClass(item.status)">
                {{ item.status }}
              </span>
            </td>
            <td class="cell-server">{{ item.server }}</td>
            <td class="cell-port">{{ item.port }}</td>
            <td class="cell-date">{{ item.date }}</td>
            <td class="cell-actions">
              <CustomButton
                class="cell-actions--edit_btn"
                @click="emit('edit', item)"
              >
                Просмотр
              </CustomButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-container {
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

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: inherit;
  min-width: 800px;
}

.custom-table th {
  background-color: var(--color-background-soft);
  padding: var(--spacing-md) var(--spacing-sm);
  text-align: left;
  font-weight: 600;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: 0;
  z-index: 1;
}

.custom-table td {
  padding: var(--spacing-md) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9375rem;
  vertical-align: middle;
}

.table-row:hover {
  background-color: var(--color-background-soft);
  transition: background-color var(--transition-fast);
}

/* Колонки */
.column-name {
  width: 25%;
  min-width: 150px;
}

.column-status {
  width: 15%;
  min-width: 100px;
}

.column-server {
  width: 20%;
  min-width: 120px;
}

.column-port {
  width: 10%;
  min-width: 80px;
}

.column-date {
  width: 20%;
  min-width: 120px;
}

.column-actions {
  width: 200px;
  min-width: 150px;
}

/* Ячейки */
.cell-name .name-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-heading);
}

/* Статусы */
.status-icon {
  font-size: 1rem;
  margin-right: var(--spacing-xs);
}

.status-icon-active {
  color: var(--color-success);
}

.status-icon-inactive {
  color: var(--color-error);
}

.status-badge {
  padding: 0.25rem var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: 80px;
}

.status-active {
  background-color: rgba(39, 174, 96, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(39, 174, 96, 0.2);
}

.status-inactive {
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(231, 76, 60, 0.2);
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

/* Адаптивность */
@media (max-width: 768px) {
  .table-container {
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xs);
  }

  .custom-table {
    min-width: 600px;
  }

  .custom-table th {
    padding: var(--spacing-sm);
    font-size: 0.8125rem;
  }

  .custom-table td {
    padding: var(--spacing-sm);
    font-size: 0.875rem;
  }

  .cell-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .cell-actions .custom-button {
    width: 100%;
  }

  .status-badge {
    min-width: 70px;
    padding: 0.125rem var(--spacing-xs);
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .custom-table {
    min-width: 500px;
  }

  .column-actions {
    min-width: 120px;
  }

  .status-badge {
    min-width: 60px;
    font-size: 0.6875rem;
  }
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
</style>