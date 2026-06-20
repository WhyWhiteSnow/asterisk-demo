<template>
  <div class="context-editor">
    <div class="context-header">
      <h3>{{ contextName }}</h3>
      <div class="actions">
        <CustomButton size="sm" @click="addRow" class="btn">+ Добавить строку</CustomButton>
        <CustomButton size="sm" variant="outline" @click="saveChanges" class="btn">
          Сохранить
        </CustomButton>
      </div>
    </div>
    <div class="blocks-panel">
      <span class="blocks-label">Добавить блок:</span>
      <div class="blocks-list">
        <CustomButton
          v-for="block in dialplanBlocks"
          :key="block.id"
          size="sm"
          variant="outline"
          class="block-btn"
          :title="block.description"
          @click="insertBlock(block)"
        >
          {{ block.label }}
        </CustomButton>
      </div>
    </div>
    <div class="rows-table-wrapper">
      <div class="rows-table">
        <!-- Заголовок -->
        <div class="row-item header-row">
          <div class="drag-placeholder"></div>
          <div class="type-col">Тип</div>
          <div class="ext-col">Номер</div>
          <div class="priority-col">Приоритет</div>
          <div class="app-col">Функция / Контекст</div>
          <div class="args-col">Аргументы / Значение</div>
          <div class="action-col"></div>
        </div>
        <!-- Строки -->
        <draggable
          v-model="localRows"
          item-key="tempId"
          handle=".drag-handle"
          @end="onDragEnd"
        >
          <template #item="{ element, index }">
            <div class="draggable-item" :class="getBlockRowClass(index)">
              <div
                v-if="isBlockStart(index)"
                class="block-group-header"
                :style="blockAccentStyle(element.blockId)"
              >
                <span class="block-badge">Блок: {{ element.blockLabel }}</span>
                <CustomButton
                  size="sm"
                  variant="outline"
                  class="block-remove-btn"
                  @click="removeBlock(element.blockId)"
                >
                  Удалить блок
                </CustomButton>
              </div>
              <div
                class="row-item"
                :class="{
                  'row-error': element.validationError,
                  'row-managed': element.isManaged,
                  'row-block-member': !!element.blockId,
                }"
                :style="blockAccentStyle(element.blockId)"
                :data-temp-id="element.tempId"
              >
                <span class="drag-handle">⋮⋮</span>
                <div class="type-col">
                  <CustomSelect
                    v-model="element.type"
                    :options="typeOptions"
                    class="type-select"
                    @update:modelValue="onTypeChange(element)"
                  />
                </div>
                <div class="ext-col">
                  <CustomInput
                    v-if="element.type === 'exten'"
                    type="text"
                    v-model="element.extension"
                    :with-icon="false"
                    class="ext-input"
                    placeholder="Номер"
                    @blur="validateRow(element)"
                  />
                </div>
                <div class="priority-col">
                  <CustomInput
                    v-if="element.type === 'exten'"
                    type="text"
                    v-model="element.priority"
                    :with-icon="false"
                    class="priority-input"
                    placeholder="1 или n"
                    @blur="validateRow(element)"
                  />
                </div>
                <div class="app-col">
                  <template v-if="element.type === 'exten'">
                    <CustomSelect
                      v-model="element.app"
                      :options="appOptions"
                      class="app-select"
                      placeholder="Выберите функцию"
                      @update:modelValue="validateRow(element)"
                    />
                  </template>
                  <template v-else-if="element.type === 'include'">
                    <CustomInput
                      v-model="element.includeContext"
                      :with-icon="false"
                      placeholder="Имя контекста"
                      @blur="validateRow(element)"
                    />
                  </template>
                  <template v-else-if="element.type === 'switch'">
                    <CustomInput
                      v-model="element.switchPattern"
                      :with-icon="false"
                      placeholder="Шаблон (например, _X.)"
                      @blur="validateRow(element)"
                    />
                  </template>
                </div>
                <div class="args-col">
                  <DialplanArgsEditor
                    v-if="element.type === 'exten'"
                    :app="element.app"
                    v-model="element.args"
                    :resources="editorResources"
                    :fallback-placeholder="argsPlaceholder(element.app)"
                    @update:modelValue="validateRow(element)"
                  />
                </div>
                <div class="action-col">
                  <CustomButton size="sm" variant="danger" @click="removeRow(index)">✕</CustomButton>
                </div>
              </div>
              <div v-if="element.validationError" class="row-error-message">
                {{ element.validationError }}
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import draggable from 'vuedraggable'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import DialplanArgsEditor from '@/components/dialplan/DialplanArgsEditor.vue'
import type { DialplanEditorResources } from '@/components/dialplan/DialplanArgsEditor.vue'
import type { DialplanRowResponse, DialplanRowUpdate } from '@/types/dialplan'
import { useConfirmStore } from '@/stores/confirm'
import {
  DIALPLAN_BLOCKS,
  resolveDialplanBlockRows,
  type DialplanBlockDefinition,
} from '@/constants/dialplanBlocks'
import { useToastStore } from '@/stores/toast'
import { vatsApi } from '@/api/vatsApi'
import { voicemailApi } from '@/api/voicemailApi'
import { audioApi } from '@/api/audioApi'
import { queuesApi } from '@/api/queuesApi'

