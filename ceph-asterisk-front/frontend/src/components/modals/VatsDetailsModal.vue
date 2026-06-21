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
          <CustomButton
            variant="outline"
            @click="handleReload"
            :disabled="isSaving || isFormLocked || isRefreshing"
          >
            <span v-if="isRefreshing" class="button-loading">
              <span class="spinner"></span>
              Обновление...
            </span>
            <span v-else>Обновить</span>
          </CustomButton>
          <CustomButton
            class="delete-btn"
            variant="danger"
            @click="handleDelete"
            :disabled="isSaving || isDeleting"
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

      <CustomTabs v-model="currentTab" :tabs="tabs" bordered>
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

            <div class="card mt-4">
              <h3 class="mb-2">Шаблон типового сценария</h3>
              <p class="field-hint mb-4">
                Применить готовую конфигурацию: номера, очереди, переадресация, маршрутизация.
              </p>
              <div class="template-apply-row">
                <CustomSelect
                  v-model="selectedTemplateId"
                  :options="templateOptions"
                  label="Шаблон"
                  placeholder="Выберите шаблон"
                  :disabled="applyingTemplate || isFormLocked"
                />
                <CustomButton
                  variant="outline"
                  @click="handleApplyTemplate"
                  :disabled="!selectedTemplateId || applyingTemplate || isFormLocked"
                >
                  {{ applyingTemplate ? 'Применение...' : 'Применить шаблон' }}
                </CustomButton>
              </div>
              <ul v-if="selectedTemplatePreview.length" class="template-preview">
                <li v-for="item in selectedTemplatePreview" :key="item">{{ item }}</li>
              </ul>
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
                <CustomButton @click="openSipUserModal" :disabled="isSaving || isFormLocked || loadingNumbers || showSipUserModal">
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

            <InternalNumbersTable
              :numbers="formData.internalNumbers"
              :loading="loadingNumbers"
              :deleting-number-id="deletingNumberId"
              :read-only="isFormLocked"
              @delete="deleteNumber"
              @edit="openEditSipUserModal"
              @voicemail="openVoicemail"
            />
          </div>

          <SipUserFormModal
            :show="showSipUserModal"
            :instance-id="Number(vatsData?.id ?? 0)"
            :editing-id="editingSipUserId"
            :initial-data="editingSipUserData"
            :used-extensions="usedExtensionNumbers"
            :recommended-extension="recommendedExtension"
            :context-options="contextSelectOptions"
            :is-loading-contexts="isLoadingContexts"
            :moh-class-options="mohClassOptions"
            @close="closeSipUserModal"
            @saved="onSipUserSaved"
          />
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
                <label for="command" class="label">Команда (например, `pjsip show endpoints`)</label>
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

        <template #incoming>
          <div class="tab-content">
            <IncomingRoutesPanel
              v-if="vatsData?.id && currentTab === 'incoming'"
              :key="`incoming-${dataRefreshKey}`"
              :instance-id="Number(vatsData.id)"
            />
          </div>
        </template>

        <template #feature-codes>
          <div class="tab-content">
            <FeatureCodesPanel
              v-if="vatsData?.id && currentTab === 'feature-codes'"
              :key="`feature-codes-${dataRefreshKey}`"
              :instance-id="Number(vatsData.id)"
            />
          </div>
        </template>

        <template #queues>
          <div class="tab-content">
            <QueuesPanel
              v-if="vatsData?.id && currentTab === 'queues'"
              :key="`queues-${dataRefreshKey}`"
              :instance-id="Number(vatsData.id)"
            />
          </div>
        </template>

        <template #voicemail>
          <div class="tab-content">
            <VoicemailPanel
              v-if="vatsData?.id && currentTab === 'voicemail'"
              :key="`voicemail-${dataRefreshKey}`"
              :instance-id="Number(vatsData.id)"
              :initial-mailbox="voicemailInitialMailbox"
            />
          </div>
        </template>

        <template #constructor>
          <div class="tab-content">
            <p class="field-hint mb-4">
              Редактор диалплана для опытных администраторов. Бизнес-настройки (номера, переадресация, шаблоны) управляются на других вкладках.
            </p>
            <ConstructorPanel
              v-if="vatsData?.id && currentTab === 'constructor'"
              :key="`constructor-${dataRefreshKey}`"
              :instance-id="Number(vatsData.id)"
              @contexts-changed="loadContexts"
            />
          </div>
        </template>
      </CustomTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, toRef } from 'vue'
