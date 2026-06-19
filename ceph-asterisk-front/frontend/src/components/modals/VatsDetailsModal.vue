<template>
  <div v-if="show" class="modal-overlay" @dblclick.self="closeModal">
    <div class="modal-content large" @click.stop>
      <div class="modal-header">
        <div class="header-row">
          <div class="header-info">
            <h1 class="modal-title">{{ instanceDetails?.name || vatsData?.name }}</h1>
            <div class="info-badges">
              <CustomBadge :variant="statusBadgeVariant">
                {{ displayStatus }}
              </CustomBadge>
              <span class="text-gray-600">SIP порт: {{ formData.sip_port }}</span>
            </div>
          </div>
          <CustomButton variant="outline" @click="closeModal"> Назад </CustomButton>
        </div>

        <div class="header-actions">
          <CustomButton
            v-if="rawApiStatus === 'error'"
            variant="outline"
            @click="handleRestart"
            :disabled="isSaving || isRestarting"
          >
            <span v-if="isRestarting" class="button-loading">
              <span class="spinner"></span>
              Перезапуск...
            </span>
            <span v-else>Перезапустить</span>
          </CustomButton>
          <CustomButton variant="outline" @click="handleReload" :disabled="isSaving || isFormLocked">
            Обновить
          </CustomButton>
          <CustomButton
            class="delete-btn"
            variant="danger"
            @click="handleDelete"
            :disabled="isSaving || isDeleting || isFormLocked"
            title="Это действие необратимо. Будут удалены все внутренние номера и конфигурация."
          >
            <span v-if="isDeleting" class="button-loading">
              <span class="spinner"></span>
              Удаление...
            </span>
            <span v-else>Удалить ВАТС</span>
          </CustomButton>
        </div>
      </div>

      <CustomTabs v-model="currentTab" :tabs="tabs">
        <template #general>
          <div class="tab-content">
            <div v-if="rawApiStatus === 'error'" class="error-banner">
              <span class="error-icon">⚠</span>
              <span>
                ВАТС остановлена из-за ошибки. Нажмите «Перезапустить» или переведите статус в «Активна».
              </span>
            </div>
            <div v-else-if="rawApiStatus === 'creating'" class="info-banner">
              ВАТС создаётся, дождитесь завершения настройки сервера. Редактирование недоступно.
            </div>
            <div v-else-if="showSipRegistrationWarning" class="warning-banner">
              <span class="error-icon">ℹ</span>
              <span>
                ВАТС отключена — SIP-телефоны не смогут зарегистрироваться, пока статус не будет «Активна».
              </span>
            </div>
            
            <div class="card">
              <div class="general-fields">
                <div>
                  <label for="name" class="label">Название ВАТС *</label>
                  <CustomInput
                    id="name"
                    name="name"
                    v-model="formData.name"
                    placeholder="Введите название"
                    :with-icon="false"
                    :disabled="isSaving || isFormLocked"
                  />
                </div>

                <div>
                  <label for="sip_port" class="label">SIP-порт *</label>
                  <CustomInput
                    id="sip_port"
                    name="sip_port"
                    type="number"
                    v-model="formData.sip_port"
                    :with-icon="false"
                    :disabled="isSaving || isFormLocked"
                  />
                </div>

                <div>
                  <label for="status" class="label">Статус</label>
                  <CustomSelect
                    id="status"
                    name="status"
                    v-model="formData.status"
                    :options="statusOptions"
                    :disabled="isSaving || isFormLocked"
                  />
                  <p v-if="statusSelectHint" class="field-hint status-hint">{{ statusSelectHint }}</p>
                </div>
              </div>
            </div>
            <div class="tab-footer">
              <CustomButton class="save-btn" @click="handleSave" :disabled="isSaving || isFormLocked">
                <span v-if="isSaving" class="button-loading">
                  <span class="spinner"></span>
                  Сохранение...
                </span>
                <span v-else>Сохранить настройки ВАТС</span>
              </CustomButton>
            </div>
          </div>
        </template>

        <template #numbers>
          <div class="tab-content">
            <div class="card">
              <div class="flex justify-between items-center mb-4">
                <h3 class="numbers-page-header">Внутренние номера</h3>
                <CustomButton @click="startAddNumber" :hidden="showAddNumber" :disabled="isSaving || isFormLocked || loadingNumbers">
                  Добавить номер
                </CustomButton>
              </div>

              <div v-if="showSipRegistrationWarning && !isFormLocked" class="warning-banner mb-4">
                <span class="error-icon">ℹ</span>
                <span>Новые SIP-регистрации недоступны, пока ВАТС отключена.</span>
              </div>

              <div v-if="numbersError" class="error-message mb-4">
                <div class="error-content">
                  <span class="error-icon">⚠</span>
                  <span>{{ numbersError }}</span>
                </div>
                <button @click="numbersError = ''" class="error-close">×</button>
              </div>

              <div v-if="contextsError" class="field-error mb-2">{{ contextsError }}</div>

              <div v-if="showAddNumber" class="card bg-gray-50 mb-4">
                <h4 class="form-section-title">{{ editingNumberId ? 'Редактирование номера' : 'Новый внутренний номер' }}</h4>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label for="new-number" class="label">Внутренний номер *</label>
                    <CustomInput
                      id="new-number"
                      name="new-number"
                      v-model="newNumber.number"
                      placeholder="Например: 107"
                      :with-icon="false"
                      :disabled="creatingNumber || !!editingNumberId"
                    />
                    <p v-if="!editingNumberId" class="field-hint">
                      Заняты: {{ usedExtensionNumbers.length ? usedExtensionNumbers.join(', ') : 'нет' }}.
                      Рекомендуем: {{ recommendedExtension }}
                    </p>
                  </div>
                  <div>
                    <label for="new-password" class="label">
                      {{ editingNumberId ? 'Новый пароль' : 'Пароль *' }}
                    </label>
                    <CustomInput
                      id="new-password"
                      name="new-password"
                      type="password"
                      v-model="newNumber.password"
                      :placeholder="editingNumberId ? 'Оставьте пустым, чтобы не менять' : 'Автогенерация при открытии формы'"
                      :with-icon="false"
                      :disabled="creatingNumber"
                    />
                    <CustomButton
                      v-if="!editingNumberId"
                      size="sm"
                      variant="outline"
                      class="mt-1"
                      @click="newNumber.password = generatePassword()"
                      :disabled="creatingNumber"
                    >
                      Сгенерировать
                    </CustomButton>
                  </div>
                  <div>
                    <label for="new-callerid" class="label">Caller ID *</label>
                    <CustomInput 
                      id="new-callerid" 
                      name="new-callerid"
                      v-model="newNumber.callerId" 
                      placeholder="Иванов И.И." 
                      :with-icon="false"
                      :disabled="creatingNumber"
                    />
                  </div>
                  <div>
                    <label for="new-context" class="label">Тип номера</label>
                    <CustomSelect
                      id="new-context"
                      name="new-context"
                      v-model="newNumber.context"
                      :options="contextSelectOptions"
                      :disabled="creatingNumber || isLoadingContexts"
                      :placeholder="isLoadingContexts ? 'Загрузка...' : 'Выберите контекст'"
                    />
                  </div>
                  <div>
                    <label for="new-sip-transport" class="label">SIP-транспорт</label>
                    <CustomSelect
                      id="new-sip-transport"
                      name="new-sip-transport"
                      v-model="newNumber.sipTransport"
                      :options="sipTransportOptions"
                      :disabled="creatingNumber"
                    />
                  </div>
                </div>
                <div class="flex justify-end gap-2">
                  <CustomButton variant="outline" @click="cancelAddNumber" :disabled="creatingNumber">
                    Отмена
                  </CustomButton>
                  <CustomButton @click="saveNumber" :disabled="creatingNumber">
                    <span v-if="creatingNumber" class="button-loading">
                      <span class="spinner"></span>
                      {{ editingNumberId ? 'Сохранение...' : 'Создание...' }}
                    </span>
                    <span v-else>{{ editingNumberId ? 'Сохранить' : 'Добавить' }}</span>
                  </CustomButton>
                </div>
              </div>

            <InternalNumbersTable
              :numbers="formData.internalNumbers"
              :loading="loadingNumbers"
              :deleting-number-id="deletingNumberId"
              :read-only="isFormLocked"
              @delete="deleteNumber"
              @edit="startEditNumber"
              @voicemail="openVoicemail"
            />
          </div>
        </div>
      </template>

        <template #commands>
          <div class="tab-content">
            <div v-if="isCommandsDisabled" class="info-banner mb-4">
              Команды Asterisk доступны только при статусе «Активна» и запущенном контейнере.
            </div>
            <div class="card">
              <h3 class="mb-4">Выполнить команду Asterisk</h3>
              <div class="mb-4">
                <label for="command" class="label">Команда (например, `sip show peers`)</label>
                <textarea
                  id="command"
                  name="command"
                  v-model="commandText"
                  class="command-textarea"
                  rows="4"
                  placeholder="Введите команду Asterisk CLI"
                  :disabled="isSendingCommand || isCommandsDisabled"
                ></textarea>
              </div>
              <div class="flex justify-end">
                <CustomButton @click="sendCommand" :disabled="isSendingCommand || isCommandsDisabled || !commandText.trim()">
                  <span v-if="isSendingCommand" class="button-loading">
                    <span class="spinner"></span>
                    Отправка...
                  </span>
                  <span v-else>Отправить</span>
                </CustomButton>
              </div>
              <div v-if="commandResult" class="command-result mt-4">
                <div class="command-result__header">Результат:</div>
                <pre class="command-result__output">{{ commandResult }}</pre>
              </div>
              <div v-if="commandError" class="error-message mt-4">
                {{ commandError }}
              </div>
            </div>
          </div>
        </template>

        <template #queues>
          <div class="tab-content">
            <QueuesPanel
              v-if="vatsData?.id && currentTab === 'queues'"
              :instance-id="Number(vatsData.id)"
            />
          </div>
        </template>

        <template #voicemail>
          <div class="tab-content">
            <VoicemailPanel
              v-if="vatsData?.id && currentTab === 'voicemail'"
              :instance-id="Number(vatsData.id)"
              :initial-mailbox="voicemailInitialMailbox"
            />
          </div>
        </template>

        <template #constructor>
          <div class="tab-content">
            <ConstructorPanel
              v-if="vatsData?.id && currentTab === 'constructor'"
              :instance-id="Number(vatsData.id)"
            />
          </div>
        </template>
      </CustomTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, toRef } from 'vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomTabs from '@/components/UI/CustomTabs.vue'
