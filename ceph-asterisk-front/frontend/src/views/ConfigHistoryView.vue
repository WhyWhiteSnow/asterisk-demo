<template>
  <div class="config-history-page">
    <PageHeader title="История конфигураций ВАТС" subtitle="Просмотр и откат версий">
      <template #actions>
        <CustomButton variant="outline" @click="loadInstances" :disabled="loading">
          ⟳ Обновить список ВАТС
        </CustomButton>
      </template>
    </PageHeader>

    <div class="filters-panel">
      <div class="filter-item">
        <CustomSelect
          v-model="selectedInstanceId"
          :options="instanceOptions"
          label="ВАТС"
          placeholder="Выберите ВАТС"
          :disabled="loading"
          @change="onInstanceChange"
        />
      </div>
      <div class="filter-item">
        <CustomSelect
          v-model="selectedConfigType"
          :options="configTypeOptions"
          label="Тип конфигурации"
          :disabled="loading || !selectedInstanceId"
        />
      </div>
      <CustomButton
        variant="primary"
        class="load-history-btn"
        @click="loadHistory"
        :disabled="loading || !selectedInstanceId || !selectedConfigType"
      >
        Загрузить историю
      </CustomButton>
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

    <main class="content">
      <div v-if="loading" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка истории...</p>
      </div>
      <div v-else-if="!selectedInstanceId" class="empty-state">
        <p>Выберите ВАТС и тип конфигурации</p>
      </div>
      <div v-else-if="historyItems.length === 0" class="empty-state">
        <p>История конфигурации пуста</p>
      </div>
      <div v-else>
        <!-- Текущий конфиг -->
        <div class="current-config">
          <div class="current-config-header">
            <h3>Текущий конфиг: {{ currentFilename || selectedConfigType }}</h3>
            <CustomButton size="sm" variant="outline" @click="loadCurrentConfig">
              Обновить
            </CustomButton>
          </div>
          <pre v-if="currentConfigContent" class="config-preview">{{ currentConfigContent }}</pre>
          <div v-else-if="currentConfigLoading" class="loading-placeholder">Загрузка...</div>
          <div v-else class="empty-placeholder">Не загружен</div>
        </div>

        <!-- Таблица истории -->
        <div class="history-table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th>Версия</th>
                <th>Дата</th>
                <th>Автор</th>
                <th>Описание</th>
                <th style="width: 180px">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in historyItems" :key="entry.id" :class="{ 'active-version': entry.version === currentVersion }">
                <td>{{ entry.version }}</td>
                <td>{{ formatDate(entry.created_at) }}</td>
                <td>{{ entry.author }}</td>
                <td>{{ entry.description || '—' }}</td>
                <td class="actions">
                  <CustomButton size="sm" variant="outline" @click="viewVersion(entry)">
                    Просмотр
                  </CustomButton>
                  <CustomButton size="sm" variant="outline" @click="selectForCompare(entry)">
                    Сравнить
                  </CustomButton>
                  <CustomButton size="sm" variant="danger" @click="rollbackVersion(entry)">
                    Откат
                  </CustomButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Панель сравнения -->
        <div v-if="compareVersionA && compareVersionB" class="compare-panel">
          <div class="compare-header">
            <h4>Сравнение версий {{ compareVersionA.version }} и {{ compareVersionB.version }}</h4>
            <CustomButton size="sm" variant="outline" @click="clearCompare">Очистить</CustomButton>
          </div>
          <div class="compare-content">
            <div class="compare-col">
              <div class="compare-title">Версия {{ compareVersionA.version }}</div>
              <pre class="diff-pre">{{ compareVersionA.content }}</pre>
            </div>
            <div class="compare-col">
              <div class="compare-title">Версия {{ compareVersionB.version }}</div>
              <pre class="diff-pre">{{ compareVersionB.content }}</pre>
            </div>
          </div>
          <div class="diff-buttons">
            <CustomButton size="sm" variant="outline" @click="showDiff">Показать различия</CustomButton>
          </div>
          <div v-if="diffHtml" class="diff-result" v-html="diffHtml"></div>
        </div>
      </div>
    </main>

    <!-- Модальное окно просмотра содержимого -->
    <div v-if="showModal" class="modal-overlay" @click="showModal = false">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>{{ modalFilename }} (версия {{ modalVersion }})</h3>
        </div>
        <pre class="config-content">{{ modalContent }}</pre>
        <div class="modal-footer">
          <CustomButton @click="showModal = false">Закрыть</CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import { configHistoryApi } from '@/api/configHistoryApi'
import { vatsApi } from '@/api/vatsApi'
import type { ConfigHistoryEntry, ConfigTypeInfo } from '@/types/configHistory'
import type { VatsInstanceFromAPI } from '@/types/vats'
import { useToastStore } from '@/stores/toast'
import { useModalEscape } from '@/composables/useModalEscape'
import { parseApiError } from '@/utils/parseApiError'
import * as Diff from 'diff'

