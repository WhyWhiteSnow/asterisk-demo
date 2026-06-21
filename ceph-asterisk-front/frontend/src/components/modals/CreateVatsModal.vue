<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content" @click.stop>
      <div v-if="currentStep === 1" class="modal-step">
        <h2 class="modal-title">Создание новой ВАТС</h2>
        <p class="modal-subtitle">Шаг 1: Основная информация</p>

        <div v-if="showDraftRestore" class="draft-banner">
          <span>Найден сохранённый черновик</span>
          <CustomButton size="small" @click="restoreDraft">Восстановить</CustomButton>
          <CustomButton size="small" variant="outline" @click="clearDraft">Очистить</CustomButton>
        </div>

        <div v-if="errors.general" class="error-message-global">
          <span>{{ errors.general }}</span>
        </div>

        <div class="form-group">
          <CustomInput
            ref="nameInputRef"
            v-model="formData.name"
            label="Наименование ВАТС *"
            placeholder="Например: Головной офис"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearError('name')"
          />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
          <p v-else class="field-hint">Обязательное поле. Минимум 3 символа</p>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.create_test_users" :disabled="!!formData.template_id" />
            <span>Создать тестовых пользователей ({{ testExtensionsLabel }})</span>
          </label>
          <p v-if="formData.create_test_users" class="field-hint">
            После создания будут добавлены внутренние номера: {{ testExtensionsLabel }}
          </p>
          <p v-if="formData.template_id" class="field-hint">
            Шаблон уже включает настройку номеров — отдельная галочка не нужна.
          </p>
        </div>

        <div class="form-group">
          <CustomSelect
            v-model="formData.template_id"
            :options="templateSelectOptions"
            label="Шаблон типового сценария"
            placeholder="Без шаблона (пустая ВАТС)"
            :disabled="isLoading"
          />
          <ul v-if="selectedTemplatePreview.length" class="template-preview-list">
            <li v-for="item in selectedTemplatePreview" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="modal-actions">
          <CustomButton variant="outline" @click="closeModal" :disabled="isLoading" class="cancel-btn">
            Отмена
          </CustomButton>
          <CustomButton @click="validateAndNextStep" :disabled="isLoading" class="next-btn">
            <span v-if="isLoading" class="button-loading"><span class="spinner"></span> Загрузка...</span>
            <span v-else>Далее</span>
          </CustomButton>
        </div>
      </div>

      <div v-if="currentStep === 2" class="modal-step">
        <h2 class="modal-title">Создание новой ВАТС</h2>
        <p class="modal-subtitle">Шаг 2: SIP-порт и протокол</p>
        
        <div class="selected-info">
          <div class="info-row">
            <span class="info-label">Наименование ВАТС:</span>
            <span class="info-value">{{ formData.name }}</span>
          </div>
        </div>

        <div v-if="errors.general" class="error-message-global">
          <span>{{ errors.general }}</span>
        </div>

        <div class="form-group">
          <CustomInput
            v-model="formData.sip_port"
            label="SIP-порт *"
            type="number"
            :with-icon="false"
            :disabled="isLoading"
            @input="clearError('sip_port')"
          />
          <span v-if="errors.sip_port" class="field-error">{{ errors.sip_port }}</span>
          <p v-else class="field-hint text-primary">
            Рекомендуемый свободный порт: {{ recommendedSipPort }}
            <CustomButton size="small" variant="outline" class="hint-btn" @click="applyRecommendedPort" :disabled="isLoading">
              Подставить
            </CustomButton>
          </p>
          <p v-if="usedSipPorts.length" class="field-hint">
            Занятые SIP-порты: {{ usedSipPorts.join(', ') }}
          </p>
        </div>

        <div class="form-group">
          <CustomSelect
            v-model="formData.transport_type"
            :options="transportTypeOptions"
            label="Тип транспорта"
            :disabled="isLoading"
            @change="clearError('transport_type')"
          />
          <span v-if="errors.transport_type" class="field-error">{{ errors.transport_type }}</span>
        </div>

        <div class="modal-actions">
          <CustomButton variant="outline" @click="prevStep" :disabled="isLoading" class="back-btn">
            Назад
          </CustomButton>
          <CustomButton variant="outline" @click="closeModal" :disabled="isLoading" class="cancel-btn">
            Отмена
          </CustomButton>
          <CustomButton @click="createVats" :disabled="isLoading" class="finish-btn">
            <span v-if="isLoading" class="button-loading"><span class="spinner"></span> Создание...</span>
            <span v-else>Создать ВАТС</span>
          </CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed, toRef } from 'vue'
import axios from 'axios'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '../UI/CustomSelect.vue'
import { vatsApi } from '@/api/vatsApi'
import { templatesApi } from '@/api/templatesApi'
import type { TemplateInfo } from '@/types/templates'
import { useToastStore } from '@/stores/toast'
import { parseApiError } from '@/utils/parseApiError'
import { formatTestExtensionsLabel } from '@/constants/testUsers'
import { useModalOverlay } from '@/composables/useModalOverlay'
import type { VatsInstanceFromAPI, TransportType, VatsTableItem, UsedPortsResponse } from '@/types/vats'

