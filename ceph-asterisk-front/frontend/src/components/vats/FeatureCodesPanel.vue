<template>
  <div class="feature-codes-panel">
    <p class="panel-hint">
      Короткие коды генерируются в диалплане автоматически. DND через *78/*79 использует DB Asterisk.
    </p>

    <div v-if="loading" class="loading-state">Загрузка...</div>
    <div v-else class="card">
      <div class="form-grid">
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.vm_access_enabled" />
            <span>Доступ к голосовой почте</span>
          </label>
          <CustomInput v-model="form.vm_access" :with-icon="false" placeholder="*97" />
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.vm_check_enabled" />
            <span>Проверка сообщений</span>
          </label>
          <CustomInput v-model="form.vm_check" :with-icon="false" placeholder="*98" />
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.dnd_codes_enabled" />
            <span>Не беспокоить (DND)</span>
          </label>
          <div class="code-row">
            <CustomInput v-model="form.dnd_activate" :with-icon="false" placeholder="*78" />
            <span class="code-sep">/</span>
            <CustomInput v-model="form.dnd_deactivate" :with-icon="false" placeholder="*79" />
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.cf_codes_enabled" />
            <span>Коды переадресации (информ.)</span>
          </label>
          <div class="code-row">
            <CustomInput v-model="form.cf_activate" :with-icon="false" placeholder="*72" />
            <span class="code-sep">/</span>
            <CustomInput v-model="form.cf_deactivate" :with-icon="false" placeholder="*73" />
          </div>
          <p class="field-hint">CFU/CFNA/CFB настраиваются в карточке номера. Коды *72/*73 — заглушка.</p>
        </div>
      </div>
      <div class="panel-footer">
        <CustomButton @click="saveSettings" :disabled="saving">
          {{ saving ? 'Сохранение...' : 'Сохранить коды' }}
        </CustomButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import CustomButton from '@/components/UI/CustomButton.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import { featureCodesApi } from '@/api/businessSettingsApi'
import type { FeatureCodesSettings } from '@/types/featureCodes'
import { useToastStore } from '@/stores/toast'
import { parseApiError } from '@/utils/parseApiError'

const props = defineProps<{ instanceId: number }>()

const toast = useToastStore()
const loading = ref(false)
const saving = ref(false)
const form = ref<FeatureCodesSettings>({
  vm_access: '*97',
  vm_check: '*98',
  cf_activate: '*72',
  cf_deactivate: '*73',
  dnd_activate: '*78',
  dnd_deactivate: '*79',
  vm_access_enabled: true,
  vm_check_enabled: true,
  cf_codes_enabled: false,
  dnd_codes_enabled: true,
})

const loadSettings = async () => {
  loading.value = true
  try {
    form.value = await featureCodesApi.getSettings(props.instanceId)
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка загрузки кодов'), type: 'error' })
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    form.value = await featureCodesApi.updateSettings(props.instanceId, form.value)
    toast.addToast({ message: 'Короткие коды сохранены', type: 'success' })
  } catch (err: unknown) {
    toast.addToast({ message: parseApiError(err, 'Ошибка сохранения'), type: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
watch(() => props.instanceId, loadSettings)
</script>

<style scoped>
.feature-codes-panel { width: 100%; }
.panel-hint { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: var(--spacing-md); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
.form-group { margin-bottom: var(--spacing-sm); }
.checkbox-label { display: flex; align-items: center; gap: var(--spacing-xs); margin-bottom: var(--spacing-xs); font-size: 0.9rem; }
.code-row { display: flex; align-items: center; gap: var(--spacing-xs); }
.code-sep { color: var(--color-text-muted); }
.field-hint { font-size: 0.75rem; color: var(--color-text-muted); margin-top: var(--spacing-xs); }
.panel-footer { display: flex; justify-content: flex-end; margin-top: var(--spacing-md); }
.loading-state { padding: var(--spacing-xl); text-align: center; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
</style>
