<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Детали звонка</h2>
        <button class="modal-close" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body" v-if="call">
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Дата ответа:</span>
            <span class="detail-value">{{ call.answerDateTime }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Дата окончания:</span>
            <span class="detail-value">{{ call.endDateTime }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">От:</span>
            <span class="detail-value">{{ call.from }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Кому:</span>
            <span class="detail-value">{{ call.to }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Длительность:</span>
            <span class="detail-value">{{ call.duration }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Статус:</span>
            <span class="detail-value" :class="statusClass(call.status)">{{ call.status }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ВАТС:</span>
            <span class="detail-value">{{ call.vats }}</span>
          </div>
        </div>
        <div class="action-buttons">
          <CustomButton variant="outline" @click="exportToJSON">Экспорт в JSON</CustomButton>
          <!-- В будущем: кнопка "Скачать запись" -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallRecord } from '@/types/cdr'
import CustomButton from '../UI/CustomButton.vue'

interface Props {
  show: boolean
  call: CallRecord | null
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const closeModal = () => {
  emit('close')
}

const handleOverlayClick = () => {
  closeModal()
}

const statusClass = (status: string) => {
  switch (status) {
    case 'Отвечен': return 'status-success'
    case 'Не отвечен': return 'status-warning'
    case 'Занято': return 'status-error'
    case 'Неуспешный': return 'status-error'
    default: return ''
  }
}

const exportToJSON = () => {
  if (!props.call) return
  const dataStr = JSON.stringify(props.call, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeDateTime = props.call.answerDateTime.replace(/[,\s:]/g, '_')
  a.download = `call_${safeDateTime}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* Используем существующие стили модалок из проекта */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal);
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  animation: slideIn 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.modal-body {
  margin-bottom: var(--spacing-lg);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}

.detail-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.detail-value {
  color: var(--color-text);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
}

.status-success { color: var(--color-success); }
.status-warning { color: var(--color-warning); }
.status-error { color: var(--color-error); }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .modal-content {
    padding: var(--spacing-md);
    width: calc(100% - 2 * var(--spacing-md));
  }
  .details-grid {
    grid-template-columns: 1fr;
  }
  .detail-item {
    flex-direction: column;
  }
}
</style>