interface Props {
  show: boolean
  existingVats?: VatsTableItem[] // <-- Новый пропс
}
interface Emits {
  (e: 'close'): void
  (e: 'created', vatsData: VatsInstanceFromAPI): void
  (e: 'failed'): void
}

const props = withDefaults(defineProps<Props>(), {
  existingVats: () => []
})
const emit = defineEmits<Emits>()
const toast = useToastStore()

const testExtensionsLabel = formatTestExtensionsLabel()

const nameInputRef = ref<InstanceType<typeof CustomInput> | null>(null)
let abortController: AbortController | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null

const DRAFT_KEY = 'vats_create_draft'
const showDraftRestore = ref(false)

const transportTypeOptions = [
  { value: 'udp', label: 'UDP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'tls', label: 'TLS' }
]

const errors = reactive<Record<string, string>>({
  name: '',
  sip_port: '',
  transport_type: '',
  general: ''
})

const clearError = (field: string) => { errors[field] = '' }
const clearAllErrors = () => { Object.keys(errors).forEach(key => errors[key] = '') }

interface LocalFormData {
  name: string
  sip_port: number
  transport_type: TransportType
  create_test_users: boolean
  template_id: string
}

const formData: LocalFormData = reactive({
  name: '',
  sip_port: 5060,
  transport_type: 'udp',
  create_test_users: false,
  template_id: '',
})

const templatesCatalog = ref<TemplateInfo[]>([])

const templateSelectOptions = computed(() => [
  { value: '', label: 'Без шаблона' },
  ...templatesCatalog.value.map(t => ({ value: t.id, label: t.name })),
])

const selectedTemplatePreview = computed(() => {
  if (!formData.template_id) return []
  const template = templatesCatalog.value.find(t => t.id === formData.template_id)
  return template?.preview_items ?? []
})

const loadTemplatesCatalog = async () => {
  try {
    templatesCatalog.value = await templatesApi.getCatalog()
  } catch {
    templatesCatalog.value = []
  }
}

const currentStep = ref(1)
const isLoading = ref(false)
const usedPorts = ref<UsedPortsResponse | null>(null)

const findNextFreePort = (usedPortList: number[], basePort: number): number => {
  const used = new Set(usedPortList.filter((p) => !Number.isNaN(p)))
  let port = basePort
  while (port <= 65535 && used.has(port)) {
    port += 1
  }
  return port <= 65535 ? port : basePort
}

const buildUsedPortsFromInstances = (instances: VatsInstanceFromAPI[]): UsedPortsResponse => ({
  sip: instances.map((i) => i.sip_port),
  http: instances.map((i) => i.http_port).filter((p): p is number => typeof p === 'number'),
  ami: instances.map((i) => i.ami_port).filter((p): p is number => typeof p === 'number'),
  rtp_ranges: instances
    .filter((i) => typeof i.rtp_port_start === 'number' && typeof i.rtp_port_end === 'number')
    .map((i) => ({ start: i.rtp_port_start!, end: i.rtp_port_end! })),
})

const loadUsedPorts = async (): Promise<boolean> => {
  try {
    usedPorts.value = await vatsApi.getUsedPorts()
    return true
  } catch {
    try {
      const instances = await vatsApi.getVatsList()
      usedPorts.value = buildUsedPortsFromInstances(instances)
      return true
    } catch {
      usedPorts.value = null
      return false
    }
  }
}

const applyRecommendedSipPort = () => {
  if (!usedPorts.value) {
    formData.sip_port = recommendedSipPort.value
    return
  }
  formData.sip_port = findNextFreePort(usedPorts.value.sip, 5060)
}

const recommendedSipPort = computed(() => {
  if (usedPorts.value?.sip.length) {
    return findNextFreePort(usedPorts.value.sip, 5060)
  }
  if (props.existingVats.length === 0) return 5060

  const ports = props.existingVats
    .map(v => Number(v.port))
    .filter(p => !isNaN(p))

  if (ports.length === 0) return 5060

  const maxPort = Math.max(...ports)
  return maxPort >= 5060 ? maxPort + 1 : 5060
})

const usedSipPorts = computed(() => {
  if (usedPorts.value?.sip.length) {
    return [...usedPorts.value.sip].sort((a, b) => a - b)
  }
  return props.existingVats
    .map(v => Number(v.port))
    .filter(p => !isNaN(p))
    .sort((a, b) => a - b)
})

const applyRecommendedPort = () => {
  formData.sip_port = recommendedSipPort.value
  clearError('sip_port')
}

const saveDraft = () => {
  const draft = { ...formData, currentStep: currentStep.value }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

const restoreDraft = () => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (raw) {
    try {
      const draft = JSON.parse(raw)
      Object.assign(formData, draft)
      if (!['udp', 'tcp', 'tls'].includes(formData.transport_type)) formData.transport_type = 'udp'
      currentStep.value = draft.currentStep || 1
      showDraftRestore.value = false
      clearAllErrors()
      toast.addToast({ message: 'Черновик восстановлен', type: 'info' })
    } catch (error) {
      console.warn('Не удалось восстановить черновик из localStorage:', error)
      localStorage.removeItem(DRAFT_KEY)
      showDraftRestore.value = false
    }
  }
}

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
  showDraftRestore.value = false
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    currentStep.value = 1
    formData.name = ''
    formData.transport_type = 'udp'
    formData.create_test_users = false
    formData.template_id = ''
    isLoading.value = false
    clearAllErrors()

    await loadUsedPorts()
    await loadTemplatesCatalog()
    applyRecommendedSipPort()

    showDraftRestore.value = !!localStorage.getItem(DRAFT_KEY)

    await nextTick()
    const inputEl = nameInputRef.value?.$el?.querySelector('input')
    inputEl?.focus()
  }
})

