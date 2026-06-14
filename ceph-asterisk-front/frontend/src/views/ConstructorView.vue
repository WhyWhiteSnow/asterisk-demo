<template>
  <div class="constructor-page">
    <PageHeader title="Конструктор диалплана" subtitle="Редактирование extensions.conf">
      <template #actions>
        <div class="header-actions">
          <CustomSelect
            v-model="selectedInstanceId"
            :options="instanceOptions"
            label="ВАТС"
            placeholder="Выберите ВАТС"
            :disabled="loading"
          />
          <CustomButton variant="outline" @click="loadDialplan" :disabled="loading || !selectedInstanceId" class="btn">
            Загрузить
          </CustomButton>
        </div>
      </template>
    </PageHeader>

    <div v-if="error" class="error-message">{{ error }}</div>

    <main class="content">
      <div v-if="loading" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка диалплана...</p>
      </div>
      <div v-else-if="!selectedInstanceId" class="empty-state">
        <p>Выберите ВАТС для редактирования диалплана</p>
      </div>
      <div v-else-if="Object.keys(contextsMap).length === 0" class="empty-state">
        <p>Нет контекстов в диалплане</p>
        <CustomButton @click="openNewContextModal">Создать первый контекст</CustomButton>
      </div>
      <div v-else>
        <div class="contexts-toolbar">
          <CustomSelect
            :modelValue="selectedContext"
            :options="contextOptions"
            label="Контекст"
            @update:modelValue="handleContextChange"
          />
          <CustomButton size="sm" @click="openNewContextModal">Новый контекст</CustomButton>
        </div>
        <ContextEditor
          v-if="selectedContext && contextsMap[selectedContext]"
          :key="selectedContext"
          ref="editorRef"
          :context-name="selectedContext"
          :rows="contextsMap[selectedContext]!"
          @update="saveContext"
        />
        <div class="global-actions">
          <CustomButton variant="primary" @click="saveAllChanges" :disabled="savingAll">
            Сохранить весь диалплан
          </CustomButton>
          <CustomButton variant="outline" @click="loadDialplan" :disabled="loading">
            Отменить изменения
          </CustomButton>
        </div>
      </div>
    </main>

    <!-- Модальное окно создания контекста -->
    <div v-if="showNewContextModal" class="modal-overlay" @click="showNewContextModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Создание контекста</h3>
        </div>
        <div class="modal-body">
          <CustomInput v-model="newContextName" label="Имя контекста" placeholder="например, incoming" />
        </div>
        <div class="modal-footer">
          <CustomButton variant="outline" @click="showNewContextModal = false">Отмена</CustomButton>
          <CustomButton @click="createNewContext">Создать</CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import ContextEditor from '@/components/dialplan/ContextEditor.vue'
import { dialplanApi } from '@/api/dialplanApi'
import { vatsApi } from '@/api/vatsApi'
import type { VatsInstanceFromAPI } from '@/types/vats'
import type { DialplanRowResponse, DialplanRowUpdate } from '@/types/dialplan'
import { useToastStore } from '@/stores/toast'
import axios from 'axios'

const toast = useToastStore()
const instances = ref<VatsInstanceFromAPI[]>([])
const selectedInstanceId = ref<number | null>(null)
const loading = ref(false)
const savingAll = ref(false)
const error = ref('')
const editorRef = ref<InstanceType<typeof ContextEditor> | null>(null)

// Данные диалплана
const allRows = ref<DialplanRowResponse[]>([])
const contextsMap = ref<Record<string, DialplanRowResponse[]>>({})
const selectedContext = ref<string | null>(null)

// Модальное окно
const showNewContextModal = ref(false)
const newContextName = ref('')

const instanceOptions = computed(() => instances.value.map(i => ({ value: i.id, label: i.name })))
const contextOptions = computed(() => Object.keys(contextsMap.value).map(ctx => ({ value: ctx, label: ctx })))

const loadInstances = async () => {
  try {
    instances.value = await vatsApi.getVatsList()
  } catch (err: unknown) {
    let msg = 'Ошибка загрузки ВАТС'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    error.value = msg
  }
}

const handleContextChange = (newContext: string | number | null) => {
  if (newContext === null) return
  const contextName = String(newContext)
  if (!editorRef.value) {
    selectedContext.value = contextName
    return
  }
  // Если есть несохранённые изменения — спрашиваем пользователя
  if (editorRef.value.isDirty()) {
    const confirmed = window.confirm(
      'У вас есть несохранённые изменения в текущем контексте. Переключиться без сохранения?'
    )
    if (!confirmed) return
  }
  // Если изменений нет или пользователь подтвердил — переключаем
  selectedContext.value = contextName
}

