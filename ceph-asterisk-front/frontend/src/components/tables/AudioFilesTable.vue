<template>
  <div class="table-container">
    <div class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th class="column-name">Имя файла</th>
            <th class="column-format">Формат</th>
            <th class="column-size">Размер</th>
            <th class="column-duration">Длительность</th>
            <th class="column-date">Дата загрузки</th>
            <th class="column-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in audioFiles" :key="file.id" class="table-row">
            <td class="cell-name">
              <div class="name-content">
                <span class="file-icon">🎵</span>
                {{ file.name }}
              </div>
            </td>
            <td class="cell-format">
              <span class="format-badge">{{ file.format }}</span>
            </td>
            <td class="cell-size">{{ file.size }}</td>
            <td class="cell-duration">{{ file.duration }}</td>
            <td class="cell-date">{{ file.uploadDate }}</td>
            <td class="cell-actions">
              <CustomButton variant="outline" size="sm" @click="emit('play', file)">
                Слушать
              </CustomButton>
              <CustomButton variant="outline" size="sm" @click="emit('delete', file)">
                Удалить
              </CustomButton>
            </td>
          </tr>
        </tbody>
       </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AudioFileDisplay } from '@/types/audio'
import CustomButton from '@/components/UI/CustomButton.vue'

interface Props {
  audioFiles: AudioFileDisplay[]
}
interface Emits {
  (e: 'play', file: AudioFileDisplay): void
  (e: 'delete', file: AudioFileDisplay): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

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

/* Ширина колонок (настраиваем под аудиофайлы) */
.column-name {
  width: 30%;
  min-width: 180px;
}
.column-format {
  width: 15%;
  min-width: 100px;
}
.column-size {
  width: 10%;
  min-width: 80px;
}
.column-duration {
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

/* Ячейка имени */
.cell-name .name-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-heading);
}

.file-icon {
  font-size: 1rem;
}

/* Бейдж для формата (как статус в VatsTable) */
.format-badge {
  padding: 0.25rem var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  background-color: rgba(52, 152, 219, 0.1);
  color: #3498db;
  border: 1px solid rgba(52, 152, 219, 0.2);
}

/* Действия (кнопки) */
.cell-actions {
  white-space: nowrap;      /* предотвращаем перенос кнопок на десктопе */
  text-align: left;         /* выравнивание содержимого */
}

/* Кнопки внутри ячейки – inline-block, выравнивание по середине */
.cell-actions .custom-button {
  display: inline-block;
  vertical-align: middle;
  margin: 0 var(--spacing-xs) 0 0;
}

/* Последняя кнопка без правого отступа */
.cell-actions .custom-button:last-child {
  margin-right: 0;
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

/* Адаптивность для мобильных устройств */
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
    white-space: normal;      /* разрешаем перенос */
    text-align: stretch;
  }
  .cell-actions .custom-button {
    display: block;
    width: 100%;
    margin: var(--spacing-xs) 0 0 0;
    text-align: center;
  }
  .cell-actions .custom-button:first-child {
    margin-top: 0;
  }
  .format-badge {
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
  .format-badge {
    font-size: 0.6875rem;
  }
}

/* Анимация строк */
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