watch(() => ({ ...formData, step: currentStep.value }), () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => { if (props.show && formData.name) saveDraft() }, 500)
}, { deep: true })

const closeModal = () => {
  if (abortController) { abortController.abort(); abortController = null }
  emit('close')
}

useModalOverlay(toRef(props, 'show'), closeModal)

const validateStep1 = (): boolean => {
  clearAllErrors()
  let isValid = true
  const name = formData.name.trim()

  if (!name) { errors.name = 'Обязательное поле'; isValid = false }
  else if (name.length < 3) { errors.name = 'Минимум 3 символа'; isValid = false }
  else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,}$/.test(name)) {
    errors.name = 'Только латинские буквы, цифры, дефис и подчёркивание'
    isValid = false
  }

  if (isValid && props.existingVats.some(v => v.name.toLowerCase() === name.toLowerCase())) {
    errors.name = 'ВАТС с таким именем уже существует в кластере'
    isValid = false
  }

  return isValid
}

const validateStep2 = (): boolean => {
  clearAllErrors()
  let isValid = true

  const val = Number(formData.sip_port)
  if (isNaN(val) || val < 1 || val > 65535) {
    errors.sip_port = 'Укажите корректный SIP-порт (от 1 до 65535)'
    isValid = false
  }

  if (isValid && usedPorts.value?.sip.includes(formData.sip_port)) {
    errors.sip_port = 'Этот SIP-порт уже используется другой ВАТС'
    isValid = false
  } else if (isValid && props.existingVats.some(v => Number(v.port) === formData.sip_port)) {
    errors.sip_port = 'Этот SIP-порт уже используется другой ВАТС'
    isValid = false
  }

  return isValid
}

const validateAndNextStep = async () => {
  if (!validateStep1()) return
  await loadUsedPorts()
  applyRecommendedSipPort()
  currentStep.value = 2
}

const prevStep = () => {
  currentStep.value = 1
  clearAllErrors()
}

const createVats = async () => {
  if (!validateStep2()) return

  if (abortController) abortController.abort()
  abortController = new AbortController()

  isLoading.value = true
  clearAllErrors()

  try {
    const apiAvailable = await loadUsedPorts()
    if (!apiAvailable) {
      errors.general =
        'API недоступен. Проверьте, что backend запущен; для создания ВАТС также нужен Docker.'
      toast.addToast({ message: errors.general, type: 'error' })
      return
    }

    const result = await vatsApi.createVatsFull(
      {
        name: formData.name.trim(),
        sip_port: formData.sip_port,
        transport_type: formData.transport_type,
      },
      formData.create_test_users,
      { signal: abortController.signal },
      formData.template_id || undefined
    )

    localStorage.removeItem(DRAFT_KEY)
    showDraftRestore.value = false
    emit('created', result)
    closeModal()
  } catch (err: unknown) {
    if (axios.isCancel(err)) return

    const msg = parseApiError(err, 'Произошла непредвиденная ошибка при создании ВАТС')
    errors.general = msg
    toast.addToast({ message: `Ошибка: ${msg}`, type: 'error' })
    emit('failed')
  } finally {
    isLoading.value = false
    abortController = null
  }
}

</script>

<style scoped>
.template-preview-list {
  margin: var(--spacing-sm) 0 0;
  padding-left: 1.25rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
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

.hint-btn {
  margin-left: 0.5rem;
  display: inline-flex;
  vertical-align: middle;
}

.detail-item--muted {
  opacity: 0.8;
  font-size: 0.9rem;
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

.field-error {
  display: block;
  color: #e74c3c; /* Красный цвет для ошибки */
  font-size: 0.85rem;
  margin-top: 4px;
  animation: fadeIn 0.2s ease;
}

.error-message-global {
  background-color: rgba(231, 76, 60, 0.1);
  border-left: 4px solid #e74c3c;
  color: #c0392b;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-md);
  font-size: 0.9rem;
}

.text-primary {
  color: var(--color-primary);
  font-weight: 500;
}

.form-port-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.w-50 {
  flex: 1;
  width: 50%;
}
</style>