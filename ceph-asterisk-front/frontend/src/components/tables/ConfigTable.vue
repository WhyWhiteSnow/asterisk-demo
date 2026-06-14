<template>
  <div class="config-section">
    <h3 class="section-title">{{ title }}</h3>
    <div class="table-wrapper">
      <table class="config-table">
        <thead>
          <tr>
            <th class="column-parameter">Параметр</th>
            <th class="column-name">Имя (name)</th>
            <th class="column-type">Тип</th>
            <th class="column-default">Значение по умолчанию</th>
            <th class="column-description">Описание</th>
            <th class="column-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(param, index) in parameters" :key="index" class="table-row">
            <td class="cell-parameter">{{ param.parameter }}</td>
            <td class="cell-name">
              <code class="name-code">{{ param.name }}</code>
            </td>
            <td class="cell-type">
              <span class="type-badge">{{ param.type }}</span>
            </td>
            <td class="cell-default">
              <span v-if="param.type === 'boolean'" class="boolean-value">
                {{ param.defaultValue ? '✅ true' : '❌ false' }}
              </span>
              <span v-else class="default-value">{{ param.defaultValue }}</span>
            </td>
            <td class="cell-description">{{ param.description }}</td>
            <td class="cell-actions">
              <div class="actions-wrapper">
                <button
                  class="action-btn action-edit"
                  @click="editParam(param)"
                  title="Изменить параметр"
                >
                  Изменить
                </button>
                <button
                  class="action-btn action-save"
                  @click="saveParam(param)"
                  title="Сохранить параметр"
                >
                  Сохранить
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ConfigParameter {
  parameter: string
  name: string
  type: string
  defaultValue: string | boolean
  description: string
}

interface Props {
  title: string
  parameters: ConfigParameter[]
}

interface Emits {
  (e: 'edit', param: ConfigParameter): void
  (e: 'save', param: ConfigParameter): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const editParam = (param: ConfigParameter) => {
  emit('edit', param)
}

const saveParam = (param: ConfigParameter) => {
  emit('save', param)
}
</script>

<style scoped>
.config-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 var(--spacing-md) 0;
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--color-border);
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  font-family: inherit;
  font-size: 0.85rem;
  min-width: 900px;
}

.config-table th {
  background-color: var(--color-background-soft);
  padding: 0.875rem var(--spacing-sm);
  text-align: left;
  font-weight: 600;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.config-table td {
  padding: 0.75rem var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
}

.table-row:hover {
  background-color: var(--color-background-soft);
  transition: background-color var(--transition-fast);
}

/* Ширины колонок */
.column-parameter {
  width: 18%;
  min-width: 160px;
}

.column-name {
  width: 12%;
  min-width: 120px;
}

.column-type {
  width: 10%;
  min-width: 100px;
}

.column-default {
  width: 12%;
  min-width: 120px;
}

.column-description {
  width: 35%;
  min-width: 250px;
  white-space: normal !important;
}

.column-actions {
  width: 13%;
  min-width: 140px;
}

/* Стили для ячеек */
.cell-parameter {
  font-weight: 500;
  color: var(--color-heading);
}

.cell-name .name-code {
  background-color: var(--color-background-mute);
  padding: 0.25rem var(--spacing-xs);
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  font-weight: 500;
}

.cell-type .type-badge {
  padding: 0.25rem var(--spacing-xs);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  background-color: rgba(52, 152, 219, 0.1);
  color: var(--color-info);
  border: 1px solid rgba(52, 152, 219, 0.2);
  font-family: 'SF Mono', 'Courier New', monospace;
  display: inline-block;
  min-width: 60px;
  text-align: center;
}

.cell-default .default-value {
  font-family: 'SF Mono', 'Courier New', monospace;
  font-weight: 500;
  color: var(--color-success);
}

.cell-default .boolean-value {
  font-family: 'SF Mono', 'Courier New', monospace;
  font-weight: 500;
  color: var(--color-text);
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}

.cell-description {
  color: var(--color-text-secondary);
  line-height: 1.4;
  white-space: normal;
  font-size: 0.8125rem;
}

.cell-actions {
  text-align: center;
}

.actions-wrapper {
  display: flex;
  gap: var(--spacing-xs);
  justify-content: center;
}

.action-btn {
  padding: 0.375rem var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  min-width: 70px;
}

.action-edit {
  background-color: var(--color-primary);
  color: white;
}

.action-edit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.action-save {
  background-color: var(--color-success);
  color: white;
}

.action-save:hover:not(:disabled) {
  background-color: rgba(39, 174, 96, 0.9);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Стили для скроллбара */
.table-wrapper::-webkit-scrollbar {
  height: 6px;
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

/* Дополнительные стили для типов данных */
.type-badge.string {
  background-color: rgba(52, 152, 219, 0.1);
  color: var(--color-info);
  border-color: rgba(52, 152, 219, 0.2);
}

.type-badge.number {
  background-color: rgba(155, 89, 182, 0.1);
  color: #9b59b6;
  border-color: rgba(155, 89, 182, 0.2);
}

.type-badge.boolean {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
  border-color: rgba(46, 204, 113, 0.2);
}

.type-badge.object {
  background-color: rgba(230, 126, 34, 0.1);
  color: #e67e22;
  border-color: rgba(230, 126, 34, 0.2);
}

.type-badge.array {
  background-color: rgba(52, 73, 94, 0.1);
  color: #34495e;
  border-color: rgba(52, 73, 94, 0.2);
}

/* Адаптивность */
@media (max-width: 768px) {
  .config-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-title {
    font-size: 1.1rem;
    margin-bottom: var(--spacing-sm);
  }

  .config-table {
    min-width: 700px;
  }

  .config-table th,
  .config-table td {
    padding: 0.625rem var(--spacing-xs);
    font-size: 0.8rem;
  }

  .actions-wrapper {
    flex-direction: column;
    gap: 0.25rem;
  }

  .action-btn {
    padding: 0.25rem var(--spacing-xs);
    font-size: 0.7rem;
    min-width: 60px;
  }

  .cell-name .name-code,
  .cell-type .type-badge {
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
  }

  .cell-description {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .config-table {
    min-width: 600px;
  }

  .config-table th,
  .config-table td {
    padding: 0.5rem 0.375rem;
    font-size: 0.75rem;
  }

  .column-parameter,
  .column-name,
  .column-type,
  .column-default,
  .column-actions {
    min-width: 100px;
  }

  .column-description {
    min-width: 200px;
  }

  .action-btn {
    min-width: 50px;
    font-size: 0.65rem;
    padding: 0.125rem 0.375rem;
  }

  .type-badge {
    min-width: 50px;
    font-size: 0.65rem;
  }
}

/* Дополнительные стили для состояний */
.cell-default .default-value.null {
  color: var(--color-text-muted);
  font-style: italic;
}

.cell-default .default-value.empty {
  color: var(--color-warning);
}
</style>