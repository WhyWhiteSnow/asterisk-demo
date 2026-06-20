<template>
  <div v-if="show" class="modal-overlay" @click="close">
    <div class="modal-content modal-content--wide" @click.stop>
      <div class="modal-header">
        <h3>{{ editing ? 'Редактирование блока' : 'Новый блок диалплана' }}</h3>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Название *</label>
            <CustomInput v-model="form.label" placeholder="Например: Мой IVR" :with-icon="false" />
          </div>
          <div class="form-group">
            <label>Описание</label>
            <CustomInput
              v-model="form.description"
              placeholder="Кратко, для чего блок"
              :with-icon="false"
            />
          </div>
        </div>
        <div class="form-row form-row--checks">
          <label class="checkbox-label">
            <input v-model="form.needsExtension" type="checkbox" />
            Спрашивать номер (extension) при вставке
          </label>
          <div v-if="form.needsExtension" class="form-group form-group--inline">
            <label>Номер по умолчанию</label>
            <CustomInput
              v-model="form.defaultExtension"
              placeholder="101"
              :with-icon="false"
              class="default-ext-input"
            />
          </div>
        </div>
        <p class="form-hint">
          В полях можно использовать <code>{ext}</code> — подставится выбранный номер.
          Строки блока редактируются ниже; после вставки в диалплан их тоже можно менять.
        </p>
        <div class="rows-editor">
          <div class="rows-editor-header">
            <span>Строки блока</span>
            <CustomButton size="sm" variant="outline" @click="addRow">+ Строка</CustomButton>
          </div>
          <div v-if="form.rows.length === 0" class="empty-rows">Добавьте хотя бы одну строку exten</div>
          <div v-for="(row, index) in form.rows" :key="index" class="row-editor-item">
            <CustomInput v-model="row.extension" placeholder="Номер / _XXX" :with-icon="false" />
            <CustomInput v-model="row.priority" placeholder="1 / n / n(done)" :with-icon="false" />
            <CustomInput v-model="row.app" placeholder="Приложение" :with-icon="false" />
            <CustomInput v-model="row.args" placeholder="Аргументы" :with-icon="false" />
            <CustomButton size="sm" variant="danger" @click="removeRow(index)">✕</CustomButton>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <CustomButton variant="outline" @click="close">Отмена</CustomButton>
        <CustomButton @click="save">Сохранить блок</CustomButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, toRef } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import type { DialplanBlockDefinition, DialplanBlockRowTemplate } from '@/constants/dialplanBlocks'
import { useToastStore } from '@/stores/toast'
import { useModalEscape } from '@/composables/useModalEscape'

const props = defineProps<{
  show: boolean
  editing?: boolean
  initialBlock?: DialplanBlockDefinition | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', block: DialplanBlockDefinition): void
}>()

const toast = useToastStore()

const form = reactive<{
  id: string
  label: string
  description: string
  needsExtension: boolean
  defaultExtension: string
  rows: DialplanBlockRowTemplate[]
}>({
  id: '',
  label: '',
  description: '',
  needsExtension: true,
  defaultExtension: '101',
  rows: [],
})

const resetForm = (block?: DialplanBlockDefinition | null) => {
  if (block) {
    form.id = block.id
    form.label = block.label
    form.description = block.description
    form.needsExtension = block.needsExtension
    form.defaultExtension = block.defaultExtension ?? '101'
    form.rows = block.rows.map((row) => ({ ...row }))
    return
  }
  form.id = ''
  form.label = ''
  form.description = ''
  form.needsExtension = true
  form.defaultExtension = '101'
  form.rows = [
    { extension: '{ext}', priority: '1', app: 'NoOp', args: 'Мой блок' },
    { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
  ]
}

watch(
  () => [props.show, props.initialBlock] as const,
  ([show, block]) => {
    if (show) resetForm(block)
  },
  { immediate: true }
)

const close = () => emit('close')
useModalEscape(toRef(props, 'show'), close)

const addRow = () => {
  form.rows.push({ extension: '{ext}', priority: 'n', app: 'NoOp', args: '' })
}

const removeRow = (index: number) => {
  form.rows.splice(index, 1)
}

const save = () => {
  if (!form.label.trim()) {
    toast.addToast({ message: 'Укажите название блока', type: 'warning' })
    return
  }
  if (form.rows.length === 0) {
    toast.addToast({ message: 'Добавьте хотя бы одну строку', type: 'warning' })
    return
  }
  for (const row of form.rows) {
    if (!row.extension.trim() || !row.app.trim()) {
      toast.addToast({ message: 'У каждой строки должны быть номер и приложение', type: 'warning' })
      return
    }
  }

  const block: DialplanBlockDefinition = {
    id: form.id || `custom-${Date.now()}`,
    label: form.label.trim(),
    description: form.description.trim() || form.label.trim(),
    isCustom: true,
    needsExtension: form.needsExtension,
    defaultExtension: form.needsExtension ? form.defaultExtension.trim() || '101' : undefined,
    rows: form.rows.map((row) => ({
      extension: row.extension.trim(),
      priority: row.priority.trim() || 'n',
      app: row.app.trim(),
      args: row.args,
    })),
  }
  emit('save', block)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-modal) + 20);
}
.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  width: 92%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-content--wide {
  max-width: 860px;
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
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.form-row--checks {
  grid-template-columns: 1fr;
  align-items: center;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.form-group--inline {
  max-width: 180px;
}
.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
}
.form-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}
.rows-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
}
.row-editor-item {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1.4fr 40px;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}
.empty-rows {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
}
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .row-editor-item {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