import axios from 'axios'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomTabs from '@/components/UI/CustomTabs.vue'
import CustomBadge from '@/components/UI/CustomBadge.vue'
import InternalNumbersTable from '@/components/tables/InternalNumbersTable.vue'
import QueuesPanel from '@/components/vats/QueuesPanel.vue'
import VoicemailPanel from '@/components/vats/VoicemailPanel.vue'
import IncomingRoutesPanel from '@/components/vats/IncomingRoutesPanel.vue'
import FeatureCodesPanel from '@/components/vats/FeatureCodesPanel.vue'
import ConstructorPanel from '@/components/vats/ConstructorPanel.vue'
import SipUserFormModal from '@/components/modals/SipUserFormModal.vue'
import { audioApi } from '@/api/audioApi'
import { templatesApi } from '@/api/templatesApi'
import { buildMohClassOptions } from '@/utils/audioSelectOptions'
import type { TemplateInfo } from '@/types/templates'
import { parseApiError } from '@/utils/parseApiError'
import { useModalOverlay } from '@/composables/useModalOverlay'
import { vatsApi } from '@/api/vatsApi'
import { dialplanApi } from '@/api/dialplanApi'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type {
  VatsTableItem,
  InternalNumber,
  SIPUserFromAPI,
  VatsInstanceFromAPI,
  TransportType,
} from '@/types/vats'
import { useVatsCacheStore } from '@/stores/vatsCache'
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

const contextSelectOptions = computed(() =>
  availableContexts.value.map((ctx) => ({ value: ctx, label: ctx }))
)

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
const deletingNumberId = ref<string | null>(null)
const numbersError = ref('')
const showSipUserModal = ref(false)
const editingSipUserId = ref<string | null>(null)
const editingSipUserData = ref<InternalNumber | null>(null)
const isDeleting = ref(false)
const isRefreshing = ref(false)
const dataRefreshKey = ref(0)
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

const mohClassOptions = ref<{ value: string; label: string }[]>([
  { value: '', label: 'По умолчанию (default)' },
])

const loadMohClassOptions = async () => {
  try {
    const files = await audioApi.getFiles({ includeBuiltin: true })
    mohClassOptions.value = buildMohClassOptions(files)
  } catch {
    mohClassOptions.value = [{ value: '', label: 'По умолчанию (default)' }]
  }
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
    autoRoutingEnabled: user.auto_routing_enabled ?? true,
    forwardingEnabled: user.forwarding_enabled ?? false,
    dndEnabled: user.dnd_enabled ?? false,
    callRecordingEnabled: user.call_recording_enabled ?? false,
    mohClass: user.moh_class ?? '',
    routingStatus: user.routing_status ?? '',
  }
}

const tabs = [
  { value: 'general', label: 'Основные' },
  { value: 'numbers', label: 'Внутренние номера' },
  { value: 'incoming', label: 'Входящие' },
  { value: 'feature-codes', label: 'Короткие коды' },
  { value: 'queues', label: 'Очереди' },
  { value: 'voicemail', label: 'Голосовая почта' },
  { value: 'constructor', label: 'Маршрутизация (расширенная)' },
  { value: 'commands', label: 'Команды' },
]

const templatesCatalog = ref<TemplateInfo[]>([])
const selectedTemplateId = ref<string | null>(null)
const applyingTemplate = ref(false)

const templateOptions = computed(() =>
  templatesCatalog.value.map(t => ({ value: t.id, label: t.name }))
)

const selectedTemplatePreview = computed(() => {
  if (!selectedTemplateId.value) return []
  const template = templatesCatalog.value.find(t => t.id === selectedTemplateId.value)
  return template?.preview_items ?? []
})

const loadTemplatesCatalog = async () => {
  try {
    templatesCatalog.value = await templatesApi.getCatalog()
  } catch (error) {
    toast.addToast({
      message: parseApiError(error, 'Ошибка загрузки шаблонов'),
      type: 'error',
    })
  }
}

const handleApplyTemplate = async () => {
  if (!props.vatsData?.id || !selectedTemplateId.value) return
  applyingTemplate.value = true
  try {
    const result = await templatesApi.applyTemplate(Number(props.vatsData.id), {
      template_id: selectedTemplateId.value,
      change_author: 'ui',
      reload_asterisk: rawApiStatus.value === 'running',
    })
    toast.addToast({ message: result.message, type: 'success' })
    cacheStore.invalidate(Number(props.vatsData.id))
    await loadInternalNumbers()
  } catch (error) {
    toast.addToast({
      message: parseApiError(error, 'Ошибка применения шаблона'),
      type: 'error',
    })
  } finally {
    applyingTemplate.value = false
  }
}

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

