<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <svg class="asterisk-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M300-720q-25 0-42.5 17.5T240-660q0 25 17.5 42.5T300-600q25 0 42.5-17.5T360-660q0-25-17.5-42.5T300-720Zm0 400q-25 0-42.5 17.5T240-260q0 25 17.5 42.5T300-200q25 0 42.5-17.5T360-260q0-25-17.5-42.5T300-320ZM160-840h640q17 0 28.5 11.5T840-800v280q0 17-11.5 28.5T800-480H160q-17 0-28.5-11.5T120-520v-280q0-17 11.5-28.5T160-840Zm40 80v200h560v-200H200Zm-40 320h640q17 0 28.5 11.5T840-400v280q0 17-11.5 28.5T800-80H160q-17 0-28.5-11.5T120-120v-280q0-17 11.5-28.5T160-440Zm40 80v200h560v-200H200Zm0-400v200-200Zm0 400v200-200Z"/>
        </svg>
        <h1 class="login-title">Asterisk BATC</h1>
        <p class="login-subtitle">Вход в систему управления</p>
      </div>

      <!-- Переключатель метода входа -->
      <div class="login-method-selector">
        <CustomRadio
          v-model="loginMethod"
          value="standard"
          label="Стандартный вход"
          name="loginMethod"
        />
        <CustomRadio
          v-model="loginMethod"
          value="ldap"
          label="Вход через LDAP"
          name="loginMethod"
        />
      </div>

      <form @submit.prevent="handleLogin" class="login-form" novalidate>
        <div class="form-group">
          <label for="login" class="form-label">Логин <span class="required-mark">*</span></label>
          <input
            id="login"
            v-model="form.login"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': loginError }"
            placeholder="Введите логин"
            required
            autocomplete="username"
            @input="loginError = ''"
          />
          <p v-if="loginError" class="field-error">{{ loginError }}</p>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Пароль <span class="required-mark">*</span></label>
          <CustomInput
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Введите пароль"
            :with-icon="false"
            :has-error="!!passwordError"
            required
            autocomplete="current-password"
            @update:model-value="passwordError = ''"
          />
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
        </div>

        <div class="form-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="remember" />
            <span>Запомнить меня</span>
          </label>
        </div>

        <button type="submit" class="login-button" :disabled="authStore.isLoading">
          <span v-if="!authStore.isLoading">Войти</span>
          <span v-else class="spinner"></span>
        </button>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </form>

      <div class="login-footer">
        <p v-if="USE_MOCK" class="mock-hint">
          Тестовый режим: логин <strong>admin</strong>, пароль <strong>admin</strong>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import CustomRadio from '@/components/UI/CustomRadio.vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import { parseApiError } from '@/utils/parseApiError'

const authStore = useAuthStore()
const router = useRouter()
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const loginMethod = ref<'standard' | 'ldap'>('standard')
const form = reactive({
  login: USE_MOCK ? 'admin' : '',
  password: USE_MOCK ? 'admin' : '',
})
const remember = ref(true)
const errorMessage = ref('')
const loginError = ref('')
const passwordError = ref('')

const validateForm = (): boolean => {
  loginError.value = ''
  passwordError.value = ''
  errorMessage.value = ''

  const login = form.login.trim()
  const password = form.password.trim()
  let isValid = true

  if (!login) {
    loginError.value = 'Введите логин'
    isValid = false
  }

  if (!password) {
    passwordError.value = 'Введите пароль'
    isValid = false
  }

  return isValid
}

const handleLogin = async () => {
  errorMessage.value = ''
  if (!validateForm()) {
    return
  }

  try {
    await authStore.login(form.login.trim(), form.password, remember.value, loginMethod.value)
    router.push('/')
  } catch (err: unknown) {
    errorMessage.value = parseApiError(err, 'Не удалось войти. Проверьте логин и пароль.')
  }
}
</script>

<style scoped>
.login-method-selector {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  padding: var(--spacing-lg);
}

.login-card {
  background: var(--color-background-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 420px;
  padding: var(--spacing-xl);
  transition: background var(--transition-base), box-shadow var(--transition-base);
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.asterisk-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  color: var(--color-heading);
  transition: color var(--transition-fast);
}

.login-title {
  font-size: 1.75rem;
  margin-bottom: var(--spacing-xs);
  color: var(--color-heading);
}

.login-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.form-input {
  padding: 12px 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 1rem;
  transition: border var(--transition-fast), background var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-background);
}

.form-input--error {
  border-color: var(--color-error);
}

.form-input--error:focus {
  border-color: var(--color-error);
}

.required-mark {
  color: var(--color-error);
}

.field-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-error);
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.login-button {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), transform 0.1s;
}

.login-button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.login-button:active:not(:disabled) {
  transform: scale(0.98);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.6s linear infinite;
}

.error-message {
  background: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  color: var(--color-error);
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  text-align: center;
}

.login-footer {
  margin-top: var(--spacing-lg);
  text-align: center;
}

.mock-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-background-mute);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Адаптивность */
@media (max-width: 640px) {
  .login-method-selector {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }  
  .login-card {
    padding: var(--spacing-lg);
    max-width: 90%;
  }
  .login-title {
    font-size: 1.5rem;
  }
  .login-logo {
    width: 48px;
    height: 48px;
  }
  .form-input {
    padding: 10px 14px;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: var(--spacing-md);
  }
  .login-title {
    font-size: 1.3rem;
  }
}
</style>