<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import VatsTable from '@/components/tables/VatsTable.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import CreateVatsModal from '@/components/modals/CreateVatsModal.vue'
import VatsDetailsModal from '@/components/modals/VatsDetailsModal.vue'
import type { VatsTableItem, VatsInstanceFromAPI, } from '@/types/vats'
import { vatsApi } from '@/api/vatsApi'
import { useToastStore } from '@/stores/toast'
import { mapApiStatusToUi } from '@/utils/vatsStatus.ts'

const toast = useToastStore()
const searchName = ref('')
const filterStatus = ref('all')
const showCreateModal = ref(false)
const showDetailsModal = ref(false)
const editingVats = ref<VatsTableItem | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const statusOptions = [
  { value: 'all', label: 'Все' },
  { value: 'Активна', label: 'Активна' },
  { value: 'Отключена', label: 'Отключена' },
  { value: 'Ошибка', label: 'Ошибка' },
  { value: 'Создаётся', label: 'Создаётся' },
]
const serversData = ref<VatsTableItem[]>([])
let pollInterval: ReturnType<typeof setInterval> | null = null

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

const startPolling = () => {
  stopPolling()
  pollInterval = setInterval(async () => {
    try {
      const instances = await vatsApi.getVatsList()
      
      serversData.value = instances.map((instance: VatsInstanceFromAPI) => ({
        id: instance.id.toString(),
        name: instance.name,
        status: mapApiStatusToUi(instance.status),
        apiStatus: instance.status,
        server: `asterisk-${instance.name}`,
        port: instance.sip_port,
        date: 'Нет данных',
        transportType: instance.transport_type || 'udp',
        internalNumbers: [],
      }))

      const isCreatingAny = serversData.value.some(item => item.apiStatus === 'creating')
      if (!isCreatingAny) {
        stopPolling()
      }
    } catch (e) {
      console.error('Ошибка при поллинге:', e)
      stopPolling()
    }
  }, 5000)
}

const filteredServers = computed(() => {
  let result = serversData.value
  const name = (searchName.value ?? '').trim()
  if (name) {
    result = result.filter(item => item.name.toLowerCase().includes(name.toLowerCase()))
  }
  if (filterStatus.value !== 'all') {
    result = result.filter(item => item.status === filterStatus.value)
  }
  return result
})

const openCreateModal = () => {
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const openDetailsModal = (vats: VatsTableItem) => {
  editingVats.value = vats
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  setTimeout(() => {
    editingVats.value = null
  }, 300)
}

const fetchVatsList = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const instances = await vatsApi.getVatsList()

    // Преобразуем данные из API в формат VatsTableItem
    serversData.value = instances.map((instance: VatsInstanceFromAPI & { created_at?: string }) => ({
      id: instance.id.toString(),
      name: instance.name,
      status: mapApiStatusToUi(instance.status),
      apiStatus: instance.status,
      server: `asterisk-${instance.name}`,
      port: instance.sip_port,
      // [FIX] Временно ставим заглушку. Как только бэкенд добавит дату, раскомментируй функцию formatDate и строку ниже:
      // date: instance.created_at ? formatDate(new Date(instance.created_at)) : 'Нет данных',
      date: 'Нет данных', 
      transportType: (instance.transport_type || 'udp').toLowerCase(),
      internalNumbers: [],
    }))
  } catch (error: unknown) {
    console.error('Полная ошибка при загрузке ВАТС:', error)
    
    let backendMessage = 'Произошла неизвестная ошибка'

    if (error instanceof Error) {
      backendMessage = error.message
      const errObj = error as Record<string, unknown>
      if (errObj.response && typeof errObj.response === 'object') {
        const responseData = (errObj.response as Record<string, unknown>).data
        if (responseData && typeof responseData === 'object' && 'message' in responseData) {
          backendMessage = String(responseData.message)
        }
      }
    } else if (typeof error === 'string') {
      backendMessage = error
    }
    
    if (backendMessage.includes('Не удалось подключиться к серверу')) {
      errorMessage.value = backendMessage
    } else {
      errorMessage.value = `Ошибка при загрузке ВАТС: ${backendMessage}`
    }
  } finally {
    isLoading.value = false
  }
}

