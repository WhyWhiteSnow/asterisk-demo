const API_ERROR_CODE_MAP: Record<string, string> = {
  instance_name_exists: 'ВАТС с таким именем уже существует',
  ports_conflict: 'Конфликт портов',
  rtp_range_invalid: 'Некорректный RTP-диапазон',
  docker_unavailable: 'Docker недоступен. Проверьте, что демон запущен.',
  container_start_failed: 'Не удалось запустить контейнер Asterisk',
  database_error: 'Ошибка базы данных',
  filesystem_error: 'Ошибка файловой системы',
  ami_error: 'Ошибка AMI',
  internal_error: 'Внутренняя ошибка сервера',
}

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
  'User not found': 'Пользователь не найден',
  'instance does not exists': 'ВАТС не найдена',
  'Failed to create instance': 'Не удалось создать ВАТС',
  'Queue not found': 'Очередь не найдена',
  'No fields to update': 'Нет полей для обновления',
  'Voicemail box already exists': 'Голосовой ящик уже существует',
  'Voicemail box not found': 'Голосовой ящик не найден',
  'File not found': 'Файл не найден',
  'No file provided': 'Файл не передан',
  'Invalid request': 'Некорректный запрос',
  'Not found': 'Не найдено',
  'Users not found': 'Пользователи не найдены',
}

export function translateApiCode(code: string): string | null {
  return API_ERROR_CODE_MAP[code] ?? null
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
  if (typeof detail === 'object' && detail !== null && 'msg' in detail) {
    return translateApiDetail(String((detail as { msg: string }).msg))
  }
  return String(detail)
}
