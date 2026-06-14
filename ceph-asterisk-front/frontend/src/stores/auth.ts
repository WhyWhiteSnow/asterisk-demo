import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosInstance from '@/api/axiosConfig'

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
      
      if (remember) {
        localStorage.setItem('access_token', mockAccessToken)
        localStorage.setItem('refresh_token', mockRefreshToken)
      } else {
        sessionStorage.setItem('access_token', mockAccessToken)
        sessionStorage.setItem('refresh_token', mockRefreshToken)
      }
      user.value = mockUser
      isAuthenticated.value = true
      return true
    }
    throw new Error('Invalid credentials')
  }

  const mockCheckAuth = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (token === 'mock_access_token_123') {
      user.value = { id: 1, login: 'admin', name: 'Administrator', role: 'admin' }
      isAuthenticated.value = true
      return true
    }
    return false
  }

  const mockLogout = async () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
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
      if (remember) {
        localStorage.setItem('access_token', mockAccessToken)
        localStorage.setItem('refresh_token', mockRefreshToken)
      } else {
        sessionStorage.setItem('access_token', mockAccessToken)
        sessionStorage.setItem('refresh_token', mockRefreshToken)
      }
      user.value = mockUser
      isAuthenticated.value = true
      return true
    }
    throw new Error('Invalid LDAP credentials')
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
      if (remember) {
        localStorage.setItem('access_token', finalAccessToken)
        localStorage.setItem('refresh_token', finalRefreshToken)
      } else {
        sessionStorage.setItem('access_token', finalAccessToken)
        sessionStorage.setItem('refresh_token', finalRefreshToken)
      }
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
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (!token) return false
    try {
      const response = await axiosInstance.get('/auth/me')
      user.value = response.data
      isAuthenticated.value = true
      return true
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
      isAuthenticated.value = false
      user.value = null
      return false
    }
  }

  const realLogout = async () => {
    isLoading.value = true
    try {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
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