const loadInternalNumbers = async (options?: { force?: boolean }) => {
  if (!props.vatsData?.id) return
  const instanceId = Number(props.vatsData.id)

  if (!options?.force) {
    const cached = cacheStore.getUsers(instanceId)
    if (cached) {
      formData.internalNumbers = cached.map(mapApiUserToInternal)
      return
    }
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

const openSipUserModal = async () => {
  await loadContexts()
  editingSipUserId.value = null
  editingSipUserData.value = null
  showSipUserModal.value = true
}

const openEditSipUserModal = async (id: string) => {
  const num = formData.internalNumbers.find((n) => n.id === id)
  if (!num) return
  await loadContexts()
  editingSipUserId.value = id
  editingSipUserData.value = num
  showSipUserModal.value = true
}

const closeSipUserModal = () => {
  showSipUserModal.value = false
  editingSipUserId.value = null
  editingSipUserData.value = null
}

const onSipUserSaved = async () => {
  await loadInternalNumbers()
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
  closeSipUserModal()
  numbersError.value = ''
  commandResult.value = ''
  commandError.value = ''
  dataRefreshKey.value = 0
}

watch(
  () => props.show,
  async (newVal) => {
    if (newVal && props.vatsData) {
      resetForm()
      await refreshAllModalData()
      const instanceId = Number(props.vatsData.id)
      if (localStorage.getItem(`extension_draft_${instanceId}`)) {
        openSipUserModal()
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.vatsData?.id,
  async (newId, oldId) => {
    if (!props.show || !newId || newId === oldId) return
    resetForm()
    await refreshAllModalData()
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

watch(
  () => props.show,
  (val) => {
    if (!val) {
      resetForm()
    }
  }
)

const reloadTabData = async (tab: string) => {
  if (!props.show || !props.vatsData?.id) return

  switch (tab) {
    case 'general':
      await loadInstanceDetails()
      await loadMohClassOptions()
      break
    case 'numbers':
      await Promise.all([loadContexts(), loadInternalNumbers({ force: true })])
      await loadMohClassOptions()
      break
    case 'constructor':
      await loadContexts()
      break
    default:
      break
  }
}

const refreshAllModalData = async () => {
  if (!props.vatsData?.id) return

  cacheStore.invalidate(Number(props.vatsData.id))
  numbersError.value = ''
  contextsError.value = ''
  commandResult.value = ''
  commandError.value = ''

  await Promise.all([
    loadInstanceDetails(),
    loadContexts(),
    loadInternalNumbers({ force: true }),
    loadTemplatesCatalog(),
    loadMohClassOptions(),
  ])
  dataRefreshKey.value += 1
}

watch(currentTab, async (tab) => {
  await reloadTabData(tab)
})

const closeModal = () => {
  resetForm()
  emit('close')
}

useModalOverlay(toRef(props, 'show'), closeModal)

const handleReload = async () => {
  if (!props.vatsData?.id || isRefreshing.value) return
  isRefreshing.value = true
  try {
    await refreshAllModalData()
    toast.addToast({ message: 'Данные ВАТС и конфигурация обновлены', type: 'success' })
  } catch (error) {
    const message = parseApiError(error, 'Не удалось обновить данные ВАТС')
    toast.addToast({ message, type: 'error' })
  } finally {
    isRefreshing.value = false
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
    toast.addToast({ message: `ВАТС "${formData.name}" удалена`, type: 'success' })
    emit('deleted')
    closeModal()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      toast.addToast({
        message: 'ВАТС уже удалена или отсутствует в системе. Список будет обновлён.',
        type: 'info',
      })
      emit('deleted')
      closeModal()
      return
    }
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
  width: min(1100px, 100%);
  max-height: min(90vh, 100%);
  overflow-y: auto;
  overscroll-behavior: contain;
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
.feature-checkboxes {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
}
.checkbox-hint {
  margin: 0 0 var(--spacing-sm) 1.5rem;
}
.template-apply-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  flex-wrap: wrap;
}
.template-preview {
  margin: var(--spacing-md) 0 0;
  padding-left: 1.25rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
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