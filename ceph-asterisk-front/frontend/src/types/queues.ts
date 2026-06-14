export interface QueueResponse {
  name: string
  strategy?: string | null
  timeout?: string | null
  retry?: string | null
  musicclass?: string | null
  ringinuse?: string | null
  maxlen?: string | null
  members?: string[]
  options?: Record<string, string>
}

export interface QueueCreate {
  name: string
  strategy?: string
  timeout?: number
  retry?: number
  musicclass?: string
  ringinuse?: string | null
  maxlen?: number | null
  members?: string[]
  options?: Record<string, string>
}

export interface QueueUpdate {
  strategy?: string | null
  timeout?: number | null
  retry?: number | null
  musicclass?: string | null
  ringinuse?: string | null
  maxlen?: number | null
  members?: string[] | null
  options?: Record<string, string> | null
}