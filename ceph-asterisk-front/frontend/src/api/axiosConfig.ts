import axios from 'axios'
import { API_CONFIG } from '@/config/api'
import { setupMocks } from './setupMocks'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveRefreshedTokens,
} from '@/utils/authTokens'

export const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Переменные для предотвращения множественных обновлений
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

//добавляем токен
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

//обработка 401 и рефреш
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url ?? ''
    const isAuthLoginRequest =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/login/ldap')

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthLoginRequest
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => axiosInstance(originalRequest))
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token: newRefreshToken } = response.data
        saveRefreshedTokens(access_token, newRefreshToken)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        processQueue()
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error)
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// Слушаем событие разлогина (очистка данных)
window.addEventListener('auth:logout', () => {
  clearAuthTokens()
  // Здесь можно вызвать logout из стора, но чтобы избежать циклической зависимости, просто редиректим
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
})

if (import.meta.env.VITE_USE_MOCK === 'true') {
  setupMocks(axiosInstance)
}

export default axiosInstance