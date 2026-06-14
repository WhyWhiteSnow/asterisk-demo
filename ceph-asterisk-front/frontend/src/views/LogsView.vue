<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import LogsTable from '@/components/tables/LogsTable.vue'
import { logsApi, type LogsQueryParams } from '@/api/logsApi'
import type { LogEntry } from '@/types/logs'
import { vatsApi } from '@/api/vatsApi'
import type { VatsInstanceFromAPI } from '@/types/vats'
import { useToastStore } from '@/stores/toast'
import axios from 'axios'

const toast = useToastStore()

// Состояния
const logsData = ref<LogEntry[]>([])
const totalItems = ref(0)
const totalRelation = ref<'eq' | 'gte'>('eq')
const isLoading = ref(false)
const errorMessage = ref('')

// Фильтры
const searchText = ref('')
const selectedLevel = ref('all')
const selectedVats = ref('all')   // значение 'all' или строковый id ВАТС
const currentPage = ref(1)
const pageSize = ref(20)

// Список ВАТС для селектора
const vatsList = ref<VatsInstanceFromAPI[]>([])
const isLoadingVats = ref(false)

// Уровни логов (значения для API)
const levelOptions = [
  { value: 'all', label: 'Все' },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'VERBOSE', label: 'VERBOSE' },
  { value: 'NOTICE', label: 'NOTICE' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'UNKNOWN', label: 'UNKNOWN' },
]

// Загрузка списка ВАТС
const loadVatsList = async () => {
  isLoadingVats.value = true
  try {
    vatsList.value = await vatsApi.getVatsList()
  } catch (err) {
    console.error('Ошибка загрузки ВАТС:', err)
  } finally {
    isLoadingVats.value = false
  }
}

const vatsOptions = computed(() => {
  const opts = [{ value: 'all', label: 'Все ВАТС' }]
  vatsList.value.forEach(vats => {
    opts.push({ value: vats.name, label: vats.name })
  })
  return opts
})

// Загрузка логов с сервера
const loadLogs = async () => {
  isLoading.value = true
  errorMessage.value = ''
  const params: LogsQueryParams = {
    page: currentPage.value - 1,  // API page начинается с 0
    limit: pageSize.value,
  }
  if (selectedLevel.value !== 'all') {
    params.level = selectedLevel.value
  }
  if (selectedVats.value !== 'all') {
    params.pbx_id = selectedVats.value
  }
  const text = searchText.value?.trim()
  if (text) {
    params.text = text
  }
  try {
    const response = await logsApi.getLogs(params)
    logsData.value = response.data
    totalItems.value = response.total
    totalRelation.value = response.relation ?? 'eq'
  } catch (err: unknown) {
    let msg = 'Ошибка загрузки логов'
    if (axios.isAxiosError(err)) {
      msg = err.response?.data?.detail || err.message
    } else if (err instanceof Error) {
      msg = err.message
    }
    errorMessage.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    isLoading.value = false
  }
}

// Сброс фильтров
const resetFilters = () => {
  searchText.value = ''
  selectedLevel.value = 'all'
  selectedVats.value = 'all'
  currentPage.value = 1
  loadLogs()
}

// Активные фильтры (для кнопки сброса)
const hasActiveFilters = computed(() => {
  return (searchText.value ?? '').trim() !== '' ||
         selectedLevel.value !== 'all' ||
         selectedVats.value !== 'all'
})

const resultsCountText = computed(() => {
  if (totalRelation.value === 'gte') {
    return `Найдено ${totalItems.value} записей или больше`
  }
  return `Найдено записей: ${totalItems.value}`
})

// Пагинация
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))
const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadLogs()
}
const changePageSize = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadLogs()
}

// Следим за изменениями фильтров (кроме текста – с дебаунсом)
let filterDebounceTimer: number | null = null
const applyFiltersAndReload = () => {
  if (filterDebounceTimer) clearTimeout(filterDebounceTimer)
  filterDebounceTimer = setTimeout(() => {
    currentPage.value = 1
    loadLogs()
  }, 500)
}

watch(selectedLevel, () => { currentPage.value = 1; loadLogs() })
watch(selectedVats, () => { currentPage.value = 1; loadLogs() })
watch(searchText, () => applyFiltersAndReload())
watch(searchText, (newVal) => {
  if (newVal === undefined) {
    searchText.value = ''
  }
})
// Экспорт отфильтрованных логов (текущая страница)
const exportLogs = () => {
  if (logsData.value.length === 0) {
    toast.addToast({ message: 'Нет данных для экспорта', type: 'warning' })
    return
  }
  const exportData = {
    exportDate: new Date().toLocaleString('ru-RU'),
    filters: {
      level: selectedLevel.value,
      pbx_id: selectedVats.value,
      text: searchText.value,
    },
    data: logsData.value,
  }
  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadVatsList()
  loadLogs()
})
</script>

<template>
  <div class="wrapper">
    <PageHeader title="Журнал логов" subtitle="Все ВАТС">
      <template #actions>
        <CustomButton variant="outline" @click="loadLogs" :disabled="isLoading">
          {{ isLoading ? 'Загрузка...' : '⟳ Обновить' }}
        </CustomButton>
        <CustomButton @click="exportLogs" :disabled="!logsData.length">
          Экспорт
        </CustomButton>
      </template>
    </PageHeader>

    <div v-if="errorMessage" class="error-message">
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = ''">×</button>
    </div>

    <div class="search-filters">
      <div class="filter-item">
        <CustomInput v-model="searchText" label="Поиск в логах" placeholder="Ключевое слово..." />
      </div>
      <div class="filter-item">
        <CustomSelect v-model="selectedLevel" label="Уровень" :options="levelOptions" />
      </div>
      <div class="filter-item">
        <CustomSelect v-model="selectedVats" label="ВАТС" :options="vatsOptions" :disabled="isLoadingVats" />
      </div>
      <div class="filter-actions">
      </div>
    </div>

    <div class="filter-info">
      <span class="results-count">{{ resultsCountText }}</span>
      <span v-if="hasActiveFilters" class="active-filters">(активные фильтры)</span>
      <CustomButton
        variant="outline"
        @click="resetFilters"
        :disabled="isLoading || !hasActiveFilters"
        class="reset-button"
      >
        Сбросить фильтры
      </CustomButton>
    </div>

    <main class="content">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка логов...</p>
      </div>
      <div v-else-if="logsData.length === 0" class="empty-state">
        <p>По вашему запросу ничего не найдено</p>
      </div>
      <LogsTable v-else :logs-data="logsData" />
    </main>

    <div class="pagination" v-if="totalItems > 0">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Назад</button>
      <span>Страница {{ currentPage }} из {{ totalPages || 1 }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Вперёд</button>
      <select :value="pageSize" @change="changePageSize(Number(($event.target as HTMLSelectElement).value))">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
    </div>
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
  gap: 0.75rem;
  flex: 1;
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
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
