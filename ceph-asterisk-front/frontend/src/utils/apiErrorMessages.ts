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
  instance_name_invalid: 'Некорректное имя ВАТС',
}

const API_ERROR_MAP: Record<string, string> = {
  'Incorrect login or password': 'Неверный логин или пароль',
  'Invalid credentials': 'Неверный логин или пароль',
  'Invalid LDAP credentials': 'Неверный логин или пароль',
  'Could not validate credentials': 'Сессия истекла. Войдите снова',
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
  'queue name must not be empty': 'Укажите название очереди',
  'queue name must start with a letter and contain only letters, digits, _ or -':
    'Название очереди должно начинаться с латинской буквы и содержать только латинские буквы, цифры, символы _ или - (кириллица и пробелы не поддерживаются)',
  'mailbox must not be empty': 'Укажите номер голосового ящика',
  'mailbox must start with a digit, letter, * or # and contain only alphanumeric, _ or -':
    'Номер ящика должен начинаться с цифры, латинской буквы, * или # и содержать только буквы, цифры, _ или -',
  'context must not be empty': 'Укажите контекст',
  'String should have at least 4 characters': 'Минимальная длина — 4 символа',
  'String should have at least 1 characters': 'Поле не может быть пустым',
  'String should have at most 10 characters': 'Максимальная длина — 10 символов',
  'String should have at most 80 characters': 'Максимальная длина — 80 символов',
  'Field required': 'Обязательное поле',
  'value is not a valid email address': 'Укажите корректный email',
  'port must be an integer': 'Порт должен быть целым числом',
  'Timeout during container shutdown': 'Превышено время ожидания при остановке контейнера',
  'Failed to recreate container': 'Не удалось перезапустить контейнер',
  'Failed to simulate call': 'Не удалось имитировать звонок',
  'Error during deletion': 'Ошибка при удалении',
  'Database error': 'Ошибка базы данных',
  'History record not found': 'Запись истории не найдена',
  'Config not found in database': 'Конфигурация не найдена в базе данных',
  'Config file not found': 'Файл конфигурации не найден',
  'Failed to rollback config': 'Не удалось откатить конфигурацию',
  'Failed to read config': 'Не удалось прочитать конфигурацию',
  'Failed to update config': 'Не удалось обновить конфигурацию',
  'Failed to update config in DB': 'Не удалось обновить конфигурацию в базе данных',
  'History record does not match this instance or config file':
    'Запись истории не относится к этой ВАТС или файлу конфигурации',
  'Specify either history_id or version, not both':
    'Укажите history_id или version, но не оба параметра одновременно',
  'Specify history_id or version': 'Укажите history_id или version',
  'Input should be a valid integer': 'Укажите целое число',
  'Input should be greater than or equal to 1': 'Значение должно быть не меньше 1',
  'Input should be greater than or equal to 0': 'Значение должно быть не меньше 0',
  'Input should be less than or equal to 65535': 'Значение должно быть не больше 65535',
}

const API_ERROR_PATTERNS: Array<{ pattern: RegExp; replace: (match: RegExpMatchArray) => string }> = [
  {
    pattern: /^queue name '(.+)' is reserved$/,
    replace: (m) => `Название очереди «${m[1]}» зарезервировано системой`,
  },
  {
    pattern: /^context '(.+)' is reserved$/,
    replace: (m) => `Значение «${m[1]}» зарезервировано и не может использоваться`,
  },
  {
    pattern: /^Instance '(.+)' not found$/,
    replace: () => 'ВАТС не найдена',
  },
  {
    pattern: /^Database error: (.+)$/,
    replace: (m) => `Ошибка базы данных: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^Ошибка при (обновлении|удалении) пользователя: (.+)$/,
    replace: (m) =>
      `Ошибка при ${m[1]} пользователя: ${translateSingleMessage(m[2] ?? '')}`,
  },
  {
    pattern: /^Timeout while running '(.+)' in (.+)$/,
    replace: (m) =>
      `Превышено время ожидания команды «${m[1]}» в контейнере ${m[2]}`,
  },
  {
    pattern: /^Error running '(.+)' in (.+): (.+)$/,
    replace: (m) =>
      `Ошибка выполнения «${m[1]}» в ${m[2]}: ${translateSingleMessage(m[3] ?? '')}`,
  },
  {
    pattern: /^Failed to rollback config: (.+)$/,
    replace: (m) => `Не удалось откатить конфигурацию: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^Failed to read config: (.+)$/,
    replace: (m) => `Не удалось прочитать конфигурацию: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^Failed to update config: (.+)$/,
    replace: (m) => `Не удалось обновить конфигурацию: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^Failed to update config in DB: (.+)$/,
    replace: (m) =>
      `Не удалось обновить конфигурацию в базе данных: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^Version (\d+) of (.+) not found for instance_id=\d+$/,
    replace: (m) => `Версия ${m[1]} файла ${m[2]} не найдена`,
  },
  {
    pattern: /^History record (\d+) not found$/,
    replace: (m) => `Запись истории ${m[1]} не найдена`,
  },
  {
    pattern: /^Config (.+) restored to version (\d+)(.*)$/,
    replace: (m) =>
      `Конфигурация ${m[1]} восстановлена до версии ${m[2]}${translateRollbackTail(m[3] ?? '')}`,
  },
  {
    pattern: /^Config '(.+)' is stored on disk; version history is only available for database realtime configs$/,
    replace: () =>
      'История версий доступна только для конфигураций в базе данных (realtime), не для файлов на диске',
  },
  {
    pattern: /^Error during deletion: (.+)$/,
    replace: (m) => `Ошибка при удалении: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^Failed to recreate container: (.+)$/,
    replace: (m) => `Не удалось перезапустить контейнер: ${translateSingleMessage(m[1] ?? '')}`,
  },
  {
    pattern: /^String should have at least (\d+) character/,
    replace: (m) => `Минимальная длина — ${m[1]} символов`,
  },
  {
    pattern: /^String should have at most (\d+) character/,
    replace: (m) => `Максимальная длина — ${m[1]} символов`,
  },
  {
    pattern: /^Input should be greater than or equal to (\d+)$/,
    replace: (m) => `Значение должно быть не меньше ${m[1]}`,
  },
  {
    pattern: /^Input should be less than or equal to (\d+)$/,
    replace: (m) => `Значение должно быть не больше ${m[1]}`,
  },
  {
    pattern: /^Ошибка файловой системы: (.+)$/,
    replace: (m) => `Ошибка файловой системы: ${m[1]}`,
  },
]

function translateRollbackTail(tail: string): string {
  if (!tail) return ''
  if (tail.includes('Asterisk reloaded')) return '; Asterisk перезагружен'
  const reloadFailed = tail.match(/; Asterisk reload failed: (.+)/)
  if (reloadFailed) {
    return `; не удалось перезагрузить Asterisk: ${translateSingleMessage(reloadFailed[1] ?? '')}`
  }
  return translateSingleMessage(tail)
}

function translateSingleMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return trimmed

  for (const { pattern, replace } of API_ERROR_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) return replace(match)
  }

  if (API_ERROR_MAP[trimmed]) return API_ERROR_MAP[trimmed]

  for (const [en, ru] of Object.entries(API_ERROR_MAP)) {
    if (trimmed.includes(en)) return trimmed.replace(en, ru)
  }

  return trimmed
}

export function translateApiCode(code: string): string | null {
  return API_ERROR_CODE_MAP[code] ?? null
}

export function translateApiDetail(detail: unknown): string | null {
  if (detail == null) return null
  if (typeof detail === 'string') {
    return translateSingleMessage(detail)
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
