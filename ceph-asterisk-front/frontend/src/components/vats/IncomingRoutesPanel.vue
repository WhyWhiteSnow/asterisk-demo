<template>
  <div class="incoming-panel">
    <div class="panel-toolbar">
      <CustomButton variant="outline" @click="loadRoutes" :disabled="loading">
        Обновить
      </CustomButton>
      <CustomButton @click="openCreateModal">+ Добавить маршрут</CustomButton>
    </div>

    <p class="panel-hint">
      Маршрутизация входящих DID в контексте Asterisk. Правила автоматически попадают в extensions.conf.
    </p>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner large"></div>
      <p>Загрузка маршрутов...</p>
    </div>
    <div v-else-if="routes.length === 0" class="empty-state">
      <p>Нет входящих маршрутов</p>
      <CustomButton @click="openCreateModal">Создать первый маршрут</CustomButton>
    </div>
    <div v-else class="table-container">
      <table class="routes-table">
        <thead>
          <tr>
            <th>DID</th>
            <th>Контекст</th>
            <th>Назначение</th>
            <th>Описание</th>
            <th>Статус</th>
            <th style="width: 150px">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="route in routes" :key="route.id">
            <td>{{ route.did }}</td>
            <td>{{ route.context }}</td>
            <td>{{ destinationLabel(route) }}</td>
            <td>{{ route.description || '—' }}</td>
            <td>
              <CustomBadge :variant="route.enabled ? 'default' : 'outline'">
                {{ route.enabled ? 'Вкл' : 'Выкл' }}
              </CustomBadge>
            </td>
            <td class="actions">
              <CustomButton size="sm" variant="outline" @click="openEditModal(route)">
                Редактировать
              </CustomButton>
              <CustomButton size="sm" variant="danger" @click="confirmDelete(route)">
                Удалить
              </CustomButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click="showModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>{{ editingRoute ? 'Редактирование маршрута' : 'Новый входящий маршрут' }}</h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>DID / номер *</label>
              <CustomInput v-model="form.did" placeholder="777 или +74951234567" :with-icon="false" />
            </div>
            <div class="form-group">
              <label>Контекст</label>
              <CustomSelect v-model="form.context" :options="contextOptions" />
            </div>
            <div class="form-group">
              <label>Тип назначения</label>
              <CustomSelect v-model="form.destination_type" :options="destinationTypeOptions" />
            </div>
            <div class="form-group">
              <label>{{ destinationValueLabel }}</label>
              <CustomSelect
                v-if="showDestinationSelect"
                v-model="form.destination_value"
                :options="destinationValueOptions"
                placeholder="Выберите..."
              />
              <CustomInput
                v-else
                v-model="form.destination_value"
                :placeholder="destinationValuePlaceholder"
                :with-icon="false"
              />
            </div>
            <div class="form-group">
              <label>Описание</label>
              <CustomInput v-model="form.description" placeholder="Комментарий" :with-icon="false" />
            </div>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.enabled" />
              <span>Маршрут активен</span>
            </label>
          </div>
          <div class="modal-footer">
            <CustomButton variant="outline" @click="showModal = false">Отмена</CustomButton>
            <CustomButton @click="saveRoute" :disabled="saving">Сохранить</CustomButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomBadge from '@/components/UI/CustomBadge.vue'
import { incomingRoutesApi } from '@/api/businessSettingsApi'
import { vatsApi } from '@/api/vatsApi'
import { queuesApi } from '@/api/queuesApi'
import type {
  IncomingRoute,
  IncomingRouteCreate,
  IncomingDestinationType,
} from '@/types/incomingRoutes'
import {
  INCOMING_CONTEXT_OPTIONS,
  INCOMING_DESTINATION_OPTIONS,
} from '@/types/incomingRoutes'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { parseApiError } from '@/utils/parseApiError'
import { useModalEscape } from '@/composables/useModalEscape'

const props = defineProps<{ instanceId: number }>()

const toast = useToastStore()
const confirmStore = useConfirmStore()
const routes = ref<IncomingRoute[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const showModal = ref(false)
useModalEscape(showModal, () => { showModal.value = false })
const editingRoute = ref<IncomingRoute | null>(null)
const sipExtensions = ref<string[]>([])
const queueNames = ref<string[]>([])

const contextOptions = INCOMING_CONTEXT_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}))
const destinationTypeOptions = INCOMING_DESTINATION_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}))

const form = ref<IncomingRouteCreate>({
  did: '',
  context: 'from-external',
  destination_type: 'extension',
  destination_value: '',
  description: '',
  enabled: true,
})

const destinationValueLabel = computed(() => {
  switch (form.value.destination_type) {
    case 'extension': return 'Внутренний номер'
    case 'queue': return 'Очередь'
    case 'voicemail': return 'Ящик голосовой почты'
    case 'ivr': return 'Аудиофайл (без расширения)'
    default: return 'Значение'
  }
})

