import MockAdapter from 'axios-mock-adapter'
import { axiosInstance } from './axiosConfig'
import { generateMockCDR } from '@/mocks/cdrMocks'
import { generateMockInstanceList, generateMockInstance, generateMockUsers } from '@/mocks/vatsMocks'
import { API_CONFIG } from '@/config/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

if (USE_MOCK) {
  const mock = new MockAdapter(axiosInstance, { delayResponse: 300 })

  // Мок для CDR
  mock.onGet(API_CONFIG.ENDPOINTS.CDR).reply((config) => {
    const limit = config.params?.limit ? Number(config.params.limit) : 100
    const mockData = generateMockCDR(limit)
    return [200, mockData]
  })

  // ========== Моки для ВАТС ==========
  // Список всех инстансов
  mock.onGet(API_CONFIG.ENDPOINTS.INSTANCES).reply(() => {
    return [200, generateMockInstanceList(3)] // например, 3 ВАТС
  })

  // Детали конкретного инстанса (GET /instances/{id}/)
  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)/)
    if (match && match[1]) {
      const id = parseInt(match[1], 10)
      return [200, generateMockInstance(id)]
    }
    return [404, { detail: 'Instance not found' }]
  })

  // Пользователи инстанса (GET /instances/{id}/users/)
  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/users/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/users/)
    if (match && match[1]) {
      const id = parseInt(match[1], 10)
      const instanceName = `ВАТС-${id}`
      return [200, generateMockUsers(id, instanceName)]
    }
    return [404, { detail: 'Users not found' }]
  })

  // При необходимости можно добавить моки на POST, PUT, DELETE
}