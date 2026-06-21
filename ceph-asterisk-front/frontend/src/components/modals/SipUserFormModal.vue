<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay modal-overlay--nested" @click="handleClose">
      <div class="modal-content modal-content--wide" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditing ? 'Редактирование номера' : 'Новый внутренний номер' }}</h3>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="sip-number">Внутренний номер *</label>
              <CustomInput
                id="sip-number"
                v-model="form.number"
                placeholder="Например: 107"
                :with-icon="false"
                :disabled="saving || isEditing"
                :has-error="!!fieldErrors.number"
                @input="clearFieldError('number')"
              />
              <span v-if="fieldErrors.number" class="field-error">{{ fieldErrors.number }}</span>
              <p v-else-if="!isEditing" class="field-hint">
                Заняты: {{ usedExtensions.length ? usedExtensions.join(', ') : 'нет' }}.
                Рекомендуем: {{ recommendedExtension }}
              </p>
            </div>
            <div class="form-group">
              <label for="sip-password">
                {{ isEditing ? 'Новый пароль' : 'Пароль *' }}
              </label>
              <CustomInput
                id="sip-password"
                type="password"
                v-model="form.password"
                :placeholder="isEditing ? 'Оставьте пустым, чтобы не менять' : 'Автогенерация при открытии'"
                :with-icon="false"
                :disabled="saving"
                :has-error="!!fieldErrors.password"
                @input="clearFieldError('password')"
              />
              <span v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</span>
              <CustomButton
                v-if="!isEditing"
                size="sm"
                variant="outline"
                class="mt-1"
                @click="form.password = generatePassword()"
                :disabled="saving"
              >
                Сгенерировать
              </CustomButton>
            </div>
            <div class="form-group">
              <label for="sip-callerid">Caller ID *</label>
              <CustomInput
                id="sip-callerid"
                v-model="form.callerId"
                placeholder="Иванов И.И."
                :with-icon="false"
                :disabled="saving"
                :has-error="!!fieldErrors.callerId"
                @input="clearFieldError('callerId')"
              />
              <span v-if="fieldErrors.callerId" class="field-error">{{ fieldErrors.callerId }}</span>
            </div>
            <div class="form-group">
              <label for="sip-context">Контекст</label>
              <CustomSelect
                id="sip-context"
                v-model="form.context"
                :options="contextOptions"
                :disabled="saving || isLoadingContexts"
                :placeholder="isLoadingContexts ? 'Загрузка...' : 'Выберите контекст'"
              />
            </div>
            <div class="form-group">
              <label for="sip-transport">SIP-транспорт</label>
              <CustomSelect
                id="sip-transport"
                v-model="form.sipTransport"
                :options="sipTransportOptions"
                :disabled="saving"
              />
            </div>
          </div>

          <div class="feature-checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.autoRoutingEnabled" :disabled="saving" />
              <span>Автоматическая маршрутизация</span>
            </label>
            <p class="field-hint checkbox-hint">
              Создавать правила звонков в диалплане (Dial, голосовая почта при неответе).
            </p>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.forwardingEnabled" :disabled="saving" />
              <span>Переадресация звонков</span>
            </label>
            <p class="field-hint checkbox-hint">
              Включить настройку CFU / CFNA / CFB. После сохранения настройте правила ниже (при редактировании).
            </p>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.dndEnabled" :disabled="saving" />
              <span>Не беспокоить (DND)</span>
            </label>
            <p class="field-hint checkbox-hint">
              Входящие звонки на номер сразу уходят на голосовую почту или сигнал «занято».
            </p>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.callRecordingEnabled" :disabled="saving" />
              <span>Запись разговоров</span>
            </label>
            <p class="field-hint checkbox-hint">
              Добавляет MixMonitor в автогенерируемый диалплан для этого номера.
            </p>
            <div class="form-group">
              <label class="label">Музыка на удержании (MOH)</label>
              <CustomSelect
                v-model="form.mohClass"
                :options="mohClassOptions"
                placeholder="По умолчанию"
                :disabled="saving"
              />
            </div>
          </div>

          <ForwardingForm
            v-if="isEditing && form.forwardingEnabled"
            :instance-id="instanceId"
            :extension="editingId!"
          />
        </div>
        <div class="modal-footer">
          <CustomButton variant="outline" @click="handleClose" :disabled="saving">Отмена</CustomButton>
          <CustomButton @click="save" :disabled="saving">
            <span v-if="saving" class="button-loading">
              <span class="spinner"></span>
              {{ isEditing ? 'Сохранение...' : 'Создание...' }}
            </span>
            <span v-else>{{ isEditing ? 'Сохранить' : 'Добавить' }}</span>
          </CustomButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, toRef } from 'vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import ForwardingForm from '@/components/vats/ForwardingForm.vue'
