export interface VoicemailBox {
  mailbox: string
  context: string
  password: string
  full_name: string
  email: string | null
}

export interface VoicemailCreate {
  mailbox: string
  password: string
  full_name: string
  email?: string | null
  context?: string
  link_endpoint_mwi?: boolean
}

export interface VoicemailUpdate {
  password?: string | null
  full_name?: string | null
  email?: string | null
}

export interface VoicemailRecording {
  id: string       // составной идентификатор vm:{instanceId}:{mailbox}:{folder}:{filename}
  name: string     // имя файла (msg0000.wav)
  format: string   // аудиоформат
  size_kb: number
  duration_sec: number
  create_date: string
  source: 'voicemail'
  instance_id: number
  instance_name: string
  mailbox: string
  folder: string   // INBOX, Old и т.д.
  caller_id: string | null
}

export interface VoicemailUserBindingRequest {
  user_id: string   // id SIP-пользователя (номер)
  mailbox: string
  context?: string
}

export interface VoicemailUserBindingResponse {
  user_id: string
  mailbox: string
  context: string
  linked: boolean
}

export interface VoicemailUserUnbindRequest {
  user_id: string
  mailbox?: string | null
  context?: string
}

export interface VoicemailUserUnbindResponse {
  user_id: string
  mailbox: string | null
  context: string
  unlinked: boolean
}