const BLOCK_ACCENT_COLORS = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#2ecc71', '#e74c3c']

const confirmStore = useConfirmStore()
const toast = useToastStore()
const dialplanBlocks = DIALPLAN_BLOCKS

const typeOptions = [
  { value: 'exten', label: 'exten' },
  { value: 'include', label: 'include' },
  { value: 'switch', label: 'switch' },
]

// Реактивный список функций, чтобы можно было добавлять нестандартные
const appOptions = ref([
  { value: 'Dial', label: 'Dial' },
  { value: 'NoOp', label: 'NoOp' },
  { value: 'Hangup', label: 'Hangup' },
  { value: 'Goto', label: 'Goto' },
  { value: 'Answer', label: 'Answer' },
  { value: 'Wait', label: 'Wait' },
  { value: 'WaitExten', label: 'WaitExten' },
  { value: 'VoiceMail', label: 'VoiceMail' },
  { value: 'VoiceMailMain', label: 'VoiceMailMain' },
  { value: 'GotoIf', label: 'GotoIf' },
  { value: 'Queue', label: 'Queue' },
  { value: 'Playback', label: 'Playback' },
  { value: 'Background', label: 'Background' },
  { value: 'Set', label: 'Set' },
  { value: 'Gosub', label: 'Gosub' },
  { value: 'Return', label: 'Return' },
])

const argsPlaceholders: Record<string, string> = {
  Dial: 'Пример: SIP/101,20,tr',
  NoOp: 'Текст для логирования',
  Hangup: 'Причина (необязательно)',
  Goto: 'Контекст,расширение,приоритет',
  Answer: '',
  Wait: 'Секунды (например, 2)',
  WaitExten: 'Таймаут в секундах (например, 5), опции',
  Voicemail: 'Ящик@контекст, опции',
  Queue: 'Имя_очереди, опции',
  Playback: 'Имя_файла',
  Background: 'Имя_файла',
  Set: 'ПЕРЕМЕННАЯ=значение',
  Gosub: 'Контекст,расширение,приоритет',
  Return: '',
}

interface RowItem {
  tempId: number
  type: 'exten' | 'include' | 'switch'
  extension: string
  priority: string
  app: string
  args: string
  includeContext: string
  switchPattern: string
  validationError: string | null
  useParens: boolean
  isManaged: boolean
  blockId: string | null
  blockLabel: string | null
}

const props = defineProps<{
  instanceId: number
  contextName: string
  rows: DialplanRowResponse[]
}>()

const emit = defineEmits<{
  (e: 'update', rows: DialplanRowUpdate[]): void
}>()

const localRows = ref<RowItem[]>([])
const originalRows = ref<RowItem[]>([])
const editorResources = ref<DialplanEditorResources>({
  extensions: [],
  mailboxes: [],
  audioFiles: [],
  queues: [],
})

const loadEditorResources = async () => {
  if (!props.instanceId) return
  try {
    const [users, boxes, audio, queues] = await Promise.all([
      vatsApi.getVatsUsers(props.instanceId),
      voicemailApi.getBoxes(props.instanceId),
      audioApi.getFiles(),
      queuesApi.getQueues(props.instanceId),
    ])
    editorResources.value = {
      extensions: users.map((user) => user.id),
      mailboxes: boxes,
      audioFiles: audio,
      queues,
    }
  } catch {
    // Редактор работает и без справочников — остаётся текстовый ввод
  }
}

const blockColor = (blockId: string | null | undefined): string => {
  if (!blockId) return 'transparent'
  let hash = 0
  for (let i = 0; i < blockId.length; i++) {
    hash = (hash + blockId.charCodeAt(i)) % BLOCK_ACCENT_COLORS.length
  }
  return BLOCK_ACCENT_COLORS[hash] ?? BLOCK_ACCENT_COLORS[0]
}