const handleVATSUpdated = async () => {
  try {
    await fetchVatsList()
    closeDetailsModal()
  } catch {
    errorMessage.value = 'Не удалось обновить данные ВАТС'
  }
}

const handleVATSCreated = (newVats: VatsInstanceFromAPI) => {
  const newItem: VatsTableItem = {
    id: newVats.id.toString(),
    name: newVats.name,
    status: 'Создаётся',
    apiStatus: 'creating',
    server: `asterisk-${newVats.name}`,
    port: newVats.sip_port,
    date: 'Нет данных',
    transportType: 'udp',
    internalNumbers: [],
  }
  serversData.value.unshift(newItem)
  closeCreateModal()
  startPolling()
  toast.addToast({ message: `ВАТС "${newVats.name}" создается...`, type: 'info' })
}

const handleVATSDeletedFromModal = async () => {
  await fetchVatsList()
  closeDetailsModal()
  toast.addToast({ message: 'ВАТС удалена', type: 'success' })
}

// const formatDate = (date: Date): string => {
//   const day = String(date.getDate()).padStart(2, '0')
//   const month = String(date.getMonth() + 1).padStart(2, '0')
//   const year = date.getFullYear()
//   return `${day}.${month}.${year} г.`
// }

const reloadData = () => {
  errorMessage.value = ''
  fetchVatsList()
}

const resetFilters = () => {
  searchName.value = ''
  filterStatus.value = 'all'
}