import CustomBadge from '@/components/UI/CustomBadge.vue'
import InternalNumbersTable from '@/components/tables/InternalNumbersTable.vue'
import QueuesPanel from '@/components/vats/QueuesPanel.vue'
import VoicemailPanel from '@/components/vats/VoicemailPanel.vue'
import ConstructorPanel from '@/components/vats/ConstructorPanel.vue'
import { parseApiError } from '@/utils/parseApiError'
import { useModalEscape } from '@/composables/useModalEscape'
import { vatsApi } from '@/api/vatsApi'
import { dialplanApi } from '@/api/dialplanApi'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type {
  VatsTableItem,
  InternalNumber,
  SIPUserCreateRequest,
  SIPUserFromAPI,
  VatsInstanceFromAPI,
  TransportType
} from '@/types/vats'
import { useVatsCacheStore } from '@/stores/vatsCache'
import { generatePassword } from '@/utils/password'
import { getDefaultFirstExtension } from '@/constants/testUsers'
import {
  mapApiStatusToUi,
  mapUiStatusToApi,
  type VatsEditableStatus,
  type VatsUiStatus,
} from '@/utils/vatsStatus'

interface Props {
  show: boolean
  vatsData: VatsTableItem | null
}

interface Emits {
  (e: 'close'): void
  (e: 'updated'): void
  (e: 'deleted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToastStore()
const confirmStore = useConfirmStore()
const cacheStore = useVatsCacheStore()
const voicemailInitialMailbox = ref<string | null>(null)

const sipTransportOptions = [
  { value: 'udp', label: 'UDP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'tls', label: 'TLS' },
]

const contextSelectOptions = computed(() => {
  const options = availableContexts.value.map(ctx => ({
    value: ctx,
    label: ctx,
  }))
  if (!options.some(o => o.value === newNumber.context)) {
    options.unshift({ value: newNumber.context, label: newNumber.context })
  }
  return options
})

const EXTENSION_DRAFT_PREFIX = 'extension_draft_'
const getExtensionDraftKey = (instanceId: number) => `${EXTENSION_DRAFT_PREFIX}${instanceId}`

const usedExtensionNumbers = computed(() =>
  formData.internalNumbers.map(n => n.number).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
)

const recommendedExtension = computed(() => {
  const nums = formData.internalNumbers
    .map(n => parseInt(n.number, 10))
    .filter(n => !isNaN(n))
  if (nums.length === 0) return getDefaultFirstExtension()
  return String(Math.max(...nums) + 1)
})

const statusOptions = [
  { value: 'Активна', label: 'Активна' },
  { value: 'Отключена', label: 'Отключена' },
]

const rawApiStatus = ref('stopped')

const displayStatus = computed<VatsUiStatus>(() => mapApiStatusToUi(rawApiStatus.value))

const statusBadgeVariant = computed(() => {
  switch (displayStatus.value) {
    case 'Активна':
      return 'default'
    case 'Ошибка':
      return 'secondary'
    case 'Создаётся':
      return 'warning'
    default:
      return 'outline'
  }
})

const initialFormStatus = ref<VatsEditableStatus>('Активна')

const currentTab = ref('general')

const openVoicemail = (mailbox: string) => {
  voicemailInitialMailbox.value = mailbox
  currentTab.value = 'voicemail'
}

const isSaving = ref(false)
const isRestarting = ref(false)
const loadingNumbers = ref(false)
const creatingNumber = ref(false)
const deletingNumberId = ref<string | null>(null)
const numbersError = ref('')
const showAddNumber = ref(false)
const editingNumberId = ref<string | null>(null)
const isDeleting = ref(false)
const availableContexts = ref<string[]>([])
const isLoadingContexts = ref(false)
const contextsError = ref('')

const commandText = ref('')
const isSendingCommand = ref(false)
const commandResult = ref('')
const commandError = ref('')

const instanceDetails = ref<VatsInstanceFromAPI | null>(null)

interface ExtendedVatsForm {
  name: string
  sip_port: number
  status: VatsEditableStatus
  internalNumbers: InternalNumber[]
}

interface NewNumberForm {
  number: string
  password: string
  callerId: string
  context: string
  sipTransport: TransportType
}

const formData = reactive<ExtendedVatsForm>({
  name: '',
  sip_port: 5060,
  status: 'Активна',
  internalNumbers: [],
})

const isFormLocked = computed(() => rawApiStatus.value === 'creating')

const isCommandsDisabled = computed(
  () => rawApiStatus.value !== 'running' || isFormLocked.value || isSaving.value
)

const showSipRegistrationWarning = computed(
  () =>
    formData.status === 'Отключена' ||
    rawApiStatus.value === 'stopped' ||
    rawApiStatus.value === 'error'
)

const statusSelectHint = computed(() => {
  if (isFormLocked.value || formData.status === initialFormStatus.value) return ''
  if (formData.status === 'Отключена') {
    return 'При сохранении контейнер будет остановлен — SIP-регистрация станет недоступна.'
  }
  return 'При сохранении контейнер будет запущен.'
})

const mapApiUserToInternal = (user: SIPUserFromAPI): InternalNumber => {
  let sipTransport: TransportType = 'udp'
  if (user.transport === 'transport-tcp') sipTransport = 'tcp'
  else if (user.transport === 'transport-tls') sipTransport = 'tls'
  else sipTransport = 'udp'

  return {
    id: user.id,
    number: user.id,
    callerId: user.callerid,
    context: user.context,
    sipTransport: sipTransport,
  }
}

const newNumber = reactive<NewNumberForm>({
  number: '',
  password: '',
  callerId: '',
  context: 'from-internal',
  sipTransport: 'udp',
})

const tabs = [
  { value: 'general', label: 'Основные' },
  { value: 'numbers', label: 'Внутренние номера' },
  { value: 'queues', label: 'Очереди' },
  { value: 'voicemail', label: 'Голосовая почта' },
  { value: 'constructor', label: 'Конструктор' },
  { value: 'commands', label: 'Команды' },
]

const loadInstanceDetails = async () => {
  if (!props.vatsData?.id) return
  try {
    const details = await vatsApi.getInstanceDetails(Number(props.vatsData.id))
    instanceDetails.value = details
    rawApiStatus.value = details.status
    formData.name = details.name
    formData.sip_port = details.sip_port
    formData.status = details.status === 'running' ? 'Активна' : 'Отключена'
    initialFormStatus.value = formData.status
  } catch (error) {
    const message = parseApiError(error, 'Ошибка загрузки данных ВАТС')
    toast.addToast({ message, type: 'error' })
    numbersError.value = message
  }
}

const loadContexts = async () => {
  const instanceId = Number(instanceDetails.value?.id ?? props.vatsData?.id)
  if (!instanceId) return

  isLoadingContexts.value = true
  contextsError.value = ''
  try {
    const contexts = await dialplanApi.getContexts(instanceId)
    availableContexts.value = contexts
  } catch (error) {
    const message = parseApiError(error, 'Ошибка загрузки контекстов')
    contextsError.value = message
    toast.addToast({ message, type: 'error' })
    availableContexts.value = ['from-internal', 'from-external']
  } finally {
    isLoadingContexts.value = false
  }
}

const loadInternalNumbers = async () => {
  if (!props.vatsData?.id) return
  const instanceId = Number(props.vatsData.id)

  const cached = cacheStore.getUsers(instanceId)
  if (cached) {
    formData.internalNumbers = cached.map(mapApiUserToInternal)
    return
  }

  loadingNumbers.value = true
  numbersError.value = ''
  try {
    const users = await vatsApi.getVatsUsers(instanceId)
    cacheStore.setUsers(instanceId, users)
    formData.internalNumbers = users.map(mapApiUserToInternal)
  } catch (error) {
    const message = parseApiError(error, 'Ошибка загрузки внутренних номеров')
    toast.addToast({ message, type: 'error' })
    numbersError.value = message
  } finally {
    loadingNumbers.value = false
  }
}

const resetNewNumber = () => {
  newNumber.number = ''
  newNumber.password = ''
  newNumber.callerId = ''
  newNumber.context = 'from-internal'
  newNumber.sipTransport = 'udp'
}

const saveExtensionDraft = (instanceId: number) => {
  if (!showAddNumber.value || editingNumberId.value) return
  localStorage.setItem(
    getExtensionDraftKey(instanceId),
    JSON.stringify({ ...newNumber, showAddNumber: true })
  )
}

const loadExtensionDraft = (instanceId: number): boolean => {
  const raw = localStorage.getItem(getExtensionDraftKey(instanceId))
  if (!raw) return false
  try {
    const draft = JSON.parse(raw) as NewNumberForm & { showAddNumber?: boolean }
    newNumber.number = draft.number ?? ''
    newNumber.password = draft.password ?? ''
    newNumber.callerId = draft.callerId ?? ''
    newNumber.context = draft.context ?? 'from-internal'
    newNumber.sipTransport = draft.sipTransport ?? 'udp'
    showAddNumber.value = true
    editingNumberId.value = null
    return true
  } catch {
    localStorage.removeItem(getExtensionDraftKey(instanceId))
    return false
  }
}

const clearExtensionDraft = (instanceId: number) => {
  localStorage.removeItem(getExtensionDraftKey(instanceId))
}

const startAddNumber = () => {
  editingNumberId.value = null
  resetNewNumber()
  newNumber.password = generatePassword()
  if (!newNumber.number) {
    newNumber.number = recommendedExtension.value
  }
  showAddNumber.value = true
}

const startEditNumber = (id: string) => {
  const num = formData.internalNumbers.find(n => n.id === id)
  if (!num) return
  editingNumberId.value = id
  newNumber.number = num.number
  newNumber.password = ''
  newNumber.callerId = num.callerId
  newNumber.context = num.context
  newNumber.sipTransport = num.sipTransport
  showAddNumber.value = true
}

const cancelAddNumber = () => {
  const instanceId = Number(props.vatsData?.id)
  showAddNumber.value = false
  editingNumberId.value = null
  resetNewNumber()
  numbersError.value = ''
  if (instanceId) clearExtensionDraft(instanceId)
}

const saveNumber = async () => {
  const extension = newNumber.number.trim()
  const password = (newNumber.password ?? '').trim()
  if (!extension || !newNumber.callerId.trim()) {
    toast.addToast({ message: 'Заполните внутренний номер и Caller ID', type: 'warning' })
    return
  }
  if (!editingNumberId.value && !password) {
    toast.addToast({ message: 'Укажите пароль или нажмите «Сгенерировать»', type: 'warning' })
    return
  }

  const isDuplicate = editingNumberId.value
    ? formData.internalNumbers.some(
        n => n.number === extension && n.id !== editingNumberId.value
      )
    : usedExtensionNumbers.value.includes(extension)

  if (isDuplicate) {
    const message = `Номер ${extension} уже занят в этой ВАТС`
    numbersError.value = message
    toast.addToast({ message, type: 'warning' })
    return
  }

  if (!props.vatsData) return

  creatingNumber.value = true
  numbersError.value = ''

  try {
    const instanceId = Number(props.vatsData.id)

    if (editingNumberId.value) {
      await vatsApi.updateVatsUser(instanceId, editingNumberId.value, {
        context: newNumber.context,
        callerid: newNumber.callerId,
        transport: `transport-${newNumber.sipTransport}`,
        ...(password ? { auth: { password } } : {}),
      })
      toast.addToast({ message: 'Внутренний номер обновлён', type: 'success' })
    } else {
      const createData: SIPUserCreateRequest = {
        username: newNumber.number,
        password,
        context: newNumber.context,
        transport: newNumber.sipTransport,
        callerid: newNumber.callerId,
      }
      await vatsApi.createVatsUser(instanceId, createData)
      toast.addToast({ message: 'Внутренний номер успешно добавлен', type: 'success' })
    }

    cacheStore.invalidate(instanceId)
    await loadInternalNumbers()
    clearExtensionDraft(instanceId)
    cancelAddNumber()
  } catch (error) {
    const message = parseApiError(error, editingNumberId.value ? 'Ошибка обновления номера' : 'Ошибка создания внутреннего номера')
    numbersError.value = message
    toast.addToast({ message, type: 'error' })
  } finally {
    creatingNumber.value = false
  }
}

const deleteNumber = async (id: string) => {
  if (!props.vatsData) return
  const confirmed = await confirmStore.confirm({
    title: 'Удаление номера',
    message: 'Вы уверены, что хотите удалить этот внутренний номер?',
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return

  deletingNumberId.value = id
  numbersError.value = ''
  try {
    const instanceId = Number(props.vatsData.id)
    await vatsApi.deleteVatsUser(instanceId, id)
    formData.internalNumbers = formData.internalNumbers.filter(n => n.id !== id)
    cacheStore.invalidate(instanceId)
    toast.addToast({ message: 'Внутренний номер удалён', type: 'success' })
  } catch (error) {
    const message = parseApiError(error, 'Ошибка при удалении номера')
    numbersError.value = message
    toast.addToast({ message, type: 'error' })
  } finally {
    deletingNumberId.value = null
  }
}

const resetForm = () => {
  currentTab.value = 'general'
  voicemailInitialMailbox.value = null
  showAddNumber.value = false
  editingNumberId.value = null
  resetNewNumber()
  numbersError.value = ''
  commandResult.value = ''
  commandError.value = ''
}

watch(
  () => props.show,
  async (newVal) => {
    if (newVal && props.vatsData) {
      resetForm()
      await loadInstanceDetails()
      await loadInternalNumbers()
      await loadContexts()
      const instanceId = Number(props.vatsData.id)
      loadExtensionDraft(instanceId)
    }
  },
  { immediate: true }
)

watch(
  () => props.vatsData?.id,
  async (newId, oldId) => {
    if (!props.show || !newId || newId === oldId) return
    resetForm()
    await loadInstanceDetails()
    await loadInternalNumbers()
    await loadContexts()
    loadExtensionDraft(Number(newId))
  }
)

watch(
  () => props.vatsData?.apiStatus,
  (newStatus) => {
    if (!props.show || !newStatus || isSaving.value) return
    rawApiStatus.value = newStatus
    if (newStatus === 'running') {
      formData.status = 'Активна'
      initialFormStatus.value = 'Активна'
    } else if (newStatus === 'stopped') {
      formData.status = 'Отключена'
      initialFormStatus.value = 'Отключена'
    }
  }
)

let extensionDraftTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => ({ ...newNumber, open: showAddNumber.value, editing: editingNumberId.value }),
  () => {
    const instanceId = Number(props.vatsData?.id)
    if (!props.show || !instanceId || !showAddNumber.value || editingNumberId.value) return
    if (extensionDraftTimer) clearTimeout(extensionDraftTimer)
    extensionDraftTimer = setTimeout(() => saveExtensionDraft(instanceId), 400)
  },
  { deep: true }
)

watch(
  () => props.show,
  (val) => {
    if (!val) {
      resetForm()
    }
  }
)

const closeModal = () => {
  resetForm()
  emit('close')
}

useModalEscape(toRef(props, 'show'), closeModal)

const handleReload = async () => {
  if (!props.vatsData?.id) return
  try {
    await vatsApi.reloadInstance(Number(props.vatsData.id))
    toast.addToast({ message: 'Конфигурация ВАТС успешно перезагружена', type: 'success' })
  } catch (error) {
    const message = parseApiError(error, 'Не удалось перезагрузить конфигурацию')
    toast.addToast({ message, type: 'error' })
  }
}

const handleRestart = async () => {
  if (!props.vatsData?.id) return
  isRestarting.value = true
  try {
    await vatsApi.recreateContainer(Number(props.vatsData.id))
    await loadInstanceDetails()
    toast.addToast({ message: 'ВАТС успешно перезапущена', type: 'success' })
    emit('updated')
  } catch (error) {
    const message = parseApiError(error, 'Не удалось перезапустить ВАТС')
    toast.addToast({ message, type: 'error' })
  } finally {
    isRestarting.value = false
  }
}

const handleSave = async () => {
  if (!props.vatsData?.id) return // Защита от отсутствия данных

  if (!formData.name.trim()) {
    toast.addToast({ message: 'Введите название ВАТС', type: 'warning' })
    return
  }
  if (!formData.sip_port || formData.sip_port < 1 || formData.sip_port > 65535) {
    toast.addToast({ message: 'Введите корректный SIP-порт (от 1 до 65535)', type: 'warning' })
    return
  }

  isSaving.value = true
  const statusChanged = formData.status !== initialFormStatus.value
  try {
    await vatsApi.updateVats(props.vatsData.id, {
      name: formData.name,
      sip_port: formData.sip_port,
      status: mapUiStatusToApi(formData.status),
    })
    await loadInstanceDetails()
    initialFormStatus.value = formData.status

    let message = 'Изменения успешно сохранены'
    if (statusChanged) {
      message =
        formData.status === 'Отключена'
          ? 'ВАТС отключена. Контейнер останавливается — SIP-регистрация недоступна.'
          : 'ВАТС включена. Контейнер запускается.'
    }
    toast.addToast({ message, type: 'success' })
    emit('updated')
    closeModal()
  } catch (error) {
    const message = parseApiError(error, 'Не удалось сохранить изменения')
    toast.addToast({ message, type: 'error' })
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!props.vatsData?.id) return
  const confirmed = await confirmStore.confirm({
    title: 'Удаление ВАТС',
    message:
      'Вы уверены, что хотите удалить эту ВАТС? Все внутренние номера и настройки будут безвозвратно потеряны.',
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return

  isDeleting.value = true
  try {
    await vatsApi.deleteVats(props.vatsData.id)
    toast.addToast({ message: `ВАТС "${formData.name}" успешно удалена`, type: 'success' })
    emit('deleted')
    closeModal()
  } catch (error) {
    const message = parseApiError(error, 'Не удалось удалить ВАТС')
    toast.addToast({ message, type: 'error' })
  } finally {
    isDeleting.value = false
  }
}

const sendCommand = async () => {
  if (!commandText.value.trim()) return
  if (!props.vatsData?.name) {
    toast.addToast({ message: 'Критическая ошибка: неизвестное имя ВАТС', type: 'error' })
    return
  }
  
  isSendingCommand.value = true
  commandResult.value = ''
  commandError.value = ''
  
  try {
    const response = await vatsApi.sendCommand(props.vatsData.name, commandText.value)
    commandResult.value = response.output ?? ''
    if (!response.success) {
      commandError.value = 'Команда выполнена с ошибкой (success: false)'
    }
  } catch (error: unknown) {
    commandError.value = parseApiError(error, 'Ошибка выполнения команды Asterisk')
  } finally {
    isSendingCommand.value = false
  }
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
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content.large {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  width: 95%;
  max-width: 1100px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  margin-bottom: var(--spacing-lg);
}

.header-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.header-info {
  flex: 1;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 var(--spacing-xs) 0;
}

.info-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-md);
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
}

.tab-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.save-btn {
  color: var(--color-success);
}

.delete-section {
  margin-top: var(--spacing-lg);
}

.delete-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--spacing-md) 0;
}

.delete-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.delete-btn {
  color: var(--color-error);
}

.delete-warning {
  font-size: 0.85rem;
  color: var(--color-error);
  margin: 0;
}

/* Утилитарные классы */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.flex-1 { flex: 1; }
.gap-2 { gap: var(--spacing-sm); }
.gap-3 { gap: var(--spacing-md); }
.gap-4 { gap: var(--spacing-lg); }
.gap-6 { gap: 1.5rem; }
.mb-4 { margin-bottom: var(--spacing-md); }
.mb-6 { margin-bottom: var(--spacing-lg); }
.mt-4 { margin-top: var(--spacing-md); }
.text-gray-600 { color: var(--color-text-secondary); }
.text-center { text-align: center; }
.text-right { text-align: right; }
.py-8 { padding-top: var(--spacing-xl); padding-bottom: var(--spacing-xl); }
.tab-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}
.bg-gray-50 { background-color: var(--color-background-soft); }
.label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
  color: var(--color-heading);
}
.form-section-title {
  margin: 0 0 var(--spacing-md);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}
.field-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}
.mt-1 { margin-top: var(--spacing-xs); }
.numbers-page-header { color: var(--color-heading); }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* Ошибки */
.error-message {
  background-color: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  color: var(--color-error);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.error-content { display: flex; align-items: center; gap: var(--spacing-xs); }
.error-icon { font-size: 1.2rem; }
.error-close {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-error);
  padding: 0 var(--spacing-xs);
  line-height: 1;
}
.error-close:hover { opacity: 0.8; }

