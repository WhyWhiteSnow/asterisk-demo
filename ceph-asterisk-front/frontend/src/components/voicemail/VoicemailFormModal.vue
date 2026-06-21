<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay modal-overlay--nested" @click="close">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editing ? 'Редактирование ящика' : 'Создание ящика' }}</h3>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Номер ящика *</label>
            <CustomInput
              v-model="form.mailbox"
              :disabled="editing"
              placeholder="например, 101"
              :with-icon="false"
              :has-error="!!fieldErrors.mailbox"
              @input="clearFieldError('mailbox')"
            />
            <span v-if="fieldErrors.mailbox" class="field-error">{{ fieldErrors.mailbox }}</span>
          </div>
          <div class="form-group">
            <label>Пароль *</label>
            <CustomInput
              type="password"
              v-model="form.password"
              :with-icon="false"
              :has-error="!!fieldErrors.password"
              @input="clearFieldError('password')"
            />
            <span v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</span>
          </div>
          <div class="form-group">
            <label>Полное имя *</label>
            <CustomInput
              v-model="form.full_name"
              :with-icon="false"
              :has-error="!!fieldErrors.full_name"
              @input="clearFieldError('full_name')"
            />
            <span v-if="fieldErrors.full_name" class="field-error">{{ fieldErrors.full_name }}</span>
          </div>
          <div class="form-group">
            <label>Email</label>
            <CustomInput
              v-model="form.email"
              type="email"
              :with-icon="false"
              :has-error="!!fieldErrors.email"
              @input="clearFieldError('email')"
            />
            <span v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</span>
          </div>
          <div class="form-group">
            <label>Контекст</label>
            <CustomSelect v-model="form.context" :options="contextOptions" />
          </div>
          <div v-if="!editing" class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.link_endpoint_mwi" />
              Автоматически привязать к SIP-пользователю с таким же номером
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <CustomButton variant="outline" @click="close">Отмена</CustomButton>
          <CustomButton @click="save" :disabled="saving">{{ saving ? 'Сохранение...' : 'Сохранить' }}</CustomButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, toRef } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import { voicemailApi } from '@/api/voicemailApi'
import type { VoicemailBox, VoicemailCreate, VoicemailUpdate } from '@/types/voicemail'
import { useToastStore } from '@/stores/toast'
import { parseApiError } from '@/utils/parseApiError'
import { useModalEscape } from '@/composables/useModalEscape'

const props = defineProps<{
  show: boolean
  instanceId: number
  editing?: boolean
  initialData?: VoicemailBox | null
}>()
const emit = defineEmits<{ (e: 'close', reload?: boolean): void }>()

const toast = useToastStore()
const saving = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const contextOptions = [{ value: 'default', label: 'default' }]

const form = reactive<VoicemailCreate & { mailbox: string; password: string; full_name: string; email: string; context: string; link_endpoint_mwi: boolean }>({
  mailbox: '',
  password: '',
  full_name: '',
  email: '',
  context: 'default',
  link_endpoint_mwi: true,
})

const clearFieldErrors = () => {
  fieldErrors.value = {}
}

const clearFieldError = (field: string) => {
  if (fieldErrors.value[field]) {
    const next = { ...fieldErrors.value }
    delete next[field]
    fieldErrors.value = next
  }
}

const resetFormFromData = (data: VoicemailBox | null | undefined) => {
  clearFieldErrors()
  if (data) {
    form.mailbox = data.mailbox
    form.password = data.password
    form.full_name = data.full_name
    form.email = data.email || ''
    form.context = data.context
  } else {
    form.mailbox = ''
    form.password = ''
    form.full_name = ''
    form.email = ''
    form.context = 'default'
    form.link_endpoint_mwi = true
  }
}

watch(
  () => [props.show, props.initialData] as const,
  ([show, data]) => {
    if (show) resetFormFromData(data)
  },
)

const close = () => emit('close', false)
useModalEscape(toRef(props, 'show'), close)

const validateForm = (): boolean => {
  clearFieldErrors()
  let valid = true
  if (!form.mailbox.trim()) {
    fieldErrors.value.mailbox = 'Укажите номер ящика'
    valid = false
  }
  if (!form.password.trim()) {
    fieldErrors.value.password = 'Укажите пароль'
    valid = false
  } else if (form.password.length < 4) {
    fieldErrors.value.password = 'Пароль должен содержать минимум 4 символа'
    valid = false
  }
  if (!form.full_name.trim()) {
    fieldErrors.value.full_name = 'Укажите полное имя'
    valid = false
  }
  if (!valid) {
    toast.addToast({ message: 'Заполните обязательные поля', type: 'warning' })
  }
  return valid
}

const mapApiErrorToFields = (msg: string) => {
  const lower = msg.toLowerCase()
  if (lower.includes('mailbox') || lower.includes('ящик') || lower.includes('номер')) {
    fieldErrors.value.mailbox = msg
  } else if (lower.includes('password') || lower.includes('парол')) {
    fieldErrors.value.password = msg
  } else if (lower.includes('full_name') || lower.includes('имя')) {
    fieldErrors.value.full_name = msg
  } else if (lower.includes('email')) {
    fieldErrors.value.email = msg
  }
}

const save = async () => {
  if (!validateForm()) return
  saving.value = true
  try {
    if (props.editing && props.initialData) {
      const updateData: VoicemailUpdate = {
        password: form.password || null,
        full_name: form.full_name || null,
        email: form.email || null,
      }
      await voicemailApi.updateBox(props.instanceId, props.initialData.mailbox, updateData, form.context)
      toast.addToast({ message: 'Ящик обновлён', type: 'success' })
    } else {
      const createData: VoicemailCreate = {
        mailbox: form.mailbox,
        password: form.password,
        full_name: form.full_name,
        email: form.email || null,
        context: form.context,
        link_endpoint_mwi: form.link_endpoint_mwi,
      }
      await voicemailApi.createBox(props.instanceId, createData)
      toast.addToast({ message: 'Ящик создан', type: 'success' })
    }
    emit('close', true)
  } catch (err: unknown) {
    const msg = parseApiError(err, props.editing ? 'Ошибка обновления ящика' : 'Ошибка создания ящика')
    mapApiErrorToFields(msg)
    toast.addToast({ message: msg, type: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-content {
  width: min(520px, 100%);
}
.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
  font-size: 0.9rem;
  line-height: 1.4;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
}
@media (max-width: 480px) {
  .modal-footer {
    flex-direction: column-reverse;
  }
}
</style>
