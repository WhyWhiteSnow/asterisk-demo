export type IncomingDestinationType = 'extension' | 'queue' | 'voicemail' | 'ivr'

export interface IncomingRoute {
  id: number
  instance_id: number
  did: string
  context: string
  destination_type: IncomingDestinationType
  destination_value: string
  description: string | null
  enabled: boolean
  sort_order: number
}

export interface IncomingRouteCreate {
  did: string
  context?: string
  destination_type: IncomingDestinationType
  destination_value: string
  description?: string | null
  enabled?: boolean
  sort_order?: number
}

export interface IncomingRouteUpdate {
  did?: string
  context?: string
  destination_type?: IncomingDestinationType
  destination_value?: string
  description?: string | null
  enabled?: boolean
  sort_order?: number
}

export const INCOMING_DESTINATION_OPTIONS = [
  { value: 'extension', label: 'Внутренний номер' },
  { value: 'queue', label: 'Очередь' },
  { value: 'voicemail', label: 'Голосовая почта' },
  { value: 'ivr', label: 'IVR (аудио + ожидание)' },
] as const

export const INCOMING_CONTEXT_OPTIONS = [
  { value: 'from-external', label: 'from-external (входящие)' },
  { value: 'from-internal', label: 'from-internal (внутренние)' },
] as const
