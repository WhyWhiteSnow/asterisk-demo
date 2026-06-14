<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import CDRTable from '@/components/tables/CDRTable.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import CallDetailsModal from '@/components/modals/CallDetailsModal.vue'
import axios from 'axios'
import type { CallRecord, CDRRecord, CDRQueryParams } from '@/types/cdr'
import { cdrApi } from '@/api/cdrApi'
import { vatsApi } from '@/api/vatsApi'
import type { VatsInstanceFromAPI } from '@/types/vats'

// Состояния
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedDate = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const cdrData = ref<CDRRecord[]>([])
const showCallDetails = ref(false)
const selectedCall = ref<CallRecord | null>(null)
const totalItems = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const srcFilter = ref('')
const dstFilter = ref('')
const selectedInstance = ref<string>('')
const vatsList = ref<VatsInstanceFromAPI[]>([])
const isLoadingVats = ref(false)

let searchDebounceTimer: number | null = null

const openCallDetails = (call: CallRecord) => {
  selectedCall.value = call
  showCallDetails.value = true
}

//селекторы
const hasActiveFilters = computed(() => {
  return (srcFilter.value ?? '').trim() !== '' ||
         (dstFilter.value ?? '').trim() !== '' ||
         selectedStatus.value !== 'all' ||
         (selectedDate.value ?? '') !== '' ||
         selectedInstance.value !== ''
})

const callsData = computed(() => {
  return cdrData.value.map(transformCDRToCallRecord)
})

const vatsOptions = computed(() => {
  const options = [{ value: '', label: 'Все ВАТС' }]
  vatsList.value.forEach(vats => {
    options.push({ value: vats.name, label: vats.name })
  })
  return options
})

const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadAllCDRData()
}

const statusOptions = [
  { value: 'all', label: 'Все' },
  { value: 'ANSWERED', label: 'Отвечен' },
  { value: 'NO ANSWER', label: 'Не отвечен' },
  { value: 'BUSY', label: 'Занято' },
  { value: 'FAILED', label: 'Неуспешный' },
]

const loadAllCDRData = async () => {
  isLoading.value = true
  errorMessage.value = ''
  const params: CDRQueryParams = {
    limit: pageSize.value,
    offset: (currentPage.value - 1) * pageSize.value,
  }

  const trimmedSrc = (srcFilter.value ?? '').trim()
  const trimmedDst = (dstFilter.value ?? '').trim()
  
  if (trimmedSrc) params.src = trimmedSrc
  if (trimmedDst) params.dst = trimmedDst
  if (selectedStatus.value !== 'all') {
    params.disposition = selectedStatus.value
  }
  if (selectedDate.value) {
    params.date_from = `${selectedDate.value}T00:00:00`
    params.date_to = `${selectedDate.value}T23:59:59`
  }
  if (selectedInstance.value) {
    params.instance_name = selectedInstance.value
  }
  try {
    const response = await cdrApi.getCDR(params)
    cdrData.value = response.items
    totalItems.value = response.total
  } catch (error: unknown) {
    console.error('Ошибка при загрузке CDR:', error)
    if (axios.isAxiosError(error)) {
      errorMessage.value = error.response?.data?.detail || error.message
    } else if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Не удалось загрузить историю звонков'
    }
  } finally {
    isLoading.value = false
  }
}

const loadVatsList = async () => {
  isLoadingVats.value = true
  try {
    vatsList.value = await vatsApi.getVatsList()
  } catch (error) {
    console.error('Ошибка загрузки списка ВАТС:', error)
  } finally {
    isLoadingVats.value = false
  }
}


const resetFilters = () => {
  srcFilter.value = ''
  dstFilter.value = ''
  selectedStatus.value = 'all'
  selectedDate.value = ''
  currentPage.value = 1
  selectedInstance.value = ''
  loadAllCDRData()
}

watch([srcFilter, dstFilter], () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1
    loadAllCDRData()
  }, 500)
})

watch(selectedStatus, () => {
  currentPage.value = 1
  loadAllCDRData()
})

watch(selectedDate, () => {
  currentPage.value = 1
  loadAllCDRData()
})

watch(selectedInstance, () => {
  currentPage.value = 1
  loadAllCDRData()
})

const transformCDRToCallRecord = (cdr: CDRRecord): CallRecord => {
  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString)
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const statusMap: Record<string, string> = {
    ANSWERED: 'Отвечен',
    'NO ANSWER': 'Не отвечен',
    BUSY: 'Занято',
    FAILED: 'Неуспешный',
  }

  return {
    answerDateTime: formatDateTime(cdr.answer),
    endDateTime: formatDateTime(cdr.end),
    from: cdr.src,
    to: cdr.dst,
    duration: formatDuration(cdr.duration),
    status: statusMap[cdr.disposition] || cdr.disposition,
    vats: cdr.instance_name,
  }
}

