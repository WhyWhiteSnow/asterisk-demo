export interface ParsedMessageModel {
  timestamp: string | null
  level: string
  pid: string | null
  file?: string | null
  message: string
}

export interface LogEntry {
  message: ParsedMessageModel
  pbx_id: string | number | null
}

export type LogsTotalRelation = 'eq' | 'gte'

export interface LogsModel {
  status: string
  data: LogEntry[]
  total: number
  relation: LogsTotalRelation
}