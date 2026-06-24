import type { TransportType } from '@/types/vats'

export const VATS_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,}$/

export const TRANSPORT_TYPE_OPTIONS: { value: TransportType; label: string }[] = [
  { value: 'udp', label: 'UDP' },
  { value: 'tcp', label: 'TCP' },
  { value: 'tls', label: 'TLS' },
]

export function sanitizeVatsNameInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '')
}

export function validateVatsName(
  name: string,
  options?: { existingNames?: string[]; currentName?: string }
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Обязательное поле'
  if (trimmed.length < 3) return 'Минимум 3 символа'
  if (!VATS_NAME_PATTERN.test(trimmed)) {
    return 'Только латинские буквы, цифры, дефис и подчёркивание'
  }

  const current = options?.currentName?.trim().toLowerCase()
  const duplicate = options?.existingNames?.some(
    (existing) =>
      existing.trim().toLowerCase() === trimmed.toLowerCase() &&
      existing.trim().toLowerCase() !== current
  )
  if (duplicate) {
    return 'ВАТС с таким именем уже существует в кластере'
  }

  return null
}

export function validateSipPort(
  port: number | string | null | undefined,
  options?: { usedPorts?: number[]; currentPort?: number }
): string | null {
  const val = Number(port)
  if (isNaN(val) || val < 1 || val > 65535) {
    return 'Укажите корректный SIP-порт (от 1 до 65535)'
  }

  const current = options?.currentPort
  if (options?.usedPorts?.includes(val) && val !== current) {
    return 'Этот SIP-порт уже используется другой ВАТС'
  }

  return null
}

export function validateTransportType(value: string): string | null {
  if (!['udp', 'tcp', 'tls'].includes(value)) {
    return 'Выберите корректный тип транспорта'
  }
  return null
}

export interface VatsGeneralFormErrors {
  name: string
  sip_port: string
  transport_type: string
  general: string
}

export function createEmptyVatsFormErrors(): VatsGeneralFormErrors {
  return { name: '', sip_port: '', transport_type: '', general: '' }
}

export function mapVatsSaveErrorToFields(message: string): Partial<VatsGeneralFormErrors> {
  const lower = message.toLowerCase()

  if (
    lower.includes('имя') &&
    (lower.includes('латин') || lower.includes('символ') || lower.includes('некоррект'))
  ) {
    return { name: message }
  }
  if (lower.includes('имя') && lower.includes('существует')) {
    return { name: message }
  }
  if (lower.includes('instance name already exists')) {
    return { name: 'ВАТС с таким именем уже существует' }
  }
  if (lower.includes('sip') && (lower.includes('порт') || lower.includes('занят') || lower.includes('конфликт'))) {
    return { sip_port: message.includes('SIP') ? 'Этот SIP-порт уже используется другой ВАТС' : message }
  }
  if (lower.includes('ports already in use') || lower.includes('ports_conflict')) {
    return { sip_port: 'Этот SIP-порт уже используется другой ВАТС' }
  }

  return { general: message }
}
