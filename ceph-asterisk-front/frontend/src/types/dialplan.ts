export interface DialplanRowResponse {
  id: number
  cat_metric: number
  var_metric: number
  category: string
  var_name: string
  var_val: string
  commented: number
}

export interface DialplanRowUpdate {
  cat_metric: number
  var_metric: number
  category: string
  var_name: string
  var_val: string
  commented?: number // 0 или 1, по умолч. 0
}

export interface DialplanResponse {
  instance_id: number
  filename: string
  rows: DialplanRowResponse[]
}

export interface DialplanContextUpdate {
  filename: string
  rows: DialplanRowUpdate[]
  change_author?: string | null
  description?: string | null
  reload_asterisk?: boolean
}

export interface DialplanUpdate {
  filename: string
  rows: DialplanRowUpdate[]
  change_author?: string | null
  description?: string | null
  reload_asterisk?: boolean
}

// Вспомогательный тип для группировки по контекстам
export interface ContextGroup {
  name: string
  rows: DialplanRowResponse[]
}