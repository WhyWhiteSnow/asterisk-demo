<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content" @click.stop>
      <!-- Шаг 1: наименование -->
      <div v-if="currentStep === 1" class="modal-step">
        <h2 class="modal-title">Создание новой ВАТС</h2>
        <p class="modal-subtitle">Шаг 1: Основная информация</p>

        <!-- Баннер черновика только на первом шаге -->
        <div v-if="showDraftRestore" class="draft-banner">
          <span>Найден сохранённый черновик</span>
          <CustomButton size="small" @click="restoreDraft">Восстановить</CustomButton>
          <CustomButton size="small" variant="outline" @click="clearDraft">Очистить</CustomButton>
        </div>

        <div v-if="step1Error" class="error-message">
          <span>{{ step1Error }}</span>
        </div>

        <div class="form-group">
          <CustomInput
            ref="nameInputRef"
            v-model="formData.name"
            label="Наименование ВАТС *"
            placeholder="Например: Головной офис"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearStep1Error"
          />
          <p class="field-hint">Обязательное поле. Минимум 3 символа</p>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.create_test_users" />
            <span>Создать тестовых пользователей (6001, 6002)</span>
          </label>
        </div>

        <div class="modal-actions">
          <CustomButton variant="outline" @click="closeModal" :disabled="isLoading" class="cancel-btn">
            Отмена
          </CustomButton>
          <CustomButton @click="validateAndNextStep" :disabled="isLoading" class="next-btn">
            <span v-if="isLoading" class="button-loading">
              <span class="spinner"></span>
              Загрузка...
            </span>
            <span v-else>Далее</span>
          </CustomButton>
        </div>
      </div>

      <!-- Шаг 2: порты -->
      <div v-if="currentStep === 2" class="modal-step">
        <h2 class="modal-title">Создание новой ВАТС</h2>
        <p class="modal-subtitle">Шаг 2: Настройка портов</p>
        <div class="selected-info">
          <div class="info-row">
            <span class="info-label">Наименование ВАТС:</span>
            <span class="info-value">{{ formData.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Тестовые пользователи:</span>
            <span class="info-value">{{ formData.create_test_users ? 'Да (6001, 6002)' : 'Нет' }}</span>
          </div>
        </div>
        <div v-if="step2Error" class="error-message">
          <span>{{ step2Error }}</span>
        </div>

        <div class="form-group">
          <CustomInput
            v-model="formData.sip_port"
            label="SIP-порт *"
            type="number"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearStep2Error"
          />
        </div>

        <div class="form-group">
          <CustomInput
            v-model="formData.http_port"
            label="HTTP-порт *"
            type="number"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearStep2Error"
          />
        </div>

        <div class="form-group">
          <CustomInput
            v-model="formData.ami_port"
            label="AMI-порт *"
            type="number"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearStep2Error"
          />
        </div>

        <div class="form-group">
          <CustomInput
            v-model="formData.rtp_port_start"
            label="RTP порт (начало) *"
            type="number"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearStep2Error"
          />
        </div>

        <div class="form-group">
          <CustomInput
            v-model="formData.rtp_port_end"
            label="RTP порт (конец) *"
            type="number"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearStep2Error"
          />
        </div>

        <div class="form-group">
          <CustomSelect
            v-model="formData.transport_type"
            :options="transportTypeOptions"
            label="Тип транспорта"
            :disabled="isLoading"
            @change="clearStep2Error"
          />
        </div>

        <div class="modal-actions">
          <CustomButton variant="outline" @click="prevStep" :disabled="isLoading" class="back-btn">
            Назад
          </CustomButton>
          <CustomButton variant="outline" @click="closeModal" :disabled="isLoading" class="cancel-btn">
            Отмена
          </CustomButton>
          <CustomButton @click="createVats" :disabled="isLoading" class="finish-btn">
            <span v-if="isLoading" class="button-loading">
              <span class="spinner"></span>
              Создание...
            </span>
            <span v-else>Создать ВАТС</span>
          </CustomButton>
        </div>
      </div>

      <!-- Шаг 3: успех -->
      <div v-if="currentStep === 3" class="modal-step confirmation-step">
        <h2 class="modal-title">ВАТС успешно создана!</h2>
        <div class="confirmation-message success-message">
          <div class="confirmation-content">
            <p>ВАТС "{{ formData.name }}" создана с параметрами:</p>
            <div class="vats-details">
              <div class="detail-item"><span class="detail-label">SIP порт:</span> {{ formData.sip_port }}</div>
              <div class="detail-item"><span class="detail-label">HTTP порт:</span> {{ formData.http_port }}</div>
              <div class="detail-item"><span class="detail-label">AMI порт:</span> {{ formData.ami_port }}</div>
              <div class="detail-item"><span class="detail-label">RTP диапазон:</span> {{ formData.rtp_port_start }} - {{ formData.rtp_port_end }}</div>
              <div class="detail-item"><span class="detail-label">Тестовые пользователи:</span> {{ formData.create_test_users ? 'Да' : 'Нет' }}</div>
              <div class="detail-item">
                <span class="detail-label">Тип транспорта:</span> 
                {{ transportTypeOptions.find(opt => opt.value === formData.transport_type)?.label || formData.transport_type }}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <CustomButton @click="closeWithSuccess" class="finish-btn">Закрыть</CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import axios from 'axios'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '../UI/CustomSelect.vue'
import { vatsApi } from '@/api/vatsApi'
import { useToastStore } from '@/stores/toast'
import type { VatsInstanceFromAPI } from '@/types/vats'
import type { TransportType } from '@/types/vats'

interface Props {
  show: boolean
}
interface Emits {
  (e: 'close'): void
  (e: 'created', vatsData: VatsInstanceFromAPI): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToastStore()

// Refs
const nameInputRef = ref<InstanceType<typeof CustomInput> | null>(null)
let abortController: AbortController | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null

// Черновик
const DRAFT_KEY = 'vats_create_draft'
const showDraftRestore = ref(false)

const transportTypeOptions = [
  { value: 'udp', label: 'UDP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'tls', label: 'TLS' }
]

// Форма
interface LocalFormData {
  name: string
  sip_port: number
  http_port: number
  ami_port: number
  rtp_port_start: number
  rtp_port_end: number
  transport_type: TransportType
  create_test_users: boolean
}

const formData: LocalFormData = reactive({
  name: '',
  sip_port: 5060,
  http_port: 8088,
  ami_port: 5038,
  rtp_port_start: 10000,
  rtp_port_end: 20000,
  transport_type: 'udp',   // 👈 теперь строго 'udp'|'tcp'|'tls'
  create_test_users: false,
})

const currentStep = ref(1)
const isLoading = ref(false)
const step1Error = ref('')
const step2Error = ref('')

// Сохранение черновика (с debounce)
const saveDraft = () => {
  const draft = {
    name: formData.name,
    sip_port: formData.sip_port,
    http_port: formData.http_port,
    ami_port: formData.ami_port,
    rtp_port_start: formData.rtp_port_start,
    rtp_port_end: formData.rtp_port_end,
    transport_type: formData.transport_type,
    create_test_users: formData.create_test_users,
    currentStep: currentStep.value,
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

// Восстановление черновика
const restoreDraft = () => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (raw) {
    try {
      const draft = JSON.parse(raw)
      // Восстанавливаем все поля
      Object.assign(formData, draft)
      const validTransports: TransportType[] = ['udp', 'tcp', 'tls']
      if (!validTransports.includes(formData.transport_type)) {
        formData.transport_type = 'udp'
      }
      
      currentStep.value = draft.currentStep || 1
      showDraftRestore.value = false
      toast.addToast({ message: 'Черновик восстановлен', type: 'info' })
    } catch (e) {
      console.error('Ошибка восстановления черновика', e)
    }
  }
}

// Очистка черновика
const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
  showDraftRestore.value = false
  toast.addToast({ message: 'Черновик удалён', type: 'info' })
}

// Единый обработчик открытия модалки
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // Сброс формы
    currentStep.value = 1
    formData.name = ''
    formData.sip_port = 5060
    formData.http_port = 8088
    formData.ami_port = 5038
    formData.rtp_port_start = 10000
    formData.rtp_port_end = 20000
    formData.transport_type = 'udp'
    formData.create_test_users = false
    isLoading.value = false
    step1Error.value = ''
    step2Error.value = ''

    // Проверка черновика
    const draftExists = !!localStorage.getItem(DRAFT_KEY)
    showDraftRestore.value = draftExists

    // Автофокус
    await nextTick()
    const inputEl = nameInputRef.value?.$el?.querySelector('input')
    inputEl?.focus()
  }
})

// Автосохранение черновика при изменении (debounce 500 мс)
watch(
  () => ({ ...formData, step: currentStep.value }),
  () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      if (props.show && formData.name) {
        saveDraft()
      }
    }, 500)
  },
  { deep: true }
)

