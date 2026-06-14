<template>
  <div class="table-container">
    <div class="table-wrapper">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="column-timestamp">Время</th>
            <th class="column-level">Уровень</th>
            <th class="column-pbx">ВАТС</th>
            <th class="column-message">Сообщение</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, idx) in logsData" :key="idx" class="log-row">
            <td class="cell-timestamp">{{ formatTimestamp(log.message.timestamp) }}</td>
            <td class="cell-level">
              <span class="level-badge" :class="getLevelClass(log.message.level)">
                {{ log.message.level }}
              </span>
            </td>
            <td class="cell-pbx">{{ log.pbx_id || '—' }}</td>
            <td class="cell-message">{{ log.message.message }}</td>  <!-- изменено -->
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LogEntry } from '@/types/logs'

interface Props {
  logsData: LogEntry[]
}
defineProps<Props>()

const formatTimestamp = (ts: string | null): string => {
  if (!ts) return '—'
  const date = new Date(ts)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const getLevelClass = (level: string): string => {
  const classes: Record<string, string> = {
    DEBUG: 'level-debug',
    VERBOSE: 'level-verbose',
    NOTICE: 'level-notice',
    WARNING: 'level-warn',
    ERROR: 'level-error',
    UNKNOWN: 'level-unknown',
  }
  return classes[level] || 'level-default'
}
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
.logs-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}
.logs-table th {
  background-color: var(--color-background-soft);
  padding: var(--spacing-md) var(--spacing-sm);
  text-align: left;
  font-weight: 600;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
  font-size: 0.875rem;
  text-transform: uppercase;
}
.logs-table td {
  padding: var(--spacing-md) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9375rem;
  vertical-align: middle;
}
.log-row:hover {
  background-color: var(--color-background-soft);
}
.column-timestamp { width: 20%; min-width: 140px; }
.column-level { width: 12%; min-width: 100px; }
.column-message { width: 68%; }
.level-badge {
  padding: 0.25rem var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 500;
  display: inline-block;
}
.level-notice {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
  border: 1px solid rgba(46,204,113,0.2);
}
.level-unknown {
  background-color: rgba(127, 140, 141, 0.1);
  color: #7f8c8d;
  border: 1px solid rgba(127,140,141,0.2);
}
.level-verbose { background-color: rgba(52, 152, 219, 0.1); color: #3498db; border: 1px solid rgba(52,152,219,0.2); }
.level-warn { background-color: rgba(241, 196, 15, 0.1); color: #f1c40f; border: 1px solid rgba(241,196,15,0.2); }
.level-error { background-color: rgba(231, 76, 60, 0.1); color: #e74c3c; border: 1px solid rgba(231,76,60,0.2); }
.level-debug { background-color: rgba(155, 89, 182, 0.1); color: #9b59b6; border: 1px solid rgba(155,89,182,0.2); }
.level-default { background-color: var(--color-background-mute); color: var(--color-text-secondary); }
@media (max-width: 768px) {
  .logs-table th, .logs-table td { padding: var(--spacing-sm); font-size: 0.875rem; }
  .column-timestamp { min-width: 120px; }
  .level-badge { font-size: 0.75rem; padding: 0.125rem var(--spacing-xs); }
}
</style>