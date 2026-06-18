const API_ERROR_MAP: Record<string, string> = {
  'Instance name already exists': 'ВАТС с таким именем уже существует',
  'Ports already in use': 'Один или несколько портов уже заняты другой ВАТС',
  'HTTP port already in use': 'HTTP-порт уже используется',
  'AMI port already in use': 'AMI-порт уже используется',
  'RTP start port already in use': 'Начальный RTP-порт уже используется',
  'RTP end port already in use': 'Конечный RTP-порт уже используется',
  'rtp_port_start must be less than rtp_port_end': 'Начало RTP-диапазона должно быть меньше конца',
  'Instance not found': 'ВАТС не найдена',
  'User already exists': 'Пользователь с таким номером уже существует',
  'instance does not exists': 'ВАТС не найдена',
  'Failed to create instance': 'Не удалось создать ВАТС',
  'Queue not found': 'Очередь не найдена',
  'No fields to update': 'Нет полей для обновления',
}

export function translateApiDetail(detail: unknown): string | null {
  if (detail == null) return null
  if (typeof detail === 'string') {
    for (const [en, ru] of Object.entries(API_ERROR_MAP)) {
      if (detail.includes(en)) return detail.replace(en, ru)
    }
    return detail
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          return translateApiDetail(String((item as { msg: string }).msg))
        }
        return translateApiDetail(String(item))
      })
      .filter(Boolean)
    return messages.length > 0 ? messages.join('; ') : null
  }
  return String(detail)
}