// Вспомогательные функции
const closeModal = () => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  emit('close')
}

const clearStep1Error = () => { step1Error.value = '' }
const clearStep2Error = () => { step2Error.value = '' }

// Валидация имени
const validateStep1 = (): boolean => {
  const name = formData.name.trim()
  if (!name) { step1Error.value = 'Поле обязательно'; return false }
  if (name.length < 3) { step1Error.value = 'Минимум 3 символа'; return false }
  if (!/^[a-zA-Zа-яА-Я0-9\s\-_]+$/.test(name)) { step1Error.value = 'Недопустимые символы'; return false }
  return true
}

// Валидация портов
const validateStep2 = (): boolean => {
  const ports = [
    { name: 'SIP-порт', val: formData.sip_port },
    { name: 'HTTP-порт', val: formData.http_port },
    { name: 'AMI-порт', val: formData.ami_port },
    { name: 'RTP начало', val: formData.rtp_port_start },
    { name: 'RTP конец', val: formData.rtp_port_end },
  ]
  for (const p of ports) {
    if (isNaN(p.val) || p.val < 1 || p.val > 65535) {
      step2Error.value = `${p.name} должен быть числом от 1 до 65535`
      return false
    }
  }
  if (formData.rtp_port_start >= formData.rtp_port_end) {
    step2Error.value = 'RTP порт начала должен быть меньше порта конца'
    return false
  }
  if (!['udp', 'tcp', 'tls'].includes(formData.transport_type)) {
    step2Error.value = 'Выберите корректный тип транспорта'
    return false
  }
  return true
}

