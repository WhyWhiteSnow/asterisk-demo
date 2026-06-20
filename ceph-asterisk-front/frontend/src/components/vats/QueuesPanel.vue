<template>
  <div class="queues-panel">
    <div class="panel-toolbar">
      <CustomButton variant="outline" @click="loadQueues" :disabled="loading">
        Обновить
      </CustomButton>
      <CustomButton @click="openCreateModal">
        + Создать очередь
      </CustomButton>
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner large"></div>
      <p>Загрузка очередей...</p>
    </div>
    <div v-else-if="queues.length === 0" class="empty-state">
      <p>Нет созданных очередей</p>
      <CustomButton @click="openCreateModal">Создать первую очередь</CustomButton>
    </div>
    <div v-else class="table-container">
      <table class="queues-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Стратегия</th>
            <th>Таймаут</th>
            <th>Повторы</th>
            <th>Музыка</th>
            <th>Участники</th>
            <th style="width: 150px">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="queue in queues" :key="queue.name">
            <td>{{ queue.name }}</td>
            <td>{{ queue.strategy || '—' }}</td>
            <td>{{ queue.timeout || '—' }}</td>
            <td>{{ queue.retry || '—' }}</td>
            <td>{{ queue.musicclass || '—' }}</td>
            <td>{{ (queue.members || []).join(', ') || '—' }}</td>
            <td class="actions">
              <CustomButton size="sm" variant="outline" @click="openEditModal(queue)">
                Редактировать
              </CustomButton>
              <CustomButton size="sm" variant="danger" @click="confirmDelete(queue)">
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
            <h3>{{ editingQueue ? 'Редактирование очереди' : 'Создание очереди' }}</h3>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Название *</label>
              <CustomInput v-model="form.name" :disabled="!!editingQueue" placeholder="queue_name" :with-icon="false" />
              <small v-if="editingQueue">Название нельзя изменить при редактировании</small>
            </div>
            <div class="form-group">
              <label>Стратегия</label>
              <CustomSelect v-model="form.strategy" :options="strategyOptions" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Таймаут (сек)</label>
                <CustomInput type="number" v-model="form.timeout" :with-icon="false" />
              </div>
              <div class="form-group">
                <label>Повторы</label>
                <CustomInput type="number" v-model="form.retry" :with-icon="false" />
              </div>
            </div>
            <div class="form-group">
              <label>Музыкальный класс (MusicClass)</label>
              <CustomInput v-model="form.musicclass" :with-icon="false" />
            </div>
            <div class="form-group">
              <label>RingInUse</label>
              <CustomSelect v-model="form.ringinuse" :options="ringinuseOptions" />
            </div>
            <div class="form-group">
              <label>MaxLen</label>
              <CustomInput type="number" v-model="form.maxlen" :with-icon="false" />
            </div>
            <div class="form-group">
              <label>Участники (внутренние номера)</label>
              <div class="members-picker">
                <CustomSelect
                  v-model="memberPicker"
                  :options="availableMemberOptions"
                  placeholder="Выберите SIP-номер"
                  class="member-select"
                />
                <CustomButton
                  size="sm"
                  variant="outline"
                  :disabled="!memberPicker"
                  @click="addMemberFromPicker"
                >
                  Добавить
                </CustomButton>
              </div>
              <div v-if="(form.members || []).length > 0" class="member-chips">
                <span
                  v-for="member in form.members"
                  :key="member"
                  class="member-chip"
                >
                  {{ memberDisplayLabel(member) }}
                  <button type="button" class="chip-remove" @click="removeMember(member)">×</button>
                </span>
              </div>
              <p v-else class="members-hint">Нет участников — добавьте номера из списка</p>
              <label class="manual-member-label">Другой канал (вручную)</label>
              <div class="members-picker">
                <CustomInput
                  v-model="manualMember"
                  placeholder="PJSIP/101 или Local/102@from-internal"
                  :with-icon="false"
                  class="member-select"
                  @keyup.enter="addManualMember"
                />
                <CustomButton size="sm" variant="outline" :disabled="!manualMember.trim()" @click="addManualMember">
                  Добавить
                </CustomButton>
              </div>
            </div>
            <div class="form-group">
              <label>Дополнительные опции (JSON)</label>
              <textarea v-model="optionsJson" rows="3" class="json-input" placeholder='{"autofill": "yes"}'></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <CustomButton variant="outline" @click="showModal = false">Отмена</CustomButton>
            <CustomButton @click="saveQueue" :disabled="saving">Сохранить</CustomButton>
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
import { queuesApi } from '@/api/queuesApi'
import { vatsApi } from '@/api/vatsApi'
import type { QueueResponse, QueueCreate, QueueUpdate } from '@/types/queues'
import type { SIPUserFromAPI } from '@/types/vats'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { parseApiError } from '@/utils/parseApiError'
import { useModalEscape } from '@/composables/useModalEscape'