const blockAccentStyle = (blockId: string | null | undefined) =>
  blockId ? { '--block-accent': blockColor(blockId) } : undefined

const isBlockStart = (index: number): boolean => {
  const row = localRows.value[index]
  if (!row?.blockId) return false
  const prev = index > 0 ? localRows.value[index - 1] : null
  return !prev || prev.blockId !== row.blockId
}

const isBlockEnd = (index: number): boolean => {
  const row = localRows.value[index]
  if (!row?.blockId) return false
  const next = index < localRows.value.length - 1 ? localRows.value[index + 1] : null
  return !next || next.blockId !== row.blockId
}

const getBlockRowClass = (index: number) => {
  const row = localRows.value[index]
  if (!row?.blockId) return {}
  const start = isBlockStart(index)
  const end = isBlockEnd(index)
  return {
    'block-row': true,
    'block-row--start': start,
    'block-row--middle': !start && !end,
    'block-row--end': end,
    'block-row--single': start && end,
  }
}

// Добавление недостающей функции в appOptions
const ensureAppOption = (appName: string) => {
  if (appName && !appOptions.value.some(opt => opt.value === appName)) {
    appOptions.value.push({ value: appName, label: appName })
  }
}

const convertApiToRows = (apiRows: DialplanRowResponse[]): RowItem[] => {
  const result: RowItem[] = []
  for (const row of apiRows) {
    if (row.commented === 1) continue
    if (row.var_name === 'exten') {
      const val = row.var_val
      const parts = val.split(',')
      if (parts.length < 3) continue
      const extension = parts[0]
      const priority = parts[1]
      if (!extension || !priority) continue
      const rest = parts.slice(2).join(',')

      let app = ''
      let args = ''
      const parenOpen = rest.indexOf('(')
      if (parenOpen !== -1) {
        app = rest.substring(0, parenOpen)
        const parenClose = rest.indexOf(')', parenOpen)
        args = parenClose !== -1 ? rest.substring(parenOpen + 1, parenClose) : rest.substring(parenOpen + 1)
      } else {
        const commaIndex = rest.indexOf(',')
        if (commaIndex !== -1) {
          app = rest.substring(0, commaIndex)
          args = rest.substring(commaIndex + 1)
        } else {
          app = rest
        }
      }
      if (app) ensureAppOption(app)
      result.push({
        tempId: row.id || Date.now() + result.length,
        type: 'exten',
        extension,
        priority,
        app: app || 'NoOp',
        args,
        includeContext: '',
        switchPattern: '',
        validationError: null,
        useParens: true,
        isManaged: row.var_val.includes('@managed:'),
        blockId: null,
        blockLabel: null,
      })
    } else if (row.var_name === 'include') {
      result.push({
        tempId: row.id || Date.now() + result.length,
        type: 'include',
        extension: '',      // не используется
        priority: '',       // пустая строка
        app: '',
        args: '',
        includeContext: row.var_val,
        switchPattern: '',
        validationError: null,
        useParens: false,
        isManaged: row.var_val.includes('@managed:'),
        blockId: null,
        blockLabel: null,
      })
    } else if (row.var_name === 'switch') {
      result.push({
        tempId: row.id || Date.now() + result.length,
        type: 'switch',
        extension: '',
        priority: '',
        app: '',
        args: '',
        includeContext: '',
        switchPattern: row.var_val,
        validationError: null,
        useParens: false,
        isManaged: row.var_val.includes('@managed:'),
        blockId: null,
        blockLabel: null,
      })
    }
  }
  return result
}

const convertRowsToApi = (rows: RowItem[]): DialplanRowUpdate[] => {
  return rows.map((row, idx): DialplanRowUpdate => {
    let varName = ''
    let varVal = ''
    if (row.type === 'exten') {
      varName = 'exten'
      const tail =
        row.args !== ''
          ? `${row.app}(${row.args})`
          : row.useParens === false
            ? row.app
            : `${row.app}()`
      varVal = `${row.extension},${row.priority},${tail}`
    } else if (row.type === 'include') {
      varName = 'include'
      varVal = row.includeContext
    } else if (row.type === 'switch') {
      varName = 'switch'
      varVal = row.switchPattern
    }
    return {
      cat_metric: 0,
      var_metric: idx + 1,
      category: props.contextName,
      var_name: varName,
      var_val: varVal,
      commented: 0,
    }
  })
}

