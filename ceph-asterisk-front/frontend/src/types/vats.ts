import type { VatsUiStatus } from '@/utils/vatsStatus'

export type TransportType = 'udp' | 'tcp' | 'tls'

export interface VatsFormData {
  name: string
  sipPort: string
  server: string
  transportType: string
}

export interface InternalNumber {
  id: string
  number: string
  password?: string
  callerId: string
  context: string
  sipTransport: TransportType
}

export interface AorSchema {
  pk: number
  id: string
  reg_server: string | null
  max_contacts: number
}

export interface AuthSchema {
  pk: number
  id: string
  auth_type: string
  username: string | null
}

export interface SIPUserCreateRequest {
  username: string
  password: string
  context?: string
  max_contacts?: number
  transport?: TransportType
  callerid: string
}

export interface SIPUserUpdateRequest {
  transport?: string
  context?: string
  callerid?: string
  auth?: {
    password?: string
  }
}

export interface VatsTableItem {
  id: string
  name: string
  status: VatsUiStatus
  apiStatus: string
  server: string
  port: number
  sip_port?: string
  date: string
  transportType: string
  internalNumbers: InternalNumber[]
}

export interface VatsUpdateData {
  id: string
  name: string
  status: 'Активна' | 'Отключена'
  server: string
  port: number
  transportType: string
  internalNumbers: InternalNumber[]
}

export interface VatsInstanceFromAPI {
  id: number
  name: string
  status: string
  sip_port: number
  http_port?: number
  ami_port?: number
  rtp_port_start?: number
  rtp_port_end?: number
  transport_type?: TransportType
  create_test_users?: boolean
  created_at?: string
}

export interface SIPUserFromAPI {
  pk: number
  id: string
  transport: string
  context: string
  allow: string
  disallow: string
  callerid: string
  aors_fk: AorSchema
  auths_fk: AuthSchema
}

export interface VatsCreateRequest {
  name: string
  sip_port: number
  http_port: number
  ami_port: number
  rtp_port_start: number
  rtp_port_end: number
  transport_type: TransportType
  create_test_users?: boolean
}

export interface AsteriskInstanceUpdate {
  name?: string | null
  sip_port?: number | null
  http_port?: number | null
  ami_port?: number | null
  rtp_port_start?: number | null
  rtp_port_end?: number | null
  status?: string | null
}