const props = defineProps<{
  instanceId: number
}>()

const toast = useToastStore()
const confirmStore = useConfirmStore()
const queues = ref<QueueResponse[]>([])
const loading = ref(false)
const errorMessage = ref('')
const showModal = ref(false)
useModalEscape(showModal, () => { showModal.value = false })
const editingQueue = ref<QueueResponse | null>(null)
const saving = ref(false)
const sipUsers = ref<SIPUserFromAPI[]>([])
const memberPicker = ref<string | number | null>(null)
const manualMember = ref('')

const strategyOptions = [
  { value: 'ringall', label: 'ringall' },
  { value: 'leastrecent', label: 'leastrecent' },
  { value: 'fewestcalls', label: 'fewestcalls' },
  { value: 'random', label: 'random' },
  { value: 'rrmemory', label: 'rrmemory' },
  { value: 'linear', label: 'linear' },
  { value: 'wrandom', label: 'wrandom' },
]
const ringinuseOptions = [
  { value: '', label: 'По умолчанию' },
  { value: 'yes', label: 'Да' },
  { value: 'no', label: 'Нет' },
]

const form = ref<QueueCreate>({
  name: '',
  strategy: 'rrmemory',
  timeout: 20,
  retry: 5,
  musicclass: 'default',
  ringinuse: '',
  maxlen: null,
  members: [],
  options: {},
})
const optionsJson = ref('{}')

const availableMemberOptions = computed(() => {
  const selected = new Set(form.value.members || [])
  return sipUsers.value
    .filter((user) => !selected.has(toPjsipMember(user.id)))
    .map((user) => ({
      value: user.id,
      label: `${user.id} — ${user.callerid || user.id}`,
    }))
})

const toPjsipMember = (extension: string | number): string => `PJSIP/${extension}`

const memberDisplayLabel = (member: string): string => {
  const match = member.match(/^(?:PJSIP|SIP)\/(.+)$/i)
  const extension = match?.[1] ?? member
  const user = sipUsers.value.find((item) => item.id === extension)
  if (user) return `${extension} — ${user.callerid || extension}`
  return member
}

const addMemberFromPicker = () => {
  if (memberPicker.value === null || memberPicker.value === '') return
  const channel = toPjsipMember(memberPicker.value)
  if (!(form.value.members || []).includes(channel)) {
    form.value.members = [...(form.value.members || []), channel]
  }
  memberPicker.value = null
}

const addManualMember = () => {
  const channel = manualMember.value.trim()
  if (!channel) return
  if (!(form.value.members || []).includes(channel)) {
    form.value.members = [...(form.value.members || []), channel]
  }
  manualMember.value = ''
}

const removeMember = (member: string) => {
  form.value.members = (form.value.members || []).filter((item) => item !== member)
}

const loadSipUsers = async () => {
  try {
    sipUsers.value = await vatsApi.getVatsUsers(props.instanceId)
  } catch {
    sipUsers.value = []
  }
}
watch(optionsJson, (val) => {
  if (!val || val.trim() === '') {
    form.value.options = {}
    return
  }
  try {
    const parsed = JSON.parse(val)
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      form.value.options = parsed
    } else {
      throw new Error('Ожидается объект JSON')
    }
  } catch {
    toast.addToast({ message: 'Неверный формат JSON. Используйте объект, например: {"key":"value"}', type: 'warning' })
  }
})