import { vatsApi } from '@/api/vatsApi'
import type { InternalNumber, SIPUserCreateRequest, TransportType } from '@/types/vats'
import { useToastStore } from '@/stores/toast'
import { parseApiError } from '@/utils/parseApiError'
import { generatePassword } from '@/utils/password'
import { useModalOverlay } from '@/composables/useModalOverlay'
import { useVatsCacheStore } from '@/stores/vatsCache'

interface SipUserFormState {
  number: string
  password: string
  callerId: string
  context: string
  sipTransport: TransportType
  autoRoutingEnabled: boolean
  forwardingEnabled: boolean
  dndEnabled: boolean
  callRecordingEnabled: boolean
  mohClass: string
}

const props = defineProps<{
  show: boolean
  instanceId: number
  editingId?: string | null
  initialData?: InternalNumber | null
  usedExtensions: string[]
  recommendedExtension: string
  contextOptions: { value: string; label: string }[]
  isLoadingContexts?: boolean
  mohClassOptions: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const toast = useToastStore()
const cacheStore = useVatsCacheStore()
const saving = ref(false)
const fieldErrors = ref<Record<string, string>>({})

const sipTransportOptions = [
  { value: 'udp', label: 'UDP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'tls', label: 'TLS' },
]

const isEditing = computed(() => !!props.editingId)

const EXTENSION_DRAFT_PREFIX = 'extension_draft_'
const getExtensionDraftKey = (instanceId: number) => `${EXTENSION_DRAFT_PREFIX}${instanceId}`

const defaultForm = (): SipUserFormState => ({
  number: '',
  password: '',
  callerId: '',
  context: 'from-internal',
  sipTransport: 'udp',
  autoRoutingEnabled: true,
  forwardingEnabled: false,
  dndEnabled: false,
  callRecordingEnabled: false,
  mohClass: '',
})

const form = reactive<SipUserFormState>(defaultForm())

const clearFieldErrors = () => {
  fieldErrors.value = {}
}

const clearFieldError = (field: string) => {
  if (fieldErrors.value[field]) {
    const next = { ...fieldErrors.value }
    delete next[field]
    fieldErrors.value = next
  }
}

const fillFromInitial = (data: InternalNumber | null | undefined) => {
  clearFieldErrors()
  if (data) {
    form.number = data.number
    form.password = ''
    form.callerId = data.callerId
    form.context = data.context
    form.sipTransport = data.sipTransport
    form.autoRoutingEnabled = data.autoRoutingEnabled ?? true
    form.forwardingEnabled = data.forwardingEnabled ?? false
    form.dndEnabled = data.dndEnabled ?? false
    form.callRecordingEnabled = data.callRecordingEnabled ?? false
    form.mohClass = data.mohClass ?? ''
    return
  }
  Object.assign(form, defaultForm())
  form.password = generatePassword()
  form.number = props.recommendedExtension
}

const saveExtensionDraft = () => {
  if (isEditing.value || !props.show) return
  localStorage.setItem(getExtensionDraftKey(props.instanceId), JSON.stringify({ ...form }))
}

const loadExtensionDraft = (): boolean => {
  const raw = localStorage.getItem(getExtensionDraftKey(props.instanceId))
  if (!raw) return false
  try {
    const draft = JSON.parse(raw) as SipUserFormState
    Object.assign(form, { ...defaultForm(), ...draft })
    return true
  } catch {
    localStorage.removeItem(getExtensionDraftKey(props.instanceId))
    return false
  }
}

const clearExtensionDraft = () => {
  localStorage.removeItem(getExtensionDraftKey(props.instanceId))
}

watch(
  () => [props.show, props.editingId, props.initialData] as const,
  ([show, editingId, initialData]) => {
    if (!show) return
    if (editingId && initialData) {
      fillFromInitial(initialData)
      return
    }
    Object.assign(form, defaultForm())
    if (!loadExtensionDraft()) {
      form.password = generatePassword()
      form.number = props.recommendedExtension
    }
  }
)

let draftTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => ({ ...form, open: props.show, editing: isEditing.value }),
  () => {
    if (!props.show || isEditing.value) return
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = setTimeout(saveExtensionDraft, 400)
  },
  { deep: true }
)

const handleClose = () => {
  if (saving.value) return
  emit('close')
}

useModalOverlay(toRef(props, 'show'), handleClose)

const validateForm = (): boolean => {
  clearFieldErrors()
  let valid = true
  const extension = form.number.trim()
  const password = form.password.trim()

  if (!extension) {
    fieldErrors.value.number = 'Укажите внутренний номер'
    valid = false
  }
  if (!form.callerId.trim()) {
    fieldErrors.value.callerId = 'Укажите Caller ID'
    valid = false
  }
  if (!isEditing.value && !password) {
    fieldErrors.value.password = 'Укажите пароль или нажмите «Сгенерировать»'
    valid = false
  }

  const isDuplicate = isEditing.value
    ? props.usedExtensions.includes(extension) && extension !== props.editingId
    : props.usedExtensions.includes(extension)

  if (extension && isDuplicate) {
    fieldErrors.value.number = `Номер ${extension} уже занят в этой ВАТС`
    valid = false
  }

  if (!valid) {
    toast.addToast({ message: 'Заполните обязательные поля', type: 'warning' })
  }
  return valid
}

const mapApiErrorToFields = (msg: string) => {
  const lower = msg.toLowerCase()
  if (lower.includes('user already') || lower.includes('уже существует') || lower.includes('номер')) {
    fieldErrors.value.number = msg
  } else if (lower.includes('password') || lower.includes('парол')) {
    fieldErrors.value.password = msg
  } else if (lower.includes('caller')) {
    fieldErrors.value.callerId = msg
  }
}

const save = async () => {
  if (!validateForm()) return

  saving.value = true
  try {
    if (isEditing.value && props.editingId) {
      const password = form.password.trim()
      await vatsApi.updateVatsUser(props.instanceId, props.editingId, {
        context: form.context,
        callerid: form.callerId,
        transport: `transport-${form.sipTransport}`,
        auto_routing_enabled: form.autoRoutingEnabled,
        forwarding_enabled: form.forwardingEnabled,
        dnd_enabled: form.dndEnabled,
        call_recording_enabled: form.callRecordingEnabled,
        moh_class: form.mohClass || null,
        ...(password ? { auth: { password } } : {}),
      })
      toast.addToast({ message: 'Внутренний номер обновлён', type: 'success' })
    } else {
      const createData: SIPUserCreateRequest = {
        username: form.number.trim(),
        password: form.password.trim(),
        context: form.context,
        transport: form.sipTransport,
        callerid: form.callerId.trim(),
        auto_routing_enabled: form.autoRoutingEnabled,
        forwarding_enabled: form.forwardingEnabled,
        dnd_enabled: form.dndEnabled,
        call_recording_enabled: form.callRecordingEnabled,
        moh_class: form.mohClass || null,
      }
      await vatsApi.createVatsUser(props.instanceId, createData)
      toast.addToast({ message: 'Внутренний номер успешно добавлен', type: 'success' })
    }

    cacheStore.invalidate(props.instanceId)
    clearExtensionDraft()
    emit('saved')
    emit('close')
  } catch (error) {
    const msg = parseApiError(
      error,
      isEditing.value ? 'Ошибка обновления номера' : 'Ошибка создания внутреннего номера'
    )
    mapApiErrorToFields(msg)
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-content--wide {
  width: min(720px, 100%);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.form-group {
  margin-bottom: 0;
}
.form-group :deep(.input-container) {
  margin-bottom: 0;
}
.field-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}
.checkbox-hint {
  margin: 0 0 var(--spacing-sm) 1.5rem;
}
.feature-checkboxes {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-xs);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}
.button-loading {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.mt-1 {
  margin-top: var(--spacing-xs);
}
@media (max-width: 480px) {
  .modal-footer {
    flex-direction: column-reverse;
  }
}
</style>
