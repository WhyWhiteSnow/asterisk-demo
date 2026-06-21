<template>
  <div class="constructor-panel">
    <div class="panel-toolbar">
      <CustomButton variant="outline" @click="loadDialplan" :disabled="loading">
        {{ loading ? 'Загрузка...' : 'Обновить с сервера' }}
      </CustomButton>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="hasManagedRows" class="managed-warning">
      Часть маршрутизации сгенерирована автоматически (номера, переадресация, шаблоны).
      Ручное редактирование этих строк может быть перезаписано при сохранении бизнес-настроек.
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner large"></div>
      <p>Загрузка диалплана...</p>
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
        :instance-id="instanceId"
        :context-name="selectedContext"
        :rows="contextsMap[selectedContext]!"
        @update="saveContext"
      />
    </div>

    <Teleport to="body">
      <div v-if="showNewContextModal" class="modal-overlay modal-overlay--nested" @click="showNewContextModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Создание контекста</h3>
          </div>
          <div class="modal-body">
            <CustomInput
              v-model="newContextName"
              label="Имя контекста"
              placeholder="например, incoming"
              :with-icon="false"
              :has-error="!!newContextError"
              @input="newContextError = ''"
            />
            <span v-if="newContextError" class="field-error">{{ newContextError }}</span>
            <p class="field-hint">Контекст сохраняется на сервере с заготовкой строки — её можно изменить или удалить.</p>
          </div>
          <div class="modal-footer">
            <CustomButton variant="outline" @click="showNewContextModal = false">Отмена</CustomButton>
            <CustomButton @click="createNewContext" :disabled="creatingContext">
              {{ creatingContext ? 'Создание...' : 'Создать' }}
            </CustomButton>
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
import ContextEditor from '@/components/dialplan/ContextEditor.vue'
import { dialplanApi } from '@/api/dialplanApi'
import type { DialplanRowResponse, DialplanRowUpdate } from '@/types/dialplan'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { parseApiError } from '@/utils/parseApiError'
import { useModalEscape } from '@/composables/useModalEscape'

const props = defineProps<{
  instanceId: number
}>()

const emit = defineEmits<{
  (e: 'contexts-changed'): void
}>()

const toast = useToastStore()
const confirmStore = useConfirmStore()
const loading = ref(false)
const error = ref('')
const editorRef = ref<InstanceType<typeof ContextEditor> | null>(null)
const newContextError = ref('')
const creatingContext = ref(false)

const CONTEXT_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

const allRows = ref<DialplanRowResponse[]>([])
const contextsMap = ref<Record<string, DialplanRowResponse[]>>({})
const selectedContext = ref<string | null>(null)

const hasManagedRows = computed(() =>
  allRows.value.some(row => row.var_val.includes('@managed:'))
)

const showNewContextModal = ref(false)
useModalEscape(showNewContextModal, () => { showNewContextModal.value = false })
const newContextName = ref('')

const contextOptions = computed(() => Object.keys(contextsMap.value).map(ctx => ({ value: ctx, label: ctx })))

const handleContextChange = async (newContext: string | number | null) => {
  if (newContext === null) return
  const contextName = String(newContext)
  if (!editorRef.value) {
    selectedContext.value = contextName
    return
  }
  if (editorRef.value.isDirty()) {
    const confirmed = await confirmStore.confirm({
      title: 'Несохранённые изменения',
      message:
        'У вас есть несохранённые изменения в текущем контексте. Переключиться без сохранения?',
      confirmText: 'Переключить',
      variant: 'danger',
    })
    if (!confirmed) return
  }
  selectedContext.value = contextName
}

const loadDialplan = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await dialplanApi.getDialplan(props.instanceId)
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
    if (selectedContext.value && !contextsMap.value[selectedContext.value]) {
      selectedContext.value = Object.keys(map)[0] ?? null
    } else if (Object.keys(map).length > 0 && !selectedContext.value) {
      selectedContext.value = Object.keys(map)[0] ?? null
    }
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка загрузки диалплана')
    error.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    loading.value = false
  }
}

const saveContext = async (updatedRows: DialplanRowUpdate[]) => {
  if (!selectedContext.value) return
  try {
    await dialplanApi.updateContext(props.instanceId, selectedContext.value, {
      filename: 'extensions.conf',
      rows: updatedRows,
      change_author: 'user',
      reload_asterisk: true,
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
    emit('contexts-changed')
    toast.addToast({ message: `Контекст "${selectedContext.value}" сохранён и применён в Asterisk`, type: 'success' })
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Ошибка сохранения контекста')
    toast.addToast({ message: msg, type: 'error' })
  }
}

const openNewContextModal = () => {
  newContextName.value = ''
  newContextError.value = ''
  showNewContextModal.value = true
}

const computeNextCatMetric = (): number => {
  if (allRows.value.length === 0) return 1
  return Math.max(...allRows.value.map((row) => row.cat_metric)) + 1
}

const buildPlaceholderRow = (name: string, catMetric: number): DialplanRowUpdate => ({
  cat_metric: catMetric,
  var_metric: 1,
  category: name,
  var_name: 'exten',
  var_val: 's,1,NoOp(заготовка — настройте маршрут)',
  commented: 0,
})

const createNewContext = async () => {
  const name = newContextName.value.trim()
  newContextError.value = ''
  if (!name) {
    newContextError.value = 'Имя контекста не может быть пустым'
    return
  }
  if (!CONTEXT_NAME_RE.test(name)) {
    newContextError.value =
      'Имя должно начинаться с буквы или подчёркивания и содержать только латиницу, цифры, дефис и подчёркивание'
    return
  }
  if (contextsMap.value[name]) {
    newContextError.value = 'Контекст с таким именем уже существует'
    return
  }

  creatingContext.value = true
  try {
    const placeholderRow = buildPlaceholderRow(name, computeNextCatMetric())
    await dialplanApi.updateContext(props.instanceId, name, {
      filename: 'extensions.conf',
      rows: [placeholderRow],
      change_author: 'user',
      description: `Created context ${name}`,
      reload_asterisk: true,
    })
    await loadDialplan()
    selectedContext.value = name
    showNewContextModal.value = false
    emit('contexts-changed')
    toast.addToast({
      message: `Контекст «${name}» создан. Настройте маршруты в редакторе.`,
      type: 'success',
    })
  } catch (err: unknown) {
    const msg = parseApiError(err, 'Не удалось создать контекст')
    newContextError.value = msg
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    creatingContext.value = false
  }
}

watch(() => props.instanceId, () => {
  contextsMap.value = {}
  selectedContext.value = null
  loadDialplan()
})

onMounted(() => {
  loadDialplan()
})
</script>

<style scoped>
.constructor-panel {
  width: 100%;
}
.panel-toolbar {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-bottom: var(--spacing-md);
}
.contexts-toolbar {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  margin-bottom: var(--spacing-lg);
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
.managed-warning {
  background-color: rgba(241, 196, 15, 0.12);
  border: 1px solid rgba(241, 196, 15, 0.35);
  color: var(--color-text);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  font-size: 0.875rem;
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
  padding: var(--spacing-md);
}
.modal-content {
  width: min(480px, 100%);
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
.field-hint {
  margin-top: var(--spacing-sm);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
</style>
