import type {
  VatsInstanceFromAPI,
  SIPUserFromAPI,
  VatsCreateRequest,
  AsteriskInstanceUpdate,
  SIPUserCreateRequest,
  SIPUserUpdateRequest,
} from '@/types/vats'
import { DEFAULT_TEST_EXTENSIONS } from '@/constants/testUsers'
import { DEFAULT_RTP_PORT_END, DEFAULT_RTP_PORT_START, RTP_BLOCK_SIZE } from '@/constants/vatsDefaults'

export const generateMockInstance = (id: number, overrides: Partial<VatsInstanceFromAPI> = {}): VatsInstanceFromAPI => ({
  id,
  name: `ВАТС-${id}`,
  sip_port: 5060 + id,
  http_port: 8088 + id,
  ami_port: 5038 + id,
  rtp_port_start: DEFAULT_RTP_PORT_START + (id - 1) * RTP_BLOCK_SIZE,
  rtp_port_end: DEFAULT_RTP_PORT_START + id * RTP_BLOCK_SIZE - 1,
  status: 'running',
  transport_type: 'udp',
  ...overrides,
})

export const generateMockInstanceList = (count: number = 3): VatsInstanceFromAPI[] =>
  Array.from({ length: count }, (_, i) => generateMockInstance(i + 1))

export const generateMockUsers = (_instanceId: number, _instanceName: string): SIPUserFromAPI[] => [
  {
    pk: 1,
    id: '6001',
    transport: 'transport-udp',
    context: 'from-internal',
    allow: 'ulaw,alaw',
    disallow: 'all',
    callerid: 'User 6001',
    aors_fk: { pk: 1, id: '6001-aor', reg_server: null, max_contacts: 1 },
    auths_fk: { pk: 1, id: '6001-auth', auth_type: 'userpass', username: '6001' },
  },
  {
    pk: 2,
    id: '6002',
    transport: 'transport-udp',
    context: 'from-internal',
    allow: 'ulaw,alaw',
    disallow: 'all',
    callerid: 'User 6002',
    aors_fk: { pk: 2, id: '6002-aor', reg_server: null, max_contacts: 1 },
    auths_fk: { pk: 2, id: '6002-auth', auth_type: 'userpass', username: '6002' },
  },
]

let mockInstances = generateMockInstanceList(3)
const mockUsersByInstance: Record<number, SIPUserFromAPI[]> = {}
let nextInstanceId = 4
let nextUserPk = 100

function ensureUsers(instanceId: number, instanceName: string) {
  if (!mockUsersByInstance[instanceId]) {
    mockUsersByInstance[instanceId] = generateMockUsers(instanceId, instanceName)
  }
}

mockInstances.forEach((inst) => ensureUsers(inst.id, inst.name))

export function getMockInstancesList(): VatsInstanceFromAPI[] {
  return mockInstances.map((i) => ({ ...i }))
}

export function getMockInstanceById(id: number): VatsInstanceFromAPI | undefined {
  const inst = mockInstances.find((i) => i.id === id)
  return inst ? { ...inst } : undefined
}

export function createMockInstance(
  data: VatsCreateRequest,
  createTestUsers: boolean
): VatsInstanceFromAPI {
  const duplicate = mockInstances.some((i) => i.name === data.name)
  if (duplicate) {
    throw new Error('Instance name already exists')
  }

  const portTaken = mockInstances.some((i) => i.sip_port === data.sip_port)
  if (portTaken) {
    throw new Error('Ports already in use')
  }

  const instance = generateMockInstance(nextInstanceId++, {
    name: data.name,
    sip_port: data.sip_port,
    http_port: data.http_port,
    ami_port: data.ami_port,
    rtp_port_start: data.rtp_port_start,
    rtp_port_end: data.rtp_port_end,
    transport_type: data.transport_type,
    status: 'running',
  })

  mockInstances.push(instance)
  mockUsersByInstance[instance.id] = []

  if (createTestUsers) {
    DEFAULT_TEST_EXTENSIONS.forEach((ext) => {
      mockUsersByInstance[instance.id]!.push({
        pk: nextUserPk++,
        id: ext,
        transport: `transport-${data.transport_type}`,
        context: 'from-internal',
        allow: 'ulaw,alaw',
        disallow: 'all',
        callerid: `Test ${ext}`,
        aors_fk: { pk: nextUserPk, id: `${ext}-aor`, reg_server: null, max_contacts: 1 },
        auths_fk: { pk: nextUserPk + 1, id: `${ext}-auth`, auth_type: 'userpass', username: ext },
      })
      nextUserPk += 2
    })
  }

  return { ...instance }
}

