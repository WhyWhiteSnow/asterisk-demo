<template>
  <div v-if="show" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ editing ? 'Редактирование ящика' : 'Создание ящика' }}</h3>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Номер ящика *</label>
          <CustomInput v-model="form.mailbox" :disabled="editing" placeholder="например, 101" :with-icon="false" />
        </div>
        <div class="form-group">
          <label>Пароль *</label>
          <CustomInput type="password" v-model="form.password" :with-icon="false" />
        </div>
        <div class="form-group">
          <label>Полное имя *</label>
          <CustomInput v-model="form.full_name" :with-icon="false" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <CustomInput v-model="form.email" type="email" :with-icon="false" />
        </div>
        <div class="form-group">
          <label>Контекст</label>
          <CustomSelect v-model="form.context" :options="contextOptions" />
        </div>
        <div v-if="!editing" class="form-group">
          <label>
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
const contextOptions = [{ value: 'default', label: 'default' }] // можно расширить через API

const form = reactive<VoicemailCreate & { mailbox: string; password: string; full_name: string; email: string; context: string; link_endpoint_mwi: boolean }>({
  mailbox: '',
  password: '',
  full_name: '',
  email: '',
  context: 'default',
  link_endpoint_mwi: true,
})

const resetFormFromData = (data: VoicemailBox | null | undefined) => {
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
const save = async () => {
  if (!form.mailbox || !form.password || !form.full_name) {
    toast.addToast({ message: 'Заполните обязательные поля', type: 'warning' })
    return
  }
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
    toast.addToast({
      message: parseApiError(err, props.editing ? 'Ошибка обновления ящика' : 'Ошибка создания ящика'),
      type: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}
</style>