const loadDialplan = async () => {
  if (!selectedInstanceId.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await dialplanApi.getDialplan(selectedInstanceId.value)
    allRows.value = data.rows
    const map: Record<string, DialplanRowResponse[]> = {}
    for (const row of allRows.value) {
      const category = row.category
      if (!map[category]) map[category] = []
      map[category].push(row)
    }
    for (const ctx in map) {
      map[ctx]?.sort((a, b) => a.var_metric - b.var_metric)
    }
    contextsMap.value = map
    // Если выбранный контекст отсутствует – сбросить
    if (selectedContext.value && !contextsMap.value[selectedContext.value]) {
      selectedContext.value = Object.keys(map)[0] ?? null
    } else if (Object.keys(map).length > 0 && !selectedContext.value) {
      selectedContext.value = Object.keys(map)[0] ?? null
    }
  } catch (err: unknown) {
    let msg = 'Ошибка загрузки диалплана'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    error.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    loading.value = false
  }
}

const saveContext = async (updatedRows: DialplanRowUpdate[]) => {
  if (!selectedInstanceId.value || !selectedContext.value) return
  try {
    await dialplanApi.updateContext(selectedInstanceId.value, selectedContext.value, {
      filename: 'extensions.conf',
      rows: updatedRows,
      change_author: 'user',
      reload_asterisk: false,
    })
    const newRows: DialplanRowResponse[] = updatedRows.map((row, idx) => ({
      id: Date.now() + idx,
      cat_metric: row.cat_metric,
      var_metric: row.var_metric,
      category: row.category,
      var_name: row.var_name,
      var_val: row.var_val,
      commented: row.commented ?? 0,
    }))
    contextsMap.value[selectedContext.value] = newRows
    toast.addToast({ message: `Контекст "${selectedContext.value}" сохранён`, type: 'success' })
  } catch (err: unknown) {
    let msg = 'Ошибка сохранения контекста'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    toast.addToast({ message: msg, type: 'error' })
  }
}

const saveAllChanges = async () => {
  if (!selectedInstanceId.value) return
  if (editorRef.value?.isDirty()) {
    if (confirm('В текущем контексте есть несохранённые изменения. Сохранить его перед сохранением всего диалплана?')) {
      toast.addToast({ message: 'Сначала сохраните текущий контекст', type: 'warning' })
      return
    }
  }
  const allUpdatedRows: DialplanRowUpdate[] = []
  for (const ctx in contextsMap.value) {
    const rows = contextsMap.value[ctx]
    if (!rows) continue
    rows.forEach(row => {
      allUpdatedRows.push({
        cat_metric: row.cat_metric,
        var_metric: row.var_metric,
        category: row.category,
        var_name: row.var_name,
        var_val: row.var_val,
        commented: row.commented,
      })
    })
  }
  savingAll.value = true
  try {
    await dialplanApi.updateDialplan(selectedInstanceId.value, {
      filename: 'extensions.conf',
      rows: allUpdatedRows,
      change_author: 'user',
      reload_asterisk: true,
    })
    toast.addToast({ message: 'Весь диалплан сохранён и перезагружен', type: 'success' })
  } catch (err: unknown) {
    let msg = 'Ошибка сохранения диалплана'
    if (axios.isAxiosError(err)) msg = err.response?.data?.detail || err.message
    else if (err instanceof Error) msg = err.message
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    savingAll.value = false
  }
}

const openNewContextModal = () => {
  newContextName.value = ''
  showNewContextModal.value = true
}

const createNewContext = () => {
  const name = newContextName.value.trim()
  if (!name) {
    toast.addToast({ message: 'Имя контекста не может быть пустым', type: 'warning' })
    return
  }
  if (contextsMap.value[name]) {
    toast.addToast({ message: 'Контекст с таким именем уже существует', type: 'warning' })
    return
  }
  // Добавляем пустой контекст локально
  contextsMap.value[name] = []
  selectedContext.value = name
  showNewContextModal.value = false
  toast.addToast({ message: `Контекст "${name}" создан`, type: 'success' })
}

watch(selectedInstanceId, () => {
  contextsMap.value = {}
  selectedContext.value = null
  if (selectedInstanceId.value) loadDialplan()
})

onMounted(() => {
  loadInstances()
})
</script>

<style scoped>
.constructor-page {
  width: 100%;
  padding: 0 var(--spacing-md);
}
.header-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}
.header-actions .btn {
  margin-top: 1.7vh;
}
.content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-top: var(--spacing-md);
}
.contexts-toolbar {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  margin-bottom: var(--spacing-lg);
}
.global-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
}
.error-message, .loading-state, .empty-state {
  text-align: center;
  padding: var(--spacing-xl);
}
/* Модальное окно */
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
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  width: 90%;
  max-width: 450px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.modal-header {
  margin-bottom: var(--spacing-md);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}
</style>