export function updateMockInstance(id: number, data: AsteriskInstanceUpdate): VatsInstanceFromAPI {
  const index = mockInstances.findIndex((i) => i.id === id)
  if (index === -1) throw new Error('Instance not found')

  const current = mockInstances[index]!
  const updated: VatsInstanceFromAPI = {
    ...current,
    name: data.name ?? current.name,
    sip_port: data.sip_port ?? current.sip_port,
    http_port: data.http_port ?? current.http_port,
    ami_port: data.ami_port ?? current.ami_port,
    rtp_port_start: data.rtp_port_start ?? current.rtp_port_start,
    rtp_port_end: data.rtp_port_end ?? current.rtp_port_end,
    status: data.status ?? current.status,
  }
  mockInstances[index] = updated
  return { ...updated }
}

export function deleteMockInstance(id: number): boolean {
  const before = mockInstances.length
  mockInstances = mockInstances.filter((i) => i.id !== id)
  delete mockUsersByInstance[id]
  return mockInstances.length < before
}

export function getMockUsers(instanceId: number): SIPUserFromAPI[] {
  const inst = mockInstances.find((i) => i.id === instanceId)
  if (!inst) throw new Error('Instance not found')
  ensureUsers(instanceId, inst.name)
  return mockUsersByInstance[instanceId]!.map((u) => ({ ...u }))
}

export function createMockUser(instanceId: number, data: SIPUserCreateRequest): SIPUserFromAPI {
  ensureUsers(instanceId, mockInstances.find((i) => i.id === instanceId)?.name ?? '')
  const users = mockUsersByInstance[instanceId]!
  if (users.some((u) => u.id === data.username)) {
    throw new Error('User already exists')
  }

  const user: SIPUserFromAPI = {
    pk: nextUserPk++,
    id: data.username,
    transport: `transport-${data.transport}`,
    context: data.context ?? 'from-internal',
    allow: 'ulaw,alaw',
    disallow: 'all',
    callerid: data.callerid,
    aors_fk: { pk: nextUserPk, id: `${data.username}-aor`, reg_server: null, max_contacts: 1 },
    auths_fk: { pk: nextUserPk + 1, id: `${data.username}-auth`, auth_type: 'userpass', username: data.username },
  }
  nextUserPk += 2
  users.push(user)
  return { ...user }
}

export function updateMockUser(
  instanceId: number,
  endpointId: string,
  data: SIPUserUpdateRequest
): SIPUserFromAPI {
  const users = mockUsersByInstance[instanceId]
  if (!users) throw new Error('Instance not found')
  const index = users.findIndex((u) => u.id === endpointId)
  if (index === -1) throw new Error('User not found')

  const current = users[index]!
  const updated: SIPUserFromAPI = {
    ...current,
    context: data.context ?? current.context,
    callerid: data.callerid ?? current.callerid,
    transport: data.transport ?? current.transport,
  }
  users[index] = updated
  return { ...updated }
}

export function deleteMockUser(instanceId: number, endpointId: string): boolean {
  const users = mockUsersByInstance[instanceId]
  if (!users) return false
  const before = users.length
  mockUsersByInstance[instanceId] = users.filter((u) => u.id !== endpointId)
  return mockUsersByInstance[instanceId]!.length < before
}

export function mockSendCommand(_instanceName: string, command: string): { output: string; success: boolean } {
  return {
    success: true,
    output: `[mock] Команда выполнена: ${command}\nStatus: OK`,
  }
}
