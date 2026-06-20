import MockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'
import { generateMockCDR } from '@/mocks/cdrMocks'
import {
  getMockInstancesList,
  getMockInstanceById,
  createMockInstance,
  updateMockInstance,
  deleteMockInstance,
  getMockUsers,
  createMockUser,
  updateMockUser,
  deleteMockUser,
  mockSendCommand,
  getMockUsedPorts,
} from '@/mocks/vatsMocks'
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
import {
  getMockVoicemailBoxes,
  createMockVoicemailBox,
  updateMockVoicemailBox,
  deleteMockVoicemailBox,
  getMockVoicemailRecordings,
  bindMockVoicemailUser,
  getMockVoicemailBoxByUser,
} from '@/mocks/voicemailMocks'
import type { VatsCreateRequest, AsteriskInstanceUpdate, SIPUserCreateRequest, SIPUserUpdateRequest } from '@/types/vats'
import type { VoicemailCreate, VoicemailUpdate, VoicemailUserBindingRequest } from '@/types/voicemail'

const mockDetail = (message: string, status = 400): [number, { detail: string }] => [status, { detail: message }]

const runMock = <T>(fn: () => T): [number, T | { detail: string }] => {
  try {
    return [200, fn()]
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка mock'
    return mockDetail(message)
  }
}

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

  mock.onGet(API_CONFIG.ENDPOINTS.INSTANCES).reply(() => [200, getMockInstancesList()])

  mock.onGet(`${API_CONFIG.ENDPOINTS.INSTANCES}used-ports`).reply(() => [200, getMockUsedPorts()])

  mock.onPost(API_CONFIG.ENDPOINTS.INSTANCES).reply((config) => {
    const createTestUsers = config.url?.includes('create_test_users=true') ?? false
    const body = JSON.parse(config.data) as VatsCreateRequest
    const [status, data] = runMock(() => createMockInstance(body, createTestUsers))
    return [status === 200 ? 201 : status, data]
  })

  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)/)
    if (match?.[1]) {
      const id = parseInt(match[1], 10)
      const instance = getMockInstanceById(id)
      if (instance) return [200, instance]
    }
    return mockDetail('ВАТС не найдена', 404)
  })

  mock.onPut(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)/)
    if (!match?.[1]) return mockDetail('Некорректный запрос')
    const id = parseInt(match[1], 10)
    const body = JSON.parse(config.data) as AsteriskInstanceUpdate
    const [status, data] = runMock(() => updateMockInstance(id, body))
    return [status, data]
  })

  mock.onDelete(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)/)
    if (!match?.[1]) return mockDetail('Некорректный запрос')
    const id = parseInt(match[1], 10)
    if (deleteMockInstance(id)) return [200, {}]
    return mockDetail('ВАТС не найдена', 404)
  })

  mock.onPost(/\/instances\/(\d+)\/reload$/).reply(() => [200, { status: 'ok' }])
  mock.onPost(/\/instances\/(\d+)\/recreate-container$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/recreate-container/)
    if (!match?.[1]) return mockDetail('Некорректный запрос')
    const id = parseInt(match[1], 10)
    const [status, data] = runMock(() => updateMockInstance(id, { status: 'running' }))
    return [status, data]
  })

  mock.onPost(/\/instances\/send_comand\/([^/?]+)/).reply((config) => {
    const match = config.url?.match(/send_comand\/([^/?]+)/)
    const commandMatch = config.url?.match(/comand=([^&]+)/)
    if (!match?.[1] || !commandMatch?.[1]) return mockDetail('Некорректный запрос')
    const name = decodeURIComponent(match[1])
    const command = decodeURIComponent(commandMatch[1])
    return [200, mockSendCommand(name, command)]
  })

  mock.onGet(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/users/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/users/)
    if (!match?.[1]) return mockDetail('Некорректный запрос', 404)
    const id = parseInt(match[1], 10)
    const [status, data] = runMock(() => getMockUsers(id))
    return [status, data]
  })

  mock.onPost(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/users/?$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/users/)
    if (!match?.[1]) return mockDetail('Некорректный запрос', 404)
    const id = parseInt(match[1], 10)
    const body = JSON.parse(config.data) as SIPUserCreateRequest
    const [status, data] = runMock(() => createMockUser(id, body))
    return [status === 200 ? 201 : status, data]
  })

  mock.onPut(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/users/([^/]+)$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/users\/([^/]+)$/)
    if (!match?.[1] || !match[2]) return mockDetail('Некорректный запрос', 404)
    const id = parseInt(match[1], 10)
    const endpointId = decodeURIComponent(match[2])
    const body = JSON.parse(config.data) as SIPUserUpdateRequest
    const [status, data] = runMock(() => updateMockUser(id, endpointId, body))
    return [status, data]
  })

  mock.onDelete(new RegExp(`${API_CONFIG.ENDPOINTS.INSTANCES}(\\d+)/users/delete/([^/]+)$`)).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/users\/delete\/([^/]+)$/)
    if (!match?.[1] || !match[2]) return mockDetail('Некорректный запрос', 404)
    const id = parseInt(match[1], 10)
    const endpointId = decodeURIComponent(match[2])
    if (deleteMockUser(id, endpointId)) return [200, {}]
    return mockDetail('Пользователь не найден', 404)
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
    if (!file) return mockDetail('Файл не передан')
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
      return mockDetail('Файл не найден', 404)
    }
    return mockDetail('Некорректный запрос')
  })

  // GET /audio_files/get_file/{file_id}
  mock.onGet(/\/audio_files\/get_file\/\d+/).reply((config) => {
    const match = config.url?.match(/\/get_file\/(\d+)/)
    if (match?.[1]) {
      const fileId = parseInt(match[1], 10)
      const blob = getMockAudioFileBlob(fileId)
      if (blob) {
        return [200, blob, { 'Content-Type': 'audio/wav' }]
      }
      return mockDetail('Файл не найден', 404)
    }
    return mockDetail('Некорректный запрос')
  })

  // Voicemail
  mock.onGet(/\/instances\/(\d+)\/voicemail\/$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/$/)
    if (!match?.[1]) return mockDetail('Некорректный запрос', 404)
    return [200, getMockVoicemailBoxes(parseInt(match[1], 10))]
  })

  mock.onPost(/\/instances\/(\d+)\/voicemail\/$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/$/)
    if (!match?.[1]) return mockDetail('Некорректный запрос', 404)
    const instanceId = parseInt(match[1], 10)
    const body = JSON.parse(config.data) as VoicemailCreate
    const [status, data] = runMock(() => createMockVoicemailBox(instanceId, body))
    return [status === 200 ? 201 : status, data]
  })

  mock.onPut(/\/instances\/(\d+)\/voicemail\/([^/?]+)$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/([^/?]+)$/)
    if (!match?.[1] || !match[2]) return mockDetail('Некорректный запрос', 404)
    const instanceId = parseInt(match[1], 10)
    const mailbox = decodeURIComponent(match[2])
    const context = config.params?.context ?? 'default'
    const body = JSON.parse(config.data) as VoicemailUpdate
    const [status, data] = runMock(() => updateMockVoicemailBox(instanceId, mailbox, context, body))
    return [status, data]
  })

  mock.onDelete(/\/instances\/(\d+)\/voicemail\/([^/?]+)$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/([^/?]+)$/)
    if (!match?.[1] || !match[2]) return mockDetail('Некорректный запрос', 404)
    const context = config.params?.context ?? 'default'
    const deleted = deleteMockVoicemailBox(parseInt(match[1], 10), decodeURIComponent(match[2]), context)
    if (deleted) return [200, {}]
    return mockDetail('Голосовой ящик не найден', 404)
  })

  mock.onGet(/\/instances\/(\d+)\/voicemail\/([^/]+)\/recordings$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/([^/]+)\/recordings$/)
    if (!match?.[1] || !match[2]) return mockDetail('Некорректный запрос', 404)
    return [200, getMockVoicemailRecordings(parseInt(match[1], 10), decodeURIComponent(match[2]))]
  })

  mock.onGet(/\/instances\/(\d+)\/voicemail\/by-user\/([^/]+)$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/by-user\/([^/]+)$/)
    if (!match?.[1] || !match[2]) return mockDetail('Некорректный запрос', 404)
    const box = getMockVoicemailBoxByUser(parseInt(match[1], 10), decodeURIComponent(match[2]))
    if (box) return [200, box]
    return mockDetail('Голосовой ящик не найден', 404)
  })

  mock.onPost(/\/instances\/(\d+)\/voicemail\/bind-user$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/voicemail\/bind-user$/)
    if (!match?.[1]) return mockDetail('Некорректный запрос', 404)
    const body = JSON.parse(config.data) as VoicemailUserBindingRequest
    return [200, bindMockVoicemailUser(parseInt(match[1], 10), body)]
  })

  mock.onPost(/\/instances\/(\d+)\/voicemail\/unbind-user$/).reply(() => [200, { status: 'ok' }])

  mock.onGet('/logs/').reply((config) => {
    const page = parseInt(config.params?.page ?? 0)
    const limit = parseInt(config.params?.limit ?? 20)
    const level = config.params?.level ?? null
    const pbx_id = config.params?.pbx_id ?? null
    const text = config.params?.text ?? null
    return [200, getMockLogs(page, limit, level, pbx_id, text)]
  })
  mock.onGet(/\/instances\/\d+\/config\/types$/).reply(() => {
    return [200, {
      types: [
        { type: 'extensions', filename: 'extensions.conf', history_supported: true },
        { type: 'queues', filename: 'queues.conf', history_supported: true },
        { type: 'manager', filename: 'manager.conf', history_supported: true },
        { type: 'stasis', filename: 'stasis.conf', history_supported: true },
        { type: 'cdr', filename: 'cdr.conf', history_supported: true },
        { type: 'cdr_adaptive_odbc', filename: 'cdr_adaptive_odbc.conf', history_supported: true },
        { type: 'http', filename: 'http.conf', history_supported: true },
        { type: 'rtp', filename: 'rtp.conf', history_supported: true },
        { type: 'pjsip', filename: 'pjsip.conf', history_supported: false },
      ],
    }]
  })

  mock.onGet(/\/instances\/\d+\/config\/[^/]+\/history$/).reply((config) => {
    const match = config.url?.match(/\/instances\/(\d+)\/config\/([^/]+)\/history/)
    if (match?.[1] && match[2]) {
      const instanceId = parseInt(match[1], 10)
      const configType = match[2]
      return [200, getMockConfigHistory(instanceId, configType)]
    }
    return [404, { detail: 'Не найдено' }]
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
    return [400, { detail: 'Некорректный запрос' }]
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
    return [404, { detail: 'ВАТС не найдена' }]
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
      return [404, { detail: 'Очередь не найдена' }]
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
      return [404, { detail: 'Очередь не найдена' }]
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
      return [404, { detail: 'Очередь не найдена' }]
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

  mock.onGet('/templates').reply(200, [
    {
      id: 'office_basic',
      name: 'Офис: базовый',
      description: 'Малый офис',
      category: 'office',
      preview_items: ['2 номера', 'Правило _XXX'],
    },
  ])

  mock.onGet(/\/instances\/(\d+)\/users\/([^/]+)\/forwarding$/).reply(() => {
    return [200, { extension: '101', rules: [] }]
  })

  mock.onPut(/\/instances\/(\d+)\/users\/([^/]+)\/forwarding$/).reply((config) => {
    const body = JSON.parse(config.data)
    return [200, body.rules ?? []]
  })

  mock.onPost(/\/instances\/(\d+)\/apply-template$/).reply(() => {
    return [200, {
      template_id: 'office_basic',
      template_name: 'Офис: базовый',
      extensions_created: ['101', '102'],
      voicemail_boxes_created: 2,
      queues_created: 0,
      forwarding_rules_created: 0,
      dialplan_rows_added: 10,
      message: 'Шаблон применён',
    }]
  })

  mock.onPost(/\/instances\/(\d+)\/sync-routing$/).reply(() => {
    return [200, {
      extensions_synced: 2,
      dialplan_rows_added: 8,
      message: 'Маршрутизация номеров синхронизирована',
    }]
  })
}
