export interface ConfigHistoryEntry {
  id: number
  instance_id: number
  filename: string
  version: number
  description: string | null
  created_at: string
  author: string
}

export interface ConfigHistoryListResponse {
  config_type: string
  filename: string
  items: ConfigHistoryEntry[]
}

export interface ConfigHistoryVersionContent {
  config_type: string
  filename: string
  version: number
  history_id: number
  description: string | null
  created_at: string
  author: string
  content: string
  source: string
}

export interface ConfigRollbackRequest {
  history_id?: number | null
  version?: number | null
  change_author?: string | null
  reload_asterisk?: boolean
}

export interface ConfigRollbackResponse {
  message: string
  filename: string
  restored_version: number
  history_id: number
  rows_restored: number
  snapshot_saved_version: number | null
}

export interface ConfigTypeInfo {
  type: string
  filename: string
  history_supported: boolean
}

export interface ConfigTypesResponse {
  types: ConfigTypeInfo[]
}