.error-banner,
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.error-banner {
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.25);
  color: var(--color-error);
}

.info-banner {
  background-color: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.25);
  color: var(--color-warning);
}

.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  background-color: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.25);
  color: var(--color-text);
}

.status-hint {
  color: var(--color-warning);
}

.general-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-width: 480px;
}

/* Кнопки и спиннер */
.button-loading { display: flex; align-items: center; gap: var(--spacing-xs); }
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Команды */
.command-textarea {
  width: 100%;
  padding: 10px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-family: monospace;
  resize: vertical;
}
.command-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}
.command-result {
  background: var(--color-background-mute);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}
.command-result__header {
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--color-heading);
}
.command-result__output {
  font-family: monospace;
  white-space: pre-wrap;
  font-size: 0.85rem;
  color: var(--color-text);
  max-height: 300px;
  overflow-y: auto;
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-content.large {
    padding: var(--spacing-md);
    margin: var(--spacing-md);
    width: calc(100% - 2 * var(--spacing-md));
    max-width: none;
    overflow-x: auto;
  }
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
  .header-row {
    align-items: stretch;
  }
  .header-actions {
    justify-content: stretch;
  }
  .header-actions .custom-button {
    flex: 1;
  }
  .info-badges {
    gap: var(--spacing-sm);
  }
}
@media (max-width: 480px) {
  .modal-content.large {
    padding: var(--spacing-sm);
    margin: var(--spacing-sm);
    width: calc(100% - 2 * var(--spacing-sm));
  }
  .info-badges {
    align-items: flex-start;
  }
}
</style>