const toast = useToastStore()

// Состояния
const instances = ref<VatsInstanceFromAPI[]>([])
const selectedInstanceId = ref<number | null>(null)
const selectedConfigType = ref('')
const configTypes = ref<ConfigTypeInfo[]>([])
const configTypeOptions = computed(() =>
  configTypes.value
    .filter((t) => t.history_supported)
    .map((t) => ({ value: t.type, label: t.filename }))
)

const historyItems = ref<ConfigHistoryEntry[]>([])
const currentFilename = ref('')
const loading = ref(false)
const errorMessage = ref('')
const currentConfigLoading = ref(false)
const currentConfigContent = ref('')
const currentVersion = ref<number | null>(null)

// Сравнение
const compareVersionA = ref<{ version: number; content: string } | null>(null)
const compareVersionB = ref<{ version: number; content: string } | null>(null)
const diffHtml = ref('')

// Модальное окно просмотра
const showModal = ref(false)
const modalContent = ref('')
const modalFilename = ref('')
const modalVersion = ref<number | null>(null)

useModalEscape(showModal, () => {
  showModal.value = false
})

// Опции для селектора ВАТС
const instanceOptions = computed(() => {
  return instances.value.map(i => ({ value: i.id, label: i.name }))
})

// Загрузка списка ВАТС
const loadInstances = async () => {
  try {
    instances.value = await vatsApi.getVatsList()
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки ВАТС')
    errorMessage.value = msg
    toast.addToast({ message: msg, type: 'error' })
  }
}

const loadConfigTypes = async (instanceId: number) => {
  try {
    const resp = await configHistoryApi.getConfigTypes(instanceId)
    configTypes.value = resp.types
    const supported = resp.types.filter((t) => t.history_supported)
    if (supported.length === 0) {
      selectedConfigType.value = ''
      return
    }
    if (!supported.some((t) => t.type === selectedConfigType.value)) {
      selectedConfigType.value = supported[0]!.type
    }
  } catch (err: unknown) {
    configTypes.value = []
    selectedConfigType.value = ''
    const msg = parseApiError(err, 'Ошибка загрузки типов конфигурации')
    toast.addToast({ message: msg, type: 'error' })
  }
}

const onInstanceChange = async () => {
  historyItems.value = []
  currentConfigContent.value = ''
  currentVersion.value = null
  clearCompare()
  if (selectedInstanceId.value) {
    await loadConfigTypes(selectedInstanceId.value)
  } else {
    configTypes.value = []
    selectedConfigType.value = ''
  }
}

// Загрузка истории
const loadHistory = async () => {
  if (!selectedInstanceId.value || !selectedConfigType.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const resp = await configHistoryApi.getHistory(selectedInstanceId.value, selectedConfigType.value)
    historyItems.value = resp.items
    currentFilename.value = resp.filename
    await loadCurrentConfig()
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки истории')
    errorMessage.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    loading.value = false
  }
}

// Загрузка текущего конфига
const loadCurrentConfig = async () => {
  if (!selectedInstanceId.value || !selectedConfigType.value) return
  currentConfigLoading.value = true
  try {
    const content = await configHistoryApi.getCurrentConfig(selectedInstanceId.value, selectedConfigType.value)
    currentConfigContent.value = content
    // Здесь можно попытаться определить текущую версию (если API возвращает заголовок или можно сравнить с последней историей)
    if (historyItems.value.length > 0) {
      // Предположим, что самая свежая версия — текущая
      currentVersion.value = historyItems.value[0]?.version ?? null
    } else {
      currentVersion.value = null
    }
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки текущего конфига')
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    currentConfigLoading.value = false
  }
}

// Просмотр версии
const viewVersion = async (entry: ConfigHistoryEntry) => {
  try {
    const contentObj = await configHistoryApi.getVersionContent(
      selectedInstanceId.value!,
      selectedConfigType.value,
      entry.version
    )
    modalContent.value = contentObj.content
    modalFilename.value = contentObj.filename
    modalVersion.value = entry.version
    showModal.value = true
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки версии')
    toast.addToast({ message: msg, type: 'error' })
  }
}

// Откат к версии
const rollbackVersion = async (entry: ConfigHistoryEntry) => {
  if (!confirm(`Откатить конфигурацию к версии ${entry.version}? Действие необратимо.`)) return
  try {
    const result = await configHistoryApi.rollback(selectedInstanceId.value!, selectedConfigType.value, {
      version: entry.version,
      change_author: 'user',
      reload_asterisk: true,
    })
    toast.addToast({ message: `Откат успешен: ${result.message}`, type: 'success' })
    // Перезагружаем историю и текущий конфиг
    await loadHistory()
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка отката')
    toast.addToast({ message: msg, type: 'error' })
  }
}

