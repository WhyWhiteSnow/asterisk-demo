<template>
  <div class="voicemail-page">
    <PageHeader title="Голосовая почта" subtitle="Управление ящиками и сообщениями">
      <template #actions>
        <div class="header-actions">
          <CustomSelect
            v-model="selectedInstanceId"
            :options="instanceOptions"
            label="ВАТС"
            placeholder="Выберите ВАТС"
            :disabled="loading"
            style="min-width: 200px;"
          />
          <CustomButton variant="outline" @click="loadBoxes" :disabled="loading || !selectedInstanceId">
            Обновить
          </CustomButton>
          <CustomButton @click="openCreateModal" :disabled="!selectedInstanceId">
            Создать ящик
          </CustomButton>
        </div>
      </template>
    </PageHeader>

    <div v-if="error" class="error-message">{{ error }}</div>

    <main class="content">
      <div v-if="loading" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка ящиков...</p>
      </div>
      <div v-else-if="!selectedInstanceId" class="empty-state">
        <p>Выберите ВАТС для управления голосовой почтой</p>
      </div>
      <div v-else-if="boxes.length === 0" class="empty-state">
        <p>Нет голосовых ящиков</p>
        <CustomButton @click="openCreateModal">Создать первый ящик</CustomButton>
      </div>
      <div v-else>
        <div class="table-container">
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
                  <span v-if="boundUsersMap[box.mailbox]">
                    {{ boundUsersMap[box.mailbox] }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="actions">
                  <CustomButton size="sm" variant="outline" @click="openRecordings(box)">
                    Записи
                  </CustomButton>
                  <CustomButton size="sm" variant="outline" @click="openBindingModal(box)">
                    Привязать
                  </CustomButton>
                  <CustomButton size="sm" variant="outline" @click="openEditModal(box)">
                    Редактировать
                  </CustomButton>
                  <CustomButton size="sm" variant="danger" @click="deleteBox(box)">
                    Удалить
                  </CustomButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Модальное окно создания/редактирования -->
    <VoicemailFormModal
      v-if="selectedInstanceId"
      :show="showFormModal"
      :instance-id="selectedInstanceId"
      :editing="!!editingBox"
      :initial-data="editingBox || undefined"
      @close="onFormClose"
    />
    
    <!-- Модальное окно просмотра записей -->
    <VoicemailRecordingsModal
      v-if="selectedInstanceId"
      :show="showRecordingsModal"
      :instance-id="selectedInstanceId"
      :mailbox="recordingsMailbox"
      @close="showRecordingsModal = false"
    />
    
    <!-- Модальное окно привязки пользователя -->
    <VoicemailUserBindingModal
      v-if="selectedInstanceId"
      :show="showBindingModal"
      :instance-id="selectedInstanceId"
      :mailbox="bindingMailbox"
      :users="sipUsersForBinding"
      :current-binding-user-id="boundUsersMap[bindingMailbox]"
      @close="onBindingClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import VoicemailFormModal from '@/components/voicemail/VoicemailFormModal.vue'
import VoicemailRecordingsModal from '@/components/voicemail/VoicemailRecordingsModal.vue'
import VoicemailUserBindingModal from '@/components/voicemail/VoicemailUserBindingModal.vue'
import { voicemailApi } from '@/api/voicemailApi'
import { getVoicemailBoxByUserId } from '@/api/voicemailHelpers'
import { vatsApi } from '@/api/vatsApi'
import type { VatsInstanceFromAPI } from '@/types/vats'
import type { VoicemailBox } from '@/types/voicemail'
import type { SIPUserFromAPI } from '@/types/vats'
import { useToastStore } from '@/stores/toast'
import axios from 'axios'
import { useRoute } from 'vue-router'

const route = useRoute()
const toast = useToastStore()

// Состояния
const instances = ref<VatsInstanceFromAPI[]>([])
const selectedInstanceId = ref<number | undefined>(undefined)
const boxes = ref<VoicemailBox[]>([])
const sipUsers = ref<SIPUserFromAPI[]>([])
const boundUsersMap = ref<Record<string, string>>({})
const loading = ref(false)
const error = ref('')

// Модальные окна
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

const instanceOptions = computed(() => instances.value.map(i => ({ value: i.id, label: i.name })))

// Загрузка списка ВАТС
const loadInstances = async () => {
  try {
    instances.value = await vatsApi.getVatsList()
  } catch (err: unknown) {
    let msg = 'Ошибка загрузки ВАТС'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    error.value = msg
    toast.addToast({ message: msg, type: 'error' })
  }
}

// Загрузка SIP-пользователей для текущей ВАТС
const loadSipUsers = async () => {
  if (!selectedInstanceId.value) return
  try {
    sipUsers.value = await vatsApi.getVatsUsers(selectedInstanceId.value)
  } catch (err: unknown) {
    console.error('Ошибка загрузки пользователей SIP:', err)
  }
}

// Загрузка привязок: для каждого SIP-пользователя проверяем привязку к ящику
const loadBoundUsers = async () => {
  if (!selectedInstanceId.value || sipUsers.value.length === 0) {
    boundUsersMap.value = {}
    return
  }
  const instanceId = selectedInstanceId.value
  const entries = await Promise.all(
    sipUsers.value.map(async (user) => {
      const box = await getVoicemailBoxByUserId(instanceId, user.id)
      return box?.mailbox ? ([box.mailbox, user.id] as const) : null
    }),
  )
  boundUsersMap.value = Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null))
}

