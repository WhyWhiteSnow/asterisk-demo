import type { VatsInstanceFromAPI, SIPUserFromAPI } from '@/types/vats'

// Генерация одного инстанса
export const generateMockInstance = (id: number): VatsInstanceFromAPI => ({
  id,
  name: `ВАТС-${id}`,
  sip_port: 5060 + id,
  http_port: 8088 + id,
  ami_port: 5038 + id,
  rtp_port_start: 10000,
  rtp_port_end: 20000,
  status: 'running',
})

// Генерация списка всех инстансов (например, для GET /instances/)
export const generateMockInstanceList = (count: number = 3): VatsInstanceFromAPI[] => {
  return Array.from({ length: count }, (_, i) => generateMockInstance(i + 1))
}

// Генерация списка SIP-пользователей для конкретного инстанса
export const generateMockUsers = (instanceId: number, instanceName: string): SIPUserFromAPI[] => [
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