// Выбор версии для сравнения
const selectForCompare = async (entry: ConfigHistoryEntry) => {
  try {
    const contentObj = await configHistoryApi.getVersionContent(
      selectedInstanceId.value!,
      selectedConfigType.value,
      entry.version
    )
    const versionData = { version: entry.version, content: contentObj.content }
    if (!compareVersionA.value) {
      compareVersionA.value = versionData
      toast.addToast({ message: `Версия ${entry.version} выбрана для сравнения (A)`, type: 'info' })
    } else if (!compareVersionB.value) {
      compareVersionB.value = versionData
      toast.addToast({ message: `Версия ${entry.version} выбрана для сравнения (B)`, type: 'info' })
    } else {
      // Если уже две выбраны, сбрасываем и выбираем заново
      compareVersionA.value = versionData
      compareVersionB.value = null
      diffHtml.value = ''
      toast.addToast({ message: `Сброшено. Версия ${entry.version} выбрана как A`, type: 'info' })
    }
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка загрузки версии для сравнения'), type: 'error' })
  }
}

// Очистка сравнения
const clearCompare = () => {
  compareVersionA.value = null
  compareVersionB.value = null
  diffHtml.value = ''
}

// Показать различия (упрощенная реализация через простое выделение)
const showDiff = () => {
  if (!compareVersionA.value || !compareVersionB.value) {
    toast.addToast({ message: 'Выберите две версии для сравнения', type: 'warning' })
    return
  }
  const a = compareVersionA.value.content
  const b = compareVersionB.value.content
  const changes = Diff.diffLines(a, b)
  let html = '<div class="diff-lines">'
  changes.forEach(part => {
    const color = part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-same'
    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  '
    const lines = part.value.split('\n')
    lines.forEach(line => {
      if (line !== '') {
        html += `<div class="diff-line ${color}">${prefix}${escapeHtml(line)}</div>`
      }
    })
  })
  html += '</div>'
  diffHtml.value = html
}

const escapeHtml = (text: string) => {
  return text.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;'
    if (m === '<') return '&lt;'
    if (m === '>') return '&gt;'
    return m
  })
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleString('ru-RU')
}

onMounted(() => {
  loadInstances()
})
</script>

<style scoped>
.config-history-page {
  width: 100%;
  padding: 0 var(--spacing-md);
}
.filters-panel {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  margin-bottom: var(--spacing-lg);
  background: var(--color-background-mute);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
.filter-item {
  flex: 1;
}
.content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-md);
}
.current-config {
  background: var(--color-background-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
}
.current-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}
.config-preview {
  background: var(--color-background-mute);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: 0.8rem;
  overflow-x: auto;
  max-height: 300px;
}
.load-history-btn {
  background-color: var(--color-background-soft);
}
.history-table-container {
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
}
.history-table th,
.history-table td {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.active-version {
  background-color: rgba(52, 152, 219, 0.1);
}
.actions {
  display: flex;
  gap: var(--spacing-xs);
}
.compare-panel {
  margin-top: var(--spacing-lg);
  border-top: 2px solid var(--color-border);
  padding-top: var(--spacing-lg);
}
.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}
.compare-content {
  display: flex;
  gap: var(--spacing-md);
}
.compare-col {
  flex: 1;
  background: var(--color-background-soft);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
}
.compare-title {
  font-weight: bold;
  margin-bottom: var(--spacing-sm);
}

.diff-added {
  background-color: #e6ffed;
  color: #1a7f37;
}
.diff-removed {
  background-color: #ffebe9;
  color: #cf222e;
}
.diff-same {
  color: var(--color-text);
}
.diff-line {
  font-family: monospace;
  white-space: pre-wrap;
  font-size: 0.8rem;
}
.diff-pre {
  background: var(--color-background-mute);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
}
.diff-buttons {
  margin-top: var(--spacing-md);
  text-align: center;
}
.diff-result {
  margin-top: var(--spacing-md);
  background: var(--color-background-mute);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  font-family: monospace;
  font-size: 0.8rem;
}
.diff-line {
  font-family: monospace;
  white-space: pre-wrap;
}
.diff-changed {
  background-color: #ffeeaa;
}
.diff-old {
  color: red;
  display: block;
}
.diff-new {
  color: green;
  display: block;
}
.loading-state, .empty-state, .error-message {
  padding: var(--spacing-lg);
  text-align: center;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content.large {
  max-width: 900px;
  width: 90%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}
.config-content {
  background: var(--color-background-soft);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.85rem;
  max-height: 500px;
  overflow-y: auto;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.modal-footer .custom-button {
  margin-left: var(--spacing-sm);
}
</style>