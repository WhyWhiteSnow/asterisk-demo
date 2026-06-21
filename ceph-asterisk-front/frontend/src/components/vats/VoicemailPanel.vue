<template>
  <div class="voicemail-panel">
    <div class="panel-toolbar">
      <CustomButton variant="outline" @click="loadBoxes" :disabled="loading">
        Обновить
      </CustomButton>
      <CustomButton @click="openCreateModal">
        Создать ящик
      </CustomButton>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner large"></div>
      <p>Загрузка ящиков...</p>
    </div>
    <div v-else-if="boxes.length === 0" class="empty-state">
      <p>Нет голосовых ящиков</p>
      <CustomButton @click="openCreateModal">Создать первый ящик</CustomButton>
    </div>
    <div v-else class="table-container">
      <table class="boxes-table">
        <thead>
          <tr>
            <th>Номер ящика</th>
            <th>Контекст</th>
            <th>Полное имя</th>
            <th>Email</th>
            <th>Связанный пользователь</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="box in boxes" :key="`${box.mailbox}-${box.context}`">
            <td>{{ box.mailbox }}</td>
            <td>{{ box.context }}</td>
            <td>{{ box.full_name }}</td>
            <td>{{ box.email || '—' }}</td>
            <td>
              <span v-if="boundUsersMap[box.mailbox]">{{ boundUsersMap[box.mailbox] }}</span>
              <span v-else>—</span>
            </td>
            <td class="actions">
              <CustomButton size="sm" variant="outline" @click="openRecordings(box)">Записи</CustomButton>
              <CustomButton size="sm" variant="outline" @click="openBindingModal(box)">Привязать</CustomButton>
              <CustomButton size="sm" variant="outline" @click="openEditModal(box)">Редактировать</CustomButton>
              <CustomButton size="sm" variant="danger" @click="deleteBox(box)">Удалить</CustomButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <VoicemailFormModal
      :show="showFormModal"
      :instance-id="instanceId"
      :editing="!!editingBox"
      :initial-data="editingBox || undefined"
      @close="onFormClose"
    />
    <VoicemailRecordingsModal
      :show="showRecordingsModal"
      :instance-id="instanceId"
      :mailbox="recordingsMailbox"
      @close="showRecordingsModal = false"
    />
    <VoicemailUserBindingModal
      :show="showBindingModal"
      :instance-id="instanceId"
      :mailbox="bindingMailbox"
      :users="sipUsersForBinding"
      :current-binding-user-id="boundUsersMap[bindingMailbox]"
      @close="onBindingClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import VoicemailFormModal from '@/components/voicemail/VoicemailFormModal.vue'
import VoicemailRecordingsModal from '@/components/voicemail/VoicemailRecordingsModal.vue'
import VoicemailUserBindingModal from '@/components/voicemail/VoicemailUserBindingModal.vue'
import { voicemailApi } from '@/api/voicemailApi'
import { getVoicemailBoxByUserId } from '@/api/voicemailHelpers'
import { vatsApi } from '@/api/vatsApi'
import type { VoicemailBox } from '@/types/voicemail'
import type { SIPUserFromAPI } from '@/types/vats'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { parseApiError } from '@/utils/parseApiError'

const props = defineProps<{
  instanceId: number
  initialMailbox?: string | null
}>()

const toast = useToastStore()
const confirmStore = useConfirmStore()
const boxes = ref<VoicemailBox[]>([])
const sipUsers = ref<SIPUserFromAPI[]>([])
const boundUsersMap = ref<Record<string, string>>({})
const loading = ref(false)
const error = ref('')

const showFormModal = ref(false)
const editingBox = ref<VoicemailBox | null>(null)
const showRecordingsModal = ref(false)
const recordingsMailbox = ref('')
const showBindingModal = ref(false)
const bindingMailbox = ref('')

const sipUsersForBinding = computed(() =>
  sipUsers.value.map(user => ({
    id: user.id,
    name: user.callerid || user.id,
  })),
)

const loadSipUsers = async () => {
  try {
    sipUsers.value = await vatsApi.getVatsUsers(props.instanceId)
  } catch (err: unknown) {
    console.error('Ошибка загрузки пользователей SIP:', err)
  }
}

const loadBoundUsers = async () => {
  if (sipUsers.value.length === 0) {
    boundUsersMap.value = {}
    return
  }
  const entries = await Promise.all(
    sipUsers.value.map(async (user) => {
      const box = await getVoicemailBoxByUserId(props.instanceId, user.id)
      return box?.mailbox ? ([box.mailbox, user.id] as const) : null
    }),
  )
  boundUsersMap.value = Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null))
}

const openInitialMailbox = () => {
  if (!props.initialMailbox) return
  const found = boxes.value.find(b => b.mailbox === props.initialMailbox)
  if (found) openRecordings(found)
}

const loadBoxes = async () => {
  loading.value = true
  error.value = ''
  try {
    boxes.value = await voicemailApi.getBoxes(props.instanceId)
    await loadSipUsers()
    await loadBoundUsers()
    openInitialMailbox()
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки ящиков')
    error.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingBox.value = null
  showFormModal.value = true
}

const openEditModal = (box: VoicemailBox) => {
  editingBox.value = box
  showFormModal.value = true
}

const deleteBox = async (box: VoicemailBox) => {
  const confirmed = await confirmStore.confirm({
    title: 'Удаление ящика',
    message: `Удалить голосовой ящик "${box.mailbox}"? Действие необратимо.`,
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await voicemailApi.deleteBox(props.instanceId, box.mailbox, box.context)
    toast.addToast({ message: 'Ящик удалён', type: 'success' })
    await loadBoxes()
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка удаления')
    toast.addToast({ message: msg, type: 'error' })
  }
}

const openRecordings = (box: VoicemailBox) => {
  recordingsMailbox.value = box.mailbox
  showRecordingsModal.value = true
}

const openBindingModal = (box: VoicemailBox) => {
  bindingMailbox.value = box.mailbox
  showBindingModal.value = true
}

const onFormClose = (reload?: boolean) => {
  showFormModal.value = false
  if (reload) loadBoxes()
}

const onBindingClose = (reload?: boolean) => {
  showBindingModal.value = false
  if (reload) loadBoxes()
}

watch(() => props.initialMailbox, () => {
  if (boxes.value.length) openInitialMailbox()
})

watch(() => props.instanceId, () => {
  boxes.value = []
  boundUsersMap.value = {}
  loadBoxes()
})

onMounted(() => {
  loadBoxes()
})
</script>

<style scoped>
.voicemail-panel {
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
.boxes-table {
  width: 100%;
  border-collapse: collapse;
}
.boxes-table th,
.boxes-table td {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
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
@media (max-width: 768px) {
  .boxes-table th:nth-child(4),
  .boxes-table td:nth-child(4) {
    display: none;
  }
  .actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