onMounted(() => {
  fetchVatsList()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="wrapper">
    <PageHeader title="Управление ВАТС" subtitle="Список всех виртуальных АТС в кластере">
      <template #actions>
        <div class="header-actions">
          <CustomButton
            @click="reloadData"
            variant="outline"
            :disabled="isLoading"
            class="reload-btn"
          >
            <span v-if="isLoading" class="button-loading">
              <span class="spinner"></span>
            </span>
            <span v-else>⟳ Обновить</span>
          </CustomButton>
          <CustomButton @click="openCreateModal" :disabled="isLoading">
            <span v-if="isLoading" class="button-loading">
              <span class="spinner"></span>
            </span>
            <span v-else>+ Создать ВАТС</span>
          </CustomButton>
        </div>
      </template>
    </PageHeader>

    <div v-if="errorMessage" class="error-message">
      <div class="error-content">
        <span class="error-icon">⚠</span>
        <span>{{ errorMessage }}</span>
      </div>
      <button @click="errorMessage = ''" class="error-close">×</button>
    </div>

    <main class="content">
      <div class="filters-bar">
        <div class="filter-item">
          <CustomInput
            v-model="searchName"
            label="Наименование ВАТС"
            placeholder="Поиск по имени..."
            :with-icon="true"
            :disabled="isLoading"
          />
        </div>
        <div class="filter-item">
          <CustomSelect
            v-model="filterStatus"
            label="Статус"
            :options="statusOptions"
            :disabled="isLoading"
          />
        </div>
        <div class="filter-actions">
          <CustomButton
            variant="outline"
            @click="resetFilters"
            :disabled="isLoading || ((searchName ?? '') === '' && filterStatus === 'all')"
            class="reset-button"
          >
            Сбросить
          </CustomButton>
        </div>
      </div>
      
      <div v-if="isLoading && serversData.length === 0" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка ВАТС...</p>
      </div>
      
      <div v-else-if="serversData.length === 0" class="empty-state">
        <p>Нет созданных ВАТС</p>
        <CustomButton @click="openCreateModal">Создать первую ВАТС</CustomButton>
      </div>
      
      <div v-else-if="filteredServers.length === 0" class="empty-state">
        <p>По вашему запросу ничего не найдено</p>
        <CustomButton @click="resetFilters" variant="outline">Сбросить фильтры</CustomButton>
      </div>
      
      <VatsTable
        v-else
        :table-data="filteredServers"
        @edit="openDetailsModal"
      />
    </main>

    <CreateVatsModal
      :show="showCreateModal"
      :existing-vats="serversData" 
      @close="closeCreateModal"
      @created="handleVATSCreated"
    />

    <VatsDetailsModal
      :show="showDetailsModal"
      :vats-data="editingVats"
      @close="closeDetailsModal"
      @updated="handleVATSUpdated"
      @deleted="handleVATSDeletedFromModal"
    />
  </div>
</template>

<style scoped>
/* Твои стили остаются без изменений, они отличные */
.wrapper { width: 100%; padding: 0 1rem; display: flex; flex-direction: column; overflow: hidden; }
.content { background: var(--color-surface); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm); min-height: 400px; display: flex; flex-direction: column; border: 1px solid var(--color-border); transition: box-shadow var(--transition-fast); }
.content:hover { box-shadow: var(--shadow-md); }
.header-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 1.5rem; }
.reload-btn { background-color: var(--color-background-soft); border: 1px solid var(--color-border); color: var(--color-text-secondary); border-radius: var(--radius-md); padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all var(--transition-fast); display: inline-flex; align-items: center; gap: 0.5rem; }
.reload-btn:hover { background-color: var(--color-surface-hover); border-color: var(--color-border-hover); color: var(--color-text); }
.reload-btn:active { transform: translateY(1px); }
.error-message { background-color: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); color: var(--vt-c-orange); padding: 0.875rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; animation: slideIn 0.3s ease; }
.filters-bar { display: flex; flex-wrap: wrap; gap: var(--spacing-md); align-items: flex-end; margin-bottom: 1.5rem; background: var(--color-background-mute); padding: var(--spacing-md); border-radius: var(--radius-md); }
.filter-item { flex: 2 1 200px; }
.filter-actions { flex: 0 0 auto; display: flex; align-items: center; }
.reset-button { background-color: var(--color-background-soft); margin: 0; }
.reset-button:disabled { opacity: 0.3; cursor: auto; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.error-content { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
.error-icon { font-size: 1.25rem; flex-shrink: 0; }
.error-close { background: transparent; border: none; color: var(--color-text); font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem; line-height: 1; }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.5rem; color: var(--color-text-secondary); font-size: 1rem; flex: 1; text-align: center; gap: 1rem; }
.empty-state p { margin: 0; max-width: 300px; line-height: 1.5; }
.button-loading { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; background-color: var(--color-background-soft); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: 0.875rem; }
.spinner { width: 1rem; height: 1rem; border: 2px solid transparent; border-top: 2px solid currentColor; border-radius: 50%; animation: spin 1s linear infinite; }
.spinner.large { width: 2.5rem; height: 2.5rem; border-width: 3px; color: var(--color-primary); }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.content > *:not(.error-message) { animation: fadeInUp 0.5s ease; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) { .wrapper { padding: 0 0.75rem; } .content { padding: 1.25rem; border-radius: var(--radius-md); } .header-actions { flex-direction: column; align-items: stretch; gap: 0.75rem; } .reload-btn { width: 100%; justify-content: center; } .error-message { flex-direction: column; align-items: stretch; gap: 1rem; padding: 1rem; } .error-content { align-items: flex-start; } .loading-state, .empty-state { padding: 2rem 1rem; } .spinner.large { width: 2rem; height: 2rem; } }
@media (max-width: 480px) { .wrapper { padding: 0 0.5rem; } .content { padding: 1rem; min-height: 300px; } .loading-state, .empty-state { padding: 1.5rem 0.75rem; font-size: 0.875rem; } }
@media (min-width: 1024px) { .wrapper { padding: 0 1.5rem; } .content { padding: 2rem; } .header-actions { gap: 1rem; } }
.reload-btn .spinner { width: 0.875rem; height: 0.875rem; border-width: 2px; }
</style>