const destinationValuePlaceholder = computed(() => {
  switch (form.value.destination_type) {
    case 'voicemail': return '101 или 101@default'
    case 'ivr': return 'welcome'
    default: return ''
  }
})

const showDestinationSelect = computed(
  () => form.value.destination_type === 'extension' || form.value.destination_type === 'queue'
)

const destinationValueOptions = computed(() => {
  if (form.value.destination_type === 'extension') {
    return sipExtensions.value.map((ext) => ({ value: ext, label: ext }))
  }
  if (form.value.destination_type === 'queue') {
    return queueNames.value.map((name) => ({ value: name, label: name }))
  }
  return []
})

const destinationLabel = (route: IncomingRoute): string => {
  const type = INCOMING_DESTINATION_OPTIONS.find((item) => item.value === route.destination_type)
  return `${type?.label ?? route.destination_type}: ${route.destination_value}`
}

const loadResources = async () => {
  try {
    const [users, queues] = await Promise.all([
      vatsApi.getVatsUsers(props.instanceId),
      queuesApi.getQueues(props.instanceId),
    ])
    sipExtensions.value = users.map((user) => user.id)
    queueNames.value = queues.map((queue) => queue.name)
  } catch {
    sipExtensions.value = []
    queueNames.value = []
  }
}

const loadRoutes = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    routes.value = await incomingRoutesApi.getRoutes(props.instanceId)
  } catch (err: unknown) {
    errorMessage.value = parseApiError(err, 'Ошибка загрузки маршрутов')
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingRoute.value = null
  form.value = {
    did: '',
    context: 'from-external',
    destination_type: 'extension',
    destination_value: sipExtensions.value[0] ?? '',
    description: '',
    enabled: true,
  }
  showModal.value = true
}

const openEditModal = (route: IncomingRoute) => {
  editingRoute.value = route
  form.value = {
    did: route.did,
    context: route.context,
    destination_type: route.destination_type,
    destination_value: route.destination_value,
    description: route.description ?? '',
    enabled: route.enabled,
  }
  showModal.value = true
}

const saveRoute = async () => {
  if (!form.value.did.trim() || !form.value.destination_value.trim()) {
    toast.addToast({ message: 'Заполните DID и назначение', type: 'warning' })
    return
  }
  saving.value = true
  try {
    if (editingRoute.value) {
      await incomingRoutesApi.updateRoute(props.instanceId, editingRoute.value.id, form.value)
      toast.addToast({ message: 'Маршрут обновлён', type: 'success' })
    } else {
      await incomingRoutesApi.createRoute(props.instanceId, form.value)
      toast.addToast({ message: 'Маршрут создан', type: 'success' })
    }
    showModal.value = false
    await loadRoutes()
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка сохранения'), type: 'error' })
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (route: IncomingRoute) => {
  const confirmed = await confirmStore.confirm({
    title: 'Удаление маршрута',
    message: `Удалить маршрут DID "${route.did}"?`,
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await incomingRoutesApi.deleteRoute(props.instanceId, route.id)
    toast.addToast({ message: 'Маршрут удалён', type: 'success' })
    await loadRoutes()
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка удаления'), type: 'error' })
  }
}

watch(
  () => form.value.destination_type,
  (type: IncomingDestinationType) => {
    if (type === 'extension' && sipExtensions.value.length > 0) {
      form.value.destination_value = sipExtensions.value[0] ?? ''
    } else if (type === 'queue' && queueNames.value.length > 0) {
      form.value.destination_value = queueNames.value[0] ?? ''
    } else if (type === 'ivr') {
      form.value.destination_value = 'welcome'
    }
  }
)

onMounted(() => {
  loadResources()
  loadRoutes()
})

watch(() => props.instanceId, () => {
  routes.value = []
  loadResources()
  loadRoutes()
})
</script>

<style scoped>
.incoming-panel { width: 100%; }
.panel-toolbar { display: flex; gap: var(--spacing-md); justify-content: flex-end; margin-bottom: var(--spacing-md); }
.panel-hint { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: var(--spacing-md); }
.table-container { overflow-x: auto; }
.routes-table { width: 100%; border-collapse: collapse; }
.routes-table th, .routes-table td { padding: var(--spacing-sm); border-bottom: 1px solid var(--color-border); text-align: left; }
.actions { display: flex; gap: var(--spacing-xs); }
.error-message { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; padding: var(--spacing-sm); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); }
.loading-state, .empty-state { text-align: center; padding: var(--spacing-xl); }
.spinner.large { width: 2rem; height: 2rem; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto var(--spacing-md); }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: calc(var(--z-modal) + 10); }
.modal-content { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--spacing-lg); width: 90%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.modal-header { margin-bottom: var(--spacing-md); }
.modal-body { margin-bottom: var(--spacing-md); }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
.form-group { margin-bottom: var(--spacing-md); }
.checkbox-label { display: flex; align-items: center; gap: var(--spacing-xs); font-size: 0.9rem; }
</style>
