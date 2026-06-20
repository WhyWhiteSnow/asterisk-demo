<template>
  <div class="forwarding-form">
    <h4 class="forwarding-title">Переадресация звонков</h4>
    <p class="forwarding-hint">
      Настройки автоматически обновляют конфигурацию Asterisk (extensions.conf).
    </p>

    <div v-if="loading" class="loading-inline">Загрузка...</div>
    <div v-else class="forwarding-rules">
      <div v-for="ruleType in ruleTypes" :key="ruleType" class="rule-card">
        <label class="rule-toggle">
          <input
            type="checkbox"
            :checked="isRuleEnabled(ruleType)"
            :disabled="saving"
            @change="toggleRule(ruleType, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ FORWARD_TYPE_LABELS[ruleType] }}</span>
        </label>

        <div v-if="isRuleEnabled(ruleType)" class="rule-fields">
          <CustomSelect
            :model-value="getRule(ruleType)?.target_type ?? 'extension'"
            :options="targetTypeOptions"
            label="Куда перенаправить"
            :disabled="saving"
            @update:model-value="onTargetTypeChange(ruleType, $event)"
          />
          <CustomInput
            :model-value="getRule(ruleType)?.target_value ?? ''"
            :label="getRule(ruleType)?.target_type === 'voicemail' ? 'Ящик' : 'Номер'"
            :placeholder="getRule(ruleType)?.target_type === 'voicemail' ? extension : '102'"
            :with-icon="false"
            :disabled="saving"
            @update:model-value="updateRuleField(ruleType, 'target_value', String($event ?? ''))"
          />
          <CustomInput
            v-if="ruleType === 'cfna'"
            type="number"
            :model-value="String(getRule(ruleType)?.timeout_seconds ?? 30)"
            label="Таймаут (сек)"
            :with-icon="false"
            :disabled="saving"
            @update:model-value="updateRuleField(ruleType, 'timeout_seconds', Number($event) || 30)"
          />
        </div>
      </div>
    </div>

    <div class="forwarding-actions">
      <CustomButton
        variant="primary"
        size="sm"
        :disabled="saving || loading"
        @click="saveForwarding"
      >
        <span v-if="saving" class="button-loading"><span class="spinner"></span> Сохранение...</span>
        <span v-else>Применить переадресацию</span>
      </CustomButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import { forwardingApi } from '@/api/forwardingApi'
import { parseApiError } from '@/utils/parseApiError'
import { useToastStore } from '@/stores/toast'
import type { ForwardType, ForwardingRule, ForwardTargetType } from '@/types/forwarding'
import { FORWARD_TYPE_LABELS } from '@/types/forwarding'

const props = defineProps<{
  instanceId: number
  extension: string
}>()

const toast = useToastStore()
const loading = ref(false)
const saving = ref(false)
const rules = ref<ForwardingRule[]>([])

const ruleTypes: ForwardType[] = ['cfu', 'cfna', 'cfb']

const targetTypeOptions = [
  { value: 'extension', label: 'Внутренний номер' },
  { value: 'voicemail', label: 'Голосовая почта' },
]

const isRuleEnabled = (type: ForwardType) =>
  rules.value.some(r => r.forward_type === type && r.enabled)

const getRule = (type: ForwardType): ForwardingRule | undefined =>
  rules.value.find(r => r.forward_type === type)

const defaultRule = (type: ForwardType): ForwardingRule => ({
  forward_type: type,
  target_type: type === 'cfna' ? 'extension' : 'extension',
  target_value: '',
  timeout_seconds: type === 'cfna' ? 15 : 30,
  enabled: true,
})

const toggleRule = (type: ForwardType, enabled: boolean) => {
  const existing = getRule(type)
  if (enabled) {
    if (existing) {
      existing.enabled = true
    } else {
      rules.value.push(defaultRule(type))
    }
    return
  }
  rules.value = rules.value.filter(r => r.forward_type !== type)
}

const onTargetTypeChange = (type: ForwardType, value: string | number | null) => {
  if (value === null) return
  updateRuleField(type, 'target_type', value)
}

const updateRuleField = (
  type: ForwardType,
  field: keyof ForwardingRule,
  value: string | number
) => {
  let rule = getRule(type)
  if (!rule) {
    rule = defaultRule(type)
    rules.value.push(rule)
  }
  if (field === 'target_type') {
    rule.target_type = value as ForwardTargetType
    if (value === 'voicemail' && !rule.target_value) {
      rule.target_value = props.extension
    }
  } else if (field === 'target_value') {
    rule.target_value = String(value)
  } else if (field === 'timeout_seconds') {
    rule.timeout_seconds = Number(value) || 30
  }
}

const loadForwarding = async () => {
  loading.value = true
  try {
    const data = await forwardingApi.getForwarding(props.instanceId, props.extension)
    rules.value = data.rules.map(r => ({
      forward_type: r.forward_type,
      target_type: r.target_type,
      target_value: r.target_value,
      timeout_seconds: r.timeout_seconds,
      enabled: r.enabled,
    }))
  } catch (error) {
    toast.addToast({
      message: parseApiError(error, 'Ошибка загрузки переадресации'),
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

const saveForwarding = async () => {
  const activeRules = rules.value.filter(r => r.enabled && r.target_value.trim())
  for (const rule of activeRules) {
    if (rule.target_type === 'external') {
      toast.addToast({
        message: 'Внешние номера будут доступны после настройки SIP-транков',
        type: 'warning',
      })
      return
    }
  }

  saving.value = true
  try {
    await forwardingApi.updateForwarding(props.instanceId, props.extension, {
      rules: activeRules,
      change_author: 'ui',
      reload_asterisk: true,
    })
    toast.addToast({
      message: 'Переадресация сохранена. Конфигурация Asterisk обновлена.',
      type: 'success',
    })
    await loadForwarding()
  } catch (error) {
    toast.addToast({
      message: parseApiError(error, 'Ошибка сохранения переадресации'),
      type: 'error',
    })
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.instanceId, props.extension] as const,
  () => {
    if (props.instanceId && props.extension) loadForwarding()
  }
)

onMounted(() => {
  if (props.instanceId && props.extension) loadForwarding()
})
</script>

<style scoped>
.forwarding-form {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}
.forwarding-title {
  margin: 0 0 var(--spacing-xs);
  font-size: 1rem;
}
.forwarding-hint {
  margin: 0 0 var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
.forwarding-rules {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.rule-card {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
}
.rule-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 500;
  cursor: pointer;
}
.rule-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}
.forwarding-actions {
  margin-top: var(--spacing-md);
  display: flex;
  justify-content: flex-end;
}
.loading-inline {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
.button-loading {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
