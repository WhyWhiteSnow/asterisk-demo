import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosInstance from '@/api/axiosConfig'
import { clearAuthTokens, getAccessToken, setAuthTokens } from '@/utils/authTokens'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || false
type LoginMethod = 'standard' | 'ldap'

interface User {
  id: number
  login: string
  name: string
  role?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)

  // Мок-функции
  const mockLogin = async (login: string, password: string, remember: boolean) => {
    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 500))
    if (login === 'admin' && password === 'admin') {
      const mockUser = { id: 1, login: 'admin', name: 'Administrator', role: 'admin' }
      const mockAccessToken = 'mock_access_token_123'
      const mockRefreshToken = 'mock_refresh_token_456'
      
      setAuthTokens(mockAccessToken, mockRefreshToken, remember)
      user.value = mockUser
      isAuthenticated.value = true
      return true
    }
    throw new Error('Неверный логин или пароль')
  }

  const mockCheckAuth = async () => {
    const token = getAccessToken()
    if (token === 'mock_access_token_123') {
      user.value = { id: 1, login: 'admin', name: 'Administrator', role: 'admin' }
      isAuthenticated.value = true
      return true
    }
    return false
  }

  const mockLogout = async () => {
    clearAuthTokens()
    user.value = null
    isAuthenticated.value = false
  }

  const mockLdapLogin = async (login: string, password: string, remember: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    // Для демонстрации: принимаем те же admin/admin
    if (login === 'admin' && password === 'admin') {
      const mockUser = { id: 1, login: 'admin', name: 'LDAP User', role: 'admin' }
      const mockAccessToken = 'mock_ldap_access_token'
      const mockRefreshToken = 'mock_ldap_refresh_token'
      setAuthTokens(mockAccessToken, mockRefreshToken, remember)
      user.value = mockUser
      isAuthenticated.value = true
      return true
    }
    throw new Error('Неверный логин или пароль')
  }

  // Реальные функции (если не мок)
  const realLogin = async (login: string, password: string, remember: boolean, method: LoginMethod = 'standard') => {
    isLoading.value = true
    try {
      const endpoint = method === 'ldap' ? '/auth/login/ldap' : '/auth/login'
      const response = await axiosInstance.post(endpoint, { login, password })
      const { access_token, refresh_token, accessToken, refreshToken } = response.data
      const finalAccessToken = access_token || accessToken
      const finalRefreshToken = refresh_token || refreshToken
      setAuthTokens(finalAccessToken, finalRefreshToken, remember)
      const userResponse = await axiosInstance.get('/auth/me')
      user.value = userResponse.data
      isAuthenticated.value = true
      return true
    } catch (error) {
      console.error('Login error', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const realCheckAuth = async () => {
    const token = getAccessToken()
    if (!token) return false
    try {
      const response = await axiosInstance.get('/auth/me')
      user.value = response.data
      isAuthenticated.value = true
      return true
    } catch {
      clearAuthTokens()
      isAuthenticated.value = false
      user.value = null
      return false
    }
  }

  const realLogout = async () => {
    isLoading.value = true
    try {
      clearAuthTokens()
      user.value = null
      isAuthenticated.value = false
    } finally {
      isLoading.value = false
    }
  }

  // Выбираем реализацию на основе флага
  const login = async (login: string, password: string, remember: boolean, method: LoginMethod = 'standard') => {
    if (USE_MOCK) {
      if (method === 'ldap') {
        return mockLdapLogin(login, password, remember)
      } else {
        return mockLogin(login, password, remember)
      }
    } else {
      return realLogin(login, password, remember, method)
    }
  }
  const checkAuth = USE_MOCK ? mockCheckAuth : realCheckAuth
  const logout = USE_MOCK ? mockLogout : realLogout

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  }
})