// Проверка уникальности имени (через GET /instances/)
const isNameUnique = async (name: string): Promise<boolean> => {
  try {
    const list = await vatsApi.getVatsList()
    const exists = list.some(item => item.name === name)
    if (exists) step1Error.value = 'ВАТС с таким именем уже существует'
    return !exists
  } catch {
    step1Error.value = 'Не удалось проверить уникальность имени'
    return false
  }
}

const validateAndNextStep = async () => {
  if (!validateStep1()) return
  isLoading.value = true
  const unique = await isNameUnique(formData.name.trim())
  isLoading.value = false
  if (unique) currentStep.value = 2
}

const prevStep = () => {
  currentStep.value = 1
  step2Error.value = ''
}

// Создание ВАТС
const createVats = async () => {
  if (!validateStep2()) return

  // Отменяем предыдущий запрос
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  isLoading.value = true
  step2Error.value = ''

  try {
    const result = await vatsApi.createVatsFull(
      {
        name: formData.name.trim(),
        sip_port: formData.sip_port,
        http_port: formData.http_port,
        ami_port: formData.ami_port,
        rtp_port_start: formData.rtp_port_start,
        rtp_port_end: formData.rtp_port_end,
        transport_type: formData.transport_type,
        create_test_users: formData.create_test_users,
      },
      formData.create_test_users,
      { signal: abortController.signal }
    )

    // Успех
    toast.addToast({ message: `ВАТС "${formData.name}" успешно создана!`, type: 'success' })
    localStorage.removeItem(DRAFT_KEY)   // удаляем черновик
    showDraftRestore.value = false
    currentStep.value = 3
    emit('created', result)
  } catch (err: unknown) {
    if (axios.isCancel(err)) return

    let msg = 'Ошибка создания ВАТС'
    if (axios.isAxiosError(err)) {
      if (err.response) {
        const detail = err.response.data?.detail
        msg = detail || `Ошибка сервера (${err.response.status})`
      } else if (err.request) {
        msg = `Нет ответа от сервера: ${err.message}`
      } else {
        msg = err.message
      }
    } else if (err instanceof Error) {
      msg = err.message
    }

    step2Error.value = msg
    toast.addToast({ message: `Ошибка: ${msg}`, type: 'error' })
  } finally {
    isLoading.value = false
    abortController = null
  }
}