const loadQueues = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    queues.value = await queuesApi.getQueues(props.instanceId)
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки очередей')
    errorMessage.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingQueue.value = null
  form.value = {
    name: '',
    strategy: 'rrmemory',
    timeout: 20,
    retry: 5,
    musicclass: 'default',
    ringinuse: '',
    maxlen: null,
    members: [],
    options: {},
  }
  memberPicker.value = null
  manualMember.value = ''
  optionsJson.value = '{}'
  showModal.value = true
}

const openEditModal = (queue: QueueResponse) => {
  editingQueue.value = queue
  form.value = {
    name: queue.name,
    strategy: queue.strategy || 'rrmemory',
    timeout: queue.timeout ? parseInt(queue.timeout) : 20,
    retry: queue.retry ? parseInt(queue.retry) : 5,
    musicclass: queue.musicclass || 'default',
    ringinuse: queue.ringinuse || '',
    maxlen: queue.maxlen ? parseInt(queue.maxlen) : null,
    members: queue.members || [],
    options: queue.options || {},
  }
  memberPicker.value = null
  manualMember.value = ''
  optionsJson.value = JSON.stringify(queue.options || {}, null, 2)
  showModal.value = true
}

const saveQueue = async () => {
  if (!form.value.name.trim()) {
    toast.addToast({ message: 'Введите название очереди', type: 'warning' })
    return
  }

  saving.value = true
  try {
    if (editingQueue.value) {
      const updateData: QueueUpdate = {
        strategy: form.value.strategy,
        timeout: form.value.timeout,
        retry: form.value.retry,
        musicclass: form.value.musicclass,
        ringinuse: form.value.ringinuse || null,
        maxlen: form.value.maxlen,
        members: form.value.members,
        options: form.value.options,
      }
      await queuesApi.updateQueue(props.instanceId, editingQueue.value.name, updateData)
      toast.addToast({ message: 'Очередь обновлена', type: 'success' })
    } else {
      await queuesApi.createQueue(props.instanceId, form.value)
      toast.addToast({ message: 'Очередь создана', type: 'success' })
    }
    showModal.value = false
    await loadQueues()
  } catch (err: unknown) {
    const msg = parseApiError(err, editingQueue.value ? 'Ошибка обновления очереди' : 'Ошибка создания очереди')
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (queue: QueueResponse) => {
  const confirmed = await confirmStore.confirm({
    title: 'Удаление очереди',
    message: `Удалить очередь "${queue.name}"?`,
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await queuesApi.deleteQueue(props.instanceId, queue.name)
    toast.addToast({ message: `Очередь "${queue.name}" удалена`, type: 'success' })
    await loadQueues()
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка удаления')
    toast.addToast({ message: msg, type: 'error' })
  }
}

onMounted(() => {
  loadQueues()
  loadSipUsers()
})

watch(() => props.instanceId, () => {
  queues.value = []
  loadQueues()
  loadSipUsers()
})
</script>

<style scoped>
.queues-panel {
  width: 100%;
}
.panel-toolbar {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-bottom: var(--spacing-md);
}
.table-container {
  overflow-x: auto;
}
.queues-table {
  width: 100%;
  border-collapse: collapse;
}
.queues-table th,
.queues-table td {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.actions {
  display: flex;
  gap: var(--spacing-xs);
}
.error-message {
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}
.loading-state,
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
}
.spinner.large {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-md);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-modal) + 10);
}
.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  margin-bottom: var(--spacing-md);
}
.modal-body {
  margin-bottom: var(--spacing-md);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.form-group {
  margin-bottom: var(--spacing-md);
}
.form-row {
  display: flex;
  gap: var(--spacing-md);
}
.form-row .form-group {
  flex: 1;
}
.json-input {
  width: 100%;
  padding: var(--spacing-sm);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--color-text);
}
.members-picker {
  display: flex;
  gap: var(--spacing-xs);
  align-items: flex-start;
  margin-bottom: var(--spacing-xs);
}
.member-select {
  flex: 1;
  margin-bottom: 0;
}
.member-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin: var(--spacing-xs) 0 var(--spacing-sm);
}
.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  font-size: 0.8rem;
}
.chip-remove {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}
.chip-remove:hover {
  color: #e74c3c;
}
.members-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0 0 var(--spacing-sm);
}
.manual-member-label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xs);
}
</style>
