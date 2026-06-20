export type ForwardType = 'cfu' | 'cfna' | 'cfb'
export type ForwardTargetType = 'extension' | 'voicemail' | 'external'

export interface ForwardingRule {
  forward_type: ForwardType
  target_type: ForwardTargetType
  target_value: string
  timeout_seconds: number
  enabled: boolean
}

export interface ForwardingRuleResponse extends ForwardingRule {
  id: number
  extension: string
  updated_at: string
}

export interface ExtensionForwardingListResponse {
  extension: string
  rules: ForwardingRuleResponse[]
}

export interface ExtensionForwardingUpdate {
  rules: ForwardingRule[]
  change_author?: string
  reload_asterisk?: boolean
}

export const FORWARD_TYPE_LABELS: Record<ForwardType, string> = {
  cfu: 'Безусловная (всегда)',
  cfna: 'При неответе',
  cfb: 'При занятости',
}

export const TARGET_TYPE_LABELS: Record<ForwardTargetType, string> = {
  extension: 'Внутренний номер',
  voicemail: 'Голосовая почта',
  external: 'Внешний номер',
}