// Загрузка списка ящиков
const loadBoxes = async () => {
  if (!selectedInstanceId.value) return
  loading.value = true
  error.value = ''
  try {
    boxes.value = await voicemailApi.getBoxes(selectedInstanceId.value)
    await loadSipUsers()
    await loadBoundUsers()
  } catch (err: unknown) {
    let msg = 'Ошибка загрузки ящиков'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    error.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    loading.value = false
  }
}

// Открыть модалку создания
const openCreateModal = () => {
  editingBox.value = null
  showFormModal.value = true
}

// Открыть модалку редактирования
const openEditModal = (box: VoicemailBox) => {
  editingBox.value = box
  showFormModal.value = true
}

// Удаление ящика
const deleteBox = async (box: VoicemailBox) => {
  if (!confirm(`Удалить голосовой ящик "${box.mailbox}"? Действие необратимо.`)) return
  try {
    await voicemailApi.deleteBox(selectedInstanceId.value!, box.mailbox, box.context)
    toast.addToast({ message: 'Ящик удалён', type: 'success' })
    await loadBoxes()
  } catch (err: unknown) {
    let msg = 'Ошибка удаления'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    toast.addToast({ message: msg, type: 'error' })
  }
}

// Открыть список записей
const openRecordings = (box: VoicemailBox) => {
  recordingsMailbox.value = box.mailbox
  showRecordingsModal.value = true
}

// Открыть модалку привязки
const openBindingModal = (box: VoicemailBox) => {
  bindingMailbox.value = box.mailbox
  showBindingModal.value = true
}

// Обработчик закрытия формы
const onFormClose = (reload?: boolean) => {
  showFormModal.value = false
  if (reload) loadBoxes()
}

// Обработчик закрытия модалки привязки
const onBindingClose = (reload?: boolean) => {
  showBindingModal.value = false
  if (reload) loadBoxes()
}

const openMailboxFromQuery = () => {
  const mailbox = route.query.mailbox as string | undefined
  if (!mailbox) return
  const found = boxes.value.find(b => b.mailbox === mailbox)
  if (found) openRecordings(found)
}

// Следим за сменой ВАТС (один вызов loadBoxes, без дубля в onMounted)
watch(selectedInstanceId, async (id) => {
  if (id) {
    await loadBoxes()
    openMailboxFromQuery()
  } else {
    boxes.value = []
    boundUsersMap.value = {}
  }
})

onMounted(async () => {
  await loadInstances()
  if (route.query.instanceId) {
    selectedInstanceId.value = Number(route.query.instanceId)
  }
})
</script>

<style scoped>
.voicemail-page {
  width: 100%;
  padding: 0 var(--spacing-md);
}
.header-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
}
.content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-top: var(--spacing-md);
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
  margin-bottom: var(--spacing-md);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>