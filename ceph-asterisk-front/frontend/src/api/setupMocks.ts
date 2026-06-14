import MockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'
import { generateMockCDR } from '@/mocks/cdrMocks'
import { generateMockInstance, generateMockInstanceList, generateMockUsers } from '@/mocks/vatsMocks'
import { getMockAudioFiles, addMockAudioFile, deleteMockAudioFile, getMockAudioFileBlob } from '@/mocks/audioMocks'
import { API_CONFIG } from '@/config/api'
import { getMockLogs } from '@/mocks/logsMocks'
import {
  getMockConfigHistory,
  getMockConfigVersionContent,
  postMockRollback,
  getMockCurrentConfig,
} from '@/mocks/configHistoryMocks'
import {
  getMockQueues,
  getMockQueue,
  createMockQueue,
  updateMockQueue,
  deleteMockQueue,
} from '@/mocks/queuesMocks'
import type { QueueCreate, QueueUpdate } from '@/types/queues';
import {
  getMockDialplan,
  updateMockDialplan,
  getMockContexts,
  getMockContext,
  updateMockContext,
} from '@/mocks/dialplanMocks'

export const setupMocks = (axiosInstance: AxiosInstance) => {
  const mock = new MockAdapter(axiosInstance, { delayResponse: 300 })

  // CDR
  mock.onGet(API_CONFIG.ENDPOINTS.CDR).reply((config) => {
    const limit = Number(config.params?.limit) || 100
    const offset = Number(config.params?.offset) || 0
    const allData = generateMockCDR(1000)
    const items = allData.slice(offset, offset + limit)
    return [200, {
      total: allData.length,
      items: items,
      limit: limit,
      offset: offset,
    }]
  })

  // Список всех ВАТС
  mock.onGet(API_CONFIG.ENDPOINTS.INSTANCES).reply(() => {
    return [200, generateMockInstanceList(3)] // например, 3 инстанса
  })

  // Детали конкретной ВАТС
  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)/)
    if (match && match[1]) {
      const id = parseInt(match[1], 10)
      return [200, generateMockInstance(id)]
    }
    return [404, { detail: 'Instance not found' }]
  })

  // Пользователи ВАТС
  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/users/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/users/)
    if (match && match[1]) {
      const id = parseInt(match[1], 10)
      return [200, generateMockUsers(id, `ВАТС-${id}`)]
    }
    return [404, { detail: 'Users not found' }]
  })

  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}get_contexts/[^/]+$`)).reply(() => {
      return [200, ['from-internal', 'from-external', 'custom-context']]
    })
    mock.onGet('/audio_files/get_files').reply(() => {
    return [200, getMockAudioFiles()]
  })

  // POST /audio_files/upload_audio
  mock.onPost('/audio_files/upload_audio').reply(async (config) => {
    const formData = await (config.data as FormData)
    const file = formData.get('file') as File
    if (!file) return [400, { detail: 'No file provided' }]
    const newFile = addMockAudioFile(file)
    return [200, newFile]
  })

  // DELETE /audio_files/delete_file/{file_id}
  mock.onDelete(/\/audio_files\/delete_file\/\d+/).reply((config) => {
    const match = config.url?.match(/\/delete_file\/(\d+)/)
    if (match && match[1]) {
      const fileId = parseInt(match[1], 10)
      const success = deleteMockAudioFile(fileId)
      if (success) return [200, {}]
      return [404, { detail: 'File not found' }]
    }
    return [400, { detail: 'Invalid request' }]
  })

  // GET /audio_files/get_file/{file_id}
  mock.onGet(/\/audio_files\/get_file\/\d+/).reply((config) => {
    const match = config.url?.match(/\/get_file\/(\d+)/)
    if (match && match[1]) {
      const fileId = parseInt(match[1], 10)
      const blob = getMockAudioFileBlob(fileId)
      if (blob) {
        return [200, blob, { 'Content-Type': 'audio/wav' }]
      }
      return [404, { detail: 'File not found' }]
    }
    return [400, { detail: 'Invalid request' }]
  })

  mock.onGet('/logs/').reply((config) => {
    const page = parseInt(config.params?.page ?? 0)
    const limit = parseInt(config.params?.limit ?? 20)
    const level = config.params?.level ?? null
    const pbx_id = config.params?.pbx_id ?? null
    const text = config.params?.text ?? null
    return [200, getMockLogs(page, limit, level, pbx_id, text)]
  })
  mock.onGet(/\/instances\/\d+\/config\/[^/]+\/history$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/config\/([^/]+)\/history/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const configType = match[2]
      return [200, getMockConfigHistory(instanceId, configType)]
    }
    return [404, { detail: 'Not found' }]
  })
  mock.onGet(/\/instances\/\d+\/config\/[^/]+\/history\/\d+/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/config\/([^/]+)\/history\/(\d+)/)
    if (match?.[1] && match[2] && match[3]) {
      const instanceId = parseInt(match[1], 10)
      const configType = match[2]
      const version = parseInt(match[3], 10)
      return [200, getMockConfigVersionContent(instanceId, configType, version)]
    }
    return [404]
  })
  mock.onPost(/\/instances\/\d+\/config\/[^/]+\/rollback/).reply(async (config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/config\/([^/]+)\/rollback/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const configType = match[2]
      const body = JSON.parse(config.data)
      const version = body.version || body.history_id
      if (version) {
        return [200, postMockRollback(instanceId, configType, version)]
      }
    }
    return [400, { detail: 'Invalid request' }]
  })
  mock.onGet(/\/instances\/\d+\/config\/[^/]+$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/config\/([^/]+)$/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const configType = match[2]
      return [200, getMockCurrentConfig(instanceId, configType)]
    }
    return [404]
  })

  mock.onGet(/\/instances\/(\d+)\/queues\/$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/queues\/$/)
    if (match?.[1]) {
      const instanceId = parseInt(match[1], 10)
      return [200, getMockQueues(instanceId)]
    }
    return [404, { detail: 'Instance not found' }]
  })
  mock.onPost(/\/instances\/(\d+)\/queues\/$/).reply(async (config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/queues\/$/)
    if (match?.[1]) {
      const instanceId = parseInt(match[1], 10)
      const body = JSON.parse(config.data) as QueueCreate
      const newQueue = createMockQueue(instanceId, body)
      return [201, newQueue]
    }
    return [404]
  })

  // GET /instances/{instance_id}/queues/{queue_name}
  mock.onGet(/\/instances\/(\d+)\/queues\/([^/]+)$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/queues\/([^/]+)$/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const queueName = decodeURIComponent(match[2])
      const queue = getMockQueue(instanceId, queueName)
      if (queue) return [200, queue]
      return [404, { detail: 'Queue not found' }]
    }
    return [404]
  })

  // PUT /instances/{instance_id}/queues/{queue_name}
  mock.onPut(/\/instances\/(\d+)\/queues\/([^/]+)$/).reply(async (config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/queues\/([^/]+)$/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const queueName = decodeURIComponent(match[2])
      const body = JSON.parse(config.data) as QueueUpdate
      const updated = updateMockQueue(instanceId, queueName, body)
      if (updated) return [200, updated]
      return [404, { detail: 'Queue not found' }]
    }
    return [404]
  })

  // DELETE /instances/{instance_id}/queues/{queue_name}
  mock.onDelete(/\/instances\/(\d+)\/queues\/([^/]+)$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/queues\/([^/]+)$/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const queueName = decodeURIComponent(match[2])
      const deleted = deleteMockQueue(instanceId, queueName)
      if (deleted) return [200, {}]
      return [404, { detail: 'Queue not found' }]
    }
    return [404]
  })
  mock.onGet(/\/instances\/(\d+)\/dialplan$/).reply((config) => {
  const match = config.url?.match(/\/instances\/(\d+)\/dialplan/)
    if (match?.[1]) {
      const instanceId = parseInt(match[1], 10)
      const filename = config.params?.filename || 'extensions.conf'
      return [200, getMockDialplan(instanceId, filename)]
    }
    return [404]
  })
  
  // PUT /instances/{instance_id}/dialplan
  mock.onPut(/\/instances\/(\d+)\/dialplan$/).reply(async (config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/dialplan/)
    if (match?.[1]) {
      const instanceId = parseInt(match[1], 10)
      const body = JSON.parse(config.data)
      const updated = updateMockDialplan(instanceId, body)
      return [200, updated]
    }
    return [404]
  })
  
  // GET /instances/{instance_id}/dialplan/contexts
  mock.onGet(/\/instances\/(\d+)\/dialplan\/contexts$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/dialplan\/contexts/)
    if (match?.[1]) {
      const instanceId = parseInt(match[1], 10)
      return [200, getMockContexts(instanceId)]
    }
    return [404]
  })
  
  // GET /instances/{instance_id}/dialplan/{context}
  mock.onGet(/\/instances\/(\d+)\/dialplan\/([^/]+)$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/dialplan\/([^/]+)/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const contextName = decodeURIComponent(match[2])
      return [200, getMockContext(instanceId, contextName)]
    }
    return [404]
  })
  
  // PUT /instances/{instance_id}/dialplan/{context}
  mock.onPut(/\/instances\/(\d+)\/dialplan\/([^/]+)$/).reply(async (config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/dialplan\/([^/]+)/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const contextName = decodeURIComponent(match[2])
      const body = JSON.parse(config.data)
      const updated = updateMockContext(instanceId, contextName, body)
      return [200, updated]
    }
    return [404]
  })
}
