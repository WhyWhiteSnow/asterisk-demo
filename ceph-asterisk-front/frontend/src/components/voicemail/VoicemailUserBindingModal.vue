<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay modal-overlay--nested" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Привязка пользователя к ящику</h3>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Ящик</label>
          <input class="form-input" :value="mailbox" disabled />
        </div>
        <div class="form-group">
          <label>Пользователь (номер SIP)</label>
          <CustomSelect v-model="selectedUserId" :options="userOptions" placeholder="Выберите пользователя" />
        </div>
      </div>
      <div class="modal-footer">
        <CustomButton variant="outline" @click="close">Отмена</CustomButton>
        <CustomButton @click="bind" :disabled="!selectedUserId">Привязать</CustomButton>
        <CustomButton variant="danger" @click="unbind" :disabled="!selectedUserId && !currentBindingUserId">Отвязать</CustomButton>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import { voicemailApi } from '@/api/voicemailApi'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { parseApiError } from '@/utils/parseApiError'
import { useModalEscape } from '@/composables/useModalEscape'

const props = defineProps<{
  show: boolean
  instanceId: number
  mailbox: string
  users: { id: string; name: string }[]   // список SIP-пользователей (id - номер, name - callerId)
  currentBindingUserId?: string | null
}>()
const emit = defineEmits<{ (e: 'close', reload?: boolean): void }>()

const toast = useToastStore()
const confirmStore = useConfirmStore()
const selectedUserId = ref<string>('')
const userOptions = computed(() => [
  { value: '', label: '-- Выберите --' },
  ...props.users.map(u => ({ value: u.id, label: `${u.id} (${u.name})` })),
])

watch(
  () => [props.show, props.currentBindingUserId, props.mailbox] as const,
  ([show, bindingUserId]) => {
    if (show) {
      selectedUserId.value = bindingUserId || ''
    }
  },
)

const close = () => emit('close', false)
useModalEscape(toRef(props, 'show'), close)
const bind = async () => {
  if (!selectedUserId.value) return
  try {
    await voicemailApi.bindUser(props.instanceId, {
      user_id: selectedUserId.value,
      mailbox: props.mailbox,
      context: 'default',
    })
    toast.addToast({ message: 'Пользователь привязан', type: 'success' })
    emit('close', true)
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка привязки'), type: 'error' })
  }
}
const unbind = async () => {
  const userId = selectedUserId.value || props.currentBindingUserId
  if (!userId) return
  const confirmed = await confirmStore.confirm({
    title: 'Отвязка пользователя',
    message: 'Отвязать пользователя от ящика?',
    confirmText: 'Отвязать',
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await voicemailApi.unbindUser(props.instanceId, { user_id: userId, mailbox: props.mailbox })
    toast.addToast({ message: 'Пользователь отвязан', type: 'success' })
    emit('close', true)
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка отвязки'), type: 'error' })
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