const exportToJson = () => {
  if (callsData.value.length === 0) {
    alert('Нет данных для экспорта')
    return
  }

  try {
    const exportData = {
      metadata: {
        exportDate: new Date().toLocaleString('ru-RU'),
        totalRecords: callsData.value.length,
        filters: {
          searchQuery: searchQuery.value,
          status: selectedStatus.value,
          date: selectedDate.value,
        },
      },
      data: callsData.value,
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const date = new Date().toISOString().split('T')[0]
    link.download = `cdr_export_${date}.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log('Экспорт завершен успешно. Скачано записей:', callsData.value.length)
  } catch (error) {
    console.error('Ошибка при экспорте данных:', error)
    alert('Произошла ошибка при экспорте данных')
  }
}

onMounted(() => {
  loadAllCDRData()
  loadVatsList()
})

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})
</script>

<template>
  <div class="wrapper">
    <PageHeader title="Детализация звонков (CDR)" subtitle="Все ВАТС">
      <template #actions>
        <div class="header-actions">
          <CustomButton
            @click="loadAllCDRData"
            variant="outline"
            :disabled="isLoading"
            class="reload-btn"
          >
            <span v-if="isLoading" class="button-loading">
              <span class="spinner"></span>
            </span>
            <span v-else>⟳ Обновить</span>
          </CustomButton>
          <CustomButton
            class="export-button"
            @click="exportToJson"
            :disabled="isLoading || callsData.length === 0"
          >
            Экспорт
          </CustomButton>
        </div>
      </template>
    </PageHeader>

    <!-- Сообщение об ошибке -->
    <div v-if="errorMessage" class="error-message">
      <div class="error-content">
        <span class="error-icon">⚠</span>
        <span>{{ errorMessage }}</span>
      </div>
      <button @click="errorMessage = ''" class="error-close">×</button>
    </div>

    <div class="search-filters">
      <div class="filter-item">
        <CustomInput
          v-model="srcFilter"
          label="Номер источника"
          placeholder="Введите src..."
          :with-icon="false"
        />
      </div>
      <div class="filter-item">
        <CustomInput
          v-model="dstFilter"
          label="Номер назначения"
          placeholder="Введите dst..."
          :with-icon="false"
        />
      </div>
      <div class="filter-item">
        <CustomSelect
          v-model="selectedInstance"
          label="ВАТС"
          placeholder="Все ВАТС"
          :options="vatsOptions"
          :disabled="isLoadingVats"
        />
      </div>
      <div class="filter-item">
        <CustomSelect
          v-model="selectedStatus"
          label="Статус"
          placeholder="Все статусы"
          :options="statusOptions"
        />
      </div>
      <div class="filter-item">
        <CustomInput
          class="custom-input--date"
          v-model="selectedDate"
          label="Дата"
          type="date"
          :with-icon="false"
        />
      </div>
    </div>

    <div class="filter-info">
      <span class="results-count">
        Найдено записей: {{ totalItems }}
      </span>
      <CustomButton
        class="reset-button"
        variant="outline"
        @click="resetFilters"
        :disabled="isLoading || !hasActiveFilters"
      >
        Сбросить фильтры
      </CustomButton>
    </div>

    <main class="content">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка истории звонков...</p>
      </div>
      <div v-else-if="callsData.length === 0" class="empty-state">
        <p>Нет данных о звонках</p>
        <CustomButton @click="loadAllCDRData">Обновить</CustomButton>
      </div>
      <CDRTable
        v-else
        :calls-data="callsData"
        @details="openCallDetails"
      />
      <div class="pagination">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Назад</button>
        <span>Страница {{ currentPage }} из {{ totalPages || 1 }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Вперёд</button>
        <select v-model="pageSize" @change="currentPage = 1; loadAllCDRData()">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </main>
    <CallDetailsModal
      :show="showCallDetails"
      :call="selectedCall"
      @close="showCallDetails = false"
    />
  </div>
</template>

<style scoped>
.client-filter-note {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-left: 0.5rem;
}

.wrapper {
  width: 100%;
  padding: 0 var(--spacing-md);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.reload-btn {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.search-filters {
  padding: var(--spacing-md);
  display: flex;
  justify-content: space-around;
  margin-bottom: var(--spacing-md);
  background: var(--color-background-mute);
  border-radius: var(--radius-lg);
  gap: var(--spacing-md);
  overflow-x: auto;
  flex-wrap: nowrap;
  overflow: visible;
}

.filter-item {
  flex: 1 1 200px;
  min-width: 180px;
}

.filter-info {
  padding: 0 var(--spacing-md);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reset-button {
  margin: 0;
}

.reset-button:disabled {
  opacity: 0.3;
  cursor: auto;
}

.results-count {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 500;
}

.active-filters {
  font-size: 0.8rem;
  color: var(--color-primary);
  font-style: italic;
}

.content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-md);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
}

.error-message {
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  color: var(--vt-c-orange);
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  animation: slideIn 0.3s ease;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-icon {
  font-size: 1.2rem;
}

.error-close {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
}

.error-close:hover {
  opacity: 0.8;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  flex: 1;
}

.empty-state p {
  margin-bottom: var(--spacing-md);
}

.button-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner.large {
  width: 2rem;
  height: 2rem;
  border-width: 3px;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  flex-wrap: wrap;
}

.pagination button {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-text);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background-color: var(--color-surface-hover);
}

.pagination select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-text);
}

/* Адаптивность */
@media (max-width: 768px) {
  .search-filters {
    flex-direction: column;
  }

  .header-actions {
    align-items: flex-end;
    width: 100%;
  }

  .filter-info {
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  .pagination {
    gap: var(--spacing-sm);
  }
  .pagination button,
  .pagination select {
    font-size: 0.75rem;
    padding: var(--spacing-xs);
  }
}
</style>
