export interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  preview_items: string[]
}

export interface ApplyTemplateRequest {
  template_id: string
  change_author?: string
  reload_asterisk?: boolean
}

export interface ApplyTemplateResult {
  template_id: string
  template_name: string
  extensions_created: string[]
  voicemail_boxes_created: number
  queues_created: number
  forwarding_rules_created: number
  dialplan_rows_added: number
  message: string
}

export interface SyncRoutingResult {
  extensions_synced: number
  dialplan_rows_added: number
  message: string
}