const insertBlock = async (block: DialplanBlockDefinition) => {
  let extension = block.defaultExtension ?? ''
  if (block.needsExtension) {
    const input = window.prompt(
      `${block.description}\n\nВведите номер (extension):`,
      extension || '101'
    )
    if (input === null) return
    extension = input.trim()
    if (!extension) {
      toast.addToast({ message: 'Номер не указан', type: 'warning' })
      return
    }
  }

  const resolved = resolveDialplanBlockRows(block, extension)
  const baseId = Date.now()
  const blockGroupId = `${block.id}-${baseId}`
  const newRows: RowItem[] = resolved.map((row, idx) => {
    if (row.app) ensureAppOption(row.app)
    const useParens = !['GotoIf', 'Goto'].includes(row.app)
    return {
      tempId: baseId + idx,
      type: 'exten' as const,
      extension: row.extension,
      priority: row.priority,
      app: row.app,
      args: row.args,
      includeContext: '',
      switchPattern: '',
      validationError: null,
      useParens,
      isManaged: false,
      blockId: blockGroupId,
      blockLabel: block.label,
    }
  })
  localRows.value.push(...newRows)
  toast.addToast({ message: `Блок «${block.label}» добавлен (${newRows.length} строк)`, type: 'success' })
  nextTick(() => {
    const firstRow = document.querySelector(`[data-temp-id="${newRows[0]?.tempId}"]`)
    firstRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

const addRow = () => {
  let maxNumericPriority = 0
  for (const row of localRows.value) {
    if (row.type === 'exten' && row.priority !== 'n') {
      const p = Number(row.priority)
      if (!isNaN(p) && p > maxNumericPriority) maxNumericPriority = p
    }
  }
  const newPriority = (maxNumericPriority + 1).toString()
  const newId = Date.now()
  localRows.value.push({
    tempId: newId,
    type: 'exten',
    extension: '',
    priority: newPriority,
    app: 'NoOp',
    args: '',
    includeContext: '',
    switchPattern: '',
    validationError: null,
    useParens: true,
    isManaged: false,
    blockId: null,
    blockLabel: null,
  })
  nextTick(() => {
    const input = document.querySelector(
      `[data-temp-id="${newId}"] .ext-input input`
    ) as HTMLInputElement | null
    input?.focus()
  })
}

// Валидация...
const validateRow = (row: RowItem) => {
  row.validationError = null
  if (row.type === 'exten') {
    if (!row.extension) {
      row.validationError = 'Укажите номер (extension)'
    } else if (row.priority !== 'n' && (isNaN(Number(row.priority)) || Number(row.priority) < 1)) {
      row.validationError = 'Приоритет должен быть числом ≥ 1 или n'
    } else if (!row.app) {
      row.validationError = 'Выберите функцию'
    } else if (row.app === 'Dial' && !row.args.trim()) {
      row.validationError = 'Dial требует аргументов (например, SIP/101)'
    }
  } else if (row.type === 'include') {
    if (!row.includeContext.trim()) {
      row.validationError = 'Укажите имя контекста для включения'
    }
  } else if (row.type === 'switch') {
    if (!row.switchPattern.trim()) {
      row.validationError = 'Укажите шаблон (например, _X.)'
    }
  }
  return row.validationError === null
}

const argsPlaceholder = (app: string) => argsPlaceholders[app] || 'Введите аргументы'

const onTypeChange = (row: RowItem) => {
  if (row.type === 'exten') {
    row.extension = row.extension || ''
    row.priority = row.priority || '1'
    row.app = row.app || 'NoOp'
    row.args = row.args || ''
  } else if (row.type === 'include') {
    row.includeContext = row.includeContext || ''
  } else if (row.type === 'switch') {
    row.switchPattern = row.switchPattern || ''
  }
  validateRow(row)
}

watch(() => props.rows, (newRows) => {
  if (!newRows || !Array.isArray(newRows)) {
    localRows.value = []
    originalRows.value = []
    return
  }
  const converted = convertApiToRows(newRows)
  localRows.value = converted
  originalRows.value = JSON.parse(JSON.stringify(converted))
}, { immediate: true })

const isDirty = (): boolean => {
  const removeUiFields = (rows: RowItem[]) =>
    rows.map((row) => {
      const { tempId, blockId, blockLabel, ...cleanRow } = row
      return cleanRow
    })
  const currentClean = removeUiFields(localRows.value)
  const originalClean = removeUiFields(originalRows.value)
  return JSON.stringify(currentClean) !== JSON.stringify(originalClean)
}

defineExpose({ isDirty })

const removeBlock = async (blockId: string | null | undefined) => {
  if (!blockId) return
  const label =
    localRows.value.find((row) => row.blockId === blockId)?.blockLabel ?? 'блок'
  const confirmed = await confirmStore.confirm({
    title: 'Удаление блока',
    message: `Удалить блок «${label}» и все его строки?`,
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return
  localRows.value = localRows.value.filter((row) => row.blockId !== blockId)
}

const removeRow = async (index: number) => {
  const confirmed = await confirmStore.confirm({
    title: 'Удаление строки',
    message: 'Удалить эту строку?',
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return
  localRows.value.splice(index, 1)
  let prioNum = 1
  for (const row of localRows.value) {
    if (row.type === 'exten' && row.priority !== 'n') {
      row.priority = prioNum.toString()
      prioNum++
    }
  }
}


const onDragEnd = () => {
  let prioNum = 1
  for (const row of localRows.value) {
    if (row.type === 'exten' && row.priority !== 'n') {
      row.priority = prioNum.toString()
      prioNum++
    }
  }
}

const saveChanges = () => {
  let valid = true
  localRows.value.forEach(row => {
    if (!validateRow(row)) valid = false
  })
  if (!valid) {
    alert('Исправьте ошибки перед сохранением')
    return
  }
  const apiRows = convertRowsToApi(localRows.value)
  emit('update', apiRows)
}

watch(
  () => props.instanceId,
  () => {
    loadEditorResources()
  },
  { immediate: true }
)

onMounted(() => {
  loadEditorResources()
})
</script>


<style scoped>
.btn {
  background-color: var(--color-background-soft);
  margin-right: 1vw;
}
.context-editor {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  background: var(--color-background-soft);
  overflow: visible;
}
.context-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
}
.blocks-panel {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.blocks-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-muted);
}
.blocks-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.block-btn {
  font-size: 0.8rem;
}
.rows-table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
}
.rows-table {
  min-width: 960px;
  padding: var(--spacing-sm);
}
.block-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin: var(--spacing-sm) 0 var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--block-accent, #3498db) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--block-accent, #3498db) 35%, transparent);
}
.block-badge {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--block-accent, #3498db);
}
.block-remove-btn {
  font-size: 0.75rem;
}
.block-row--start .row-block-member,
.block-row--single .row-block-member {
  border-top: 2px solid color-mix(in srgb, var(--block-accent, #3498db) 45%, var(--color-border));
}
.block-row--end .row-block-member,
.block-row--single .row-block-member {
  border-bottom: 2px solid color-mix(in srgb, var(--block-accent, #3498db) 45%, var(--color-border));
  margin-bottom: var(--spacing-sm);
}
.row-block-member {
  border-left: 3px solid var(--block-accent, #3498db);
  background-color: color-mix(in srgb, var(--block-accent, #3498db) 6%, var(--color-surface));
}
.row-item {
  display: grid;
  grid-template-columns: 30px 100px 100px 80px 1fr 1.4fr 50px;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-xs);
  background: var(--color-surface);
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
.header-row {
  background: var(--color-background-mute);
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
}
.row-error {
  border-left: 3px solid var(--color-error) !important;
  background-color: rgba(231, 76, 60, 0.05);
}
.row-managed {
  border-left: 3px solid #f1c40f;
  background-color: rgba(241, 196, 15, 0.06);
}
.row-error-message {
  font-size: 0.75rem;
  color: var(--color-error);
  margin-top: -4px;
  margin-bottom: 4px;
  padding-left: 28px;
}
.drag-handle {
  cursor: move;
  font-size: 1.2rem;
  color: var(--color-text-muted);
  user-select: none;
  width: 24px;
  text-align: center;
}
.drag-placeholder {
  width: 24px;
}
.type-col { grid-column: 2 / 3; }
.ext-col { grid-column: 3 / 4; }
.priority-col { grid-column: 4 / 5; }
.app-col { grid-column: 5 / 6; }
.args-col { grid-column: 6 / 7; }
.action-col { grid-column: 7 / 8; }
.priority-input, .ext-input {
  width: 100%;
}
.app-select {
  width: 100%;
}
:deep(.custom-select-dropdown) {
  z-index: 2000 !important;
}
@media (max-width: 768px) {
  .row-item {
    grid-template-columns: 30px 80px 80px 70px 1fr 1fr 40px;
    gap: var(--spacing-xs);
  }
  .type-col, .ext-col, .priority-col, .app-col, .args-col, .action-col {
    min-width: 0;
  }
}
</style>