const closeWithSuccess = () => {
  closeModal()
}
</script>

<style scoped>
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-step {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 var(--spacing-xs) 0;
}

.modal-subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-md) 0;
}

.success-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(39, 174, 96, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(39, 174, 96, 0.3);
  border-radius: var(--radius-md);
  font-weight: 500;
  margin-bottom: var(--spacing-md);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: var(--spacing-lg);
}

.selected-info {
  background: var(--color-background);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  border-left: 3px solid var(--color-primary);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--spacing-xs);
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: 600;
  color: var(--color-text)
}

.cancel-btn {
  background-color: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.cancel-btn:hover:not(:disabled) {
  background-color: var(--color-background-soft);
  border-color: var(--color-border-hover);
}

.next-btn,
.finish-btn {
  background-color: var(--color-primary);
  color: white;
}

.next-btn:hover:not(:disabled),
.finish-btn:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.back-btn {
  background-color: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  margin-right: auto;
}

.back-btn:hover:not(:disabled) {
  background-color: var(--color-background-soft);
  border-color: var(--color-border-hover);
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

/* Стили для disabled состояний */
:deep(.input-wrapper:disabled),
:deep(.select-wrapper:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

:deep(.input-field:disabled),
:deep(.select-trigger:disabled) {
  cursor: not-allowed;
}

.draft-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-info-light);
  border: 1px solid var(--color-info-border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin-bottom: 16px;
  font-size: 0.85rem;
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-content {
    padding: var(--spacing-md);
    margin: var(--spacing-md);
    width: calc(100% - 2 * var(--spacing-md));
    border-radius: var(--radius-lg);
  }

  .modal-actions {
    flex-direction: column;
  }

  .back-btn {
    margin-right: 0;
    order: 1;
  }

  .cancel-btn {
    order: 2;
  }

  .next-btn,
  .finish-btn {
    order: 3;
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(231, 76, 60, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: var(--radius-md);
  font-weight: 500;
  margin-bottom: var(--spacing-md);
  animation: slideIn 0.3s ease;
}

.error-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.success-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.success-icon.large {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
}

.field-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
  margin-bottom: var(--spacing-sm);
}

.confirmation-step {
  text-align: center;
}

.confirmation-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.confirmation-content {
  max-width: 400px;
}

.confirmation-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-success);
  margin-bottom: var(--spacing-md);
}

.confirmation-details {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.vats-details {
  background: var(--color-background-soft);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  border: 1px solid var(--color-border);
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--color-border);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: var(--color-text);
}

.detail-value {
  color: var(--color-primary);
  font-weight: 500;
}

.confirmation-note {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: var(--spacing-md);
  font-style: italic;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Адаптивность */
@media (max-width: 768px) {
  .vats-details {
    padding: var(--spacing-sm);
  }

  .detail-item {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>