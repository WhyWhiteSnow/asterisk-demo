// src/mocks/logsMocks.ts
import type { LogsModel, LogEntry } from '@/types/logs'

// Генерация случайной даты в пределах последних 7 дней
const randomDate = (): string => {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * 7)
  const hoursAgo = Math.floor(Math.random() * 24)
  const minutesAgo = Math.floor(Math.random() * 60)
  const secondsAgo = Math.floor(Math.random() * 60)
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(d.getHours() - hoursAgo)
  d.setMinutes(d.getMinutes() - minutesAgo)
  d.setSeconds(d.getSeconds() - secondsAgo)
  return d.toISOString()
}

// Уровни логов (веса для случайного выбора)
const instanceNames = ['ВАТС-1', 'ВАТС-2', 'ВАТС-3']
const levels = ['DEBUG', 'VERBOSE', 'NOTICE', 'WARNING', 'ERROR', 'UNKNOWN']
const levelWeights = [0.15, 0.15, 0.15, 0.25, 0.15, 0.05]

const getRandomLevel = (): string => {
  const rand = Math.random()
  let sum = 0
  for (let i = 0; i < levelWeights.length; i++) {
    sum += levelWeights[i] ?? 0
    if (rand < sum) return levels[i] ?? 'NOTICE'
  }
  return 'NOTICE'
}

// Сообщения для разных уровней
const messagesByLevel: Record<string, string[]> = {
  DEBUG: [
    'RTP packet received from 192.168.1.100:5060',
    'Audio stream established for call ID: 12345',
    'Parsing config file: extensions.conf',
    'Dialplan application "Dial" invoked',
  ],
  VERBOSE: [
    'SIP/101-00000001 answered SIP/trunk-00000002',
    'New call from +79161234567 to extension 101',
    'Queue call completed: queue-support, time=125s',
    'Call from +79167778899 to 104 completed, duration: 45s',
    'Registered SIP peer 105 at 192.168.1.100:5060',
    'Unregistered SIP peer 106',
  ],
  WARNING: [
    'SIP/102 Registration timeout',
    'Type "name" is not defined in table',
    'RTP port range exhausted, using dynamic port',
    'High latency detected on trunk',
  ],
  ERROR: [
    'Failed to authenticate SIP peer 103',
    'Database connection lost, attempting reconnect',
    'Cannot allocate memory for RTP session',
    'Invalid configuration file line 42',
  ],
  NOTICE: [
    'Reloading configuration files',
    'SIP peer 107 registered successfully',
    'Call detail record written to database',
  ],
  UNKNOWN: [
    'Unrecognized command: "status"',
    'Unexpected token in config line 123',
  ],
}

// Генерация одной записи лога (согласно новой спецификации)
const generateMockLogEntry = (id: number): LogEntry => {
  const level = getRandomLevel()
  const messages = messagesByLevel[level] ?? messagesByLevel.NOTICE ?? []
  const msgText = messages[Math.floor(Math.random() * messages.length)] ?? 'Log message'
  return {
    message: {
      timestamp: randomDate(),
      level,
      pid: (Math.floor(Math.random() * 9000) + 1000).toString(),
      file: Math.random() > 0.7 ? 'asterisk.c' : null,
      message: msgText,   // поле message (было msg)
    },
    pbx_id: instanceNames[Math.floor(Math.random() * instanceNames.length)] ?? 'ВАТС-1',
  }
}

// Статический кэш мок-данных (генерируем один раз)
let staticLogsCache: LogEntry[] | null = null

const generateMockLogs = (count: number = 500): LogEntry[] => {
  if (!staticLogsCache) {
    staticLogsCache = Array.from({ length: count }, (_, i) => generateMockLogEntry(i + 1))
    // сортировка по убыванию timestamp
    staticLogsCache.sort((a, b) => {
      const tsA = a.message.timestamp ? new Date(a.message.timestamp).getTime() : 0
      const tsB = b.message.timestamp ? new Date(b.message.timestamp).getTime() : 0
      return tsB - tsA
    })
  }
  return staticLogsCache
}

// Экспортируемая функция с поддержкой фильтрации
export const getMockLogs = (
  page: number = 0,
  limit: number = 20,
  level?: string | null,
  pbx_id?: string | null,
  text?: string | null
): LogsModel => {
  let allLogs = generateMockLogs(500)

  // Фильтрация по уровню
  if (level && level !== 'all') {
    allLogs = allLogs.filter(log => log.message.level === level)
  }
  // Фильтрация по pbx_id (ВАТС)
  if (pbx_id && pbx_id !== 'all') {
    allLogs = allLogs.filter(log => String(log.pbx_id) === pbx_id)
  }
  // Фильтрация по тексту сообщения
  if (text && text.trim()) {
    const lowerText = text.toLowerCase()
    allLogs = allLogs.filter(log => log.message.message.toLowerCase().includes(lowerText))
  }

  const offset = page * limit
  const items = allLogs.slice(offset, offset + limit)
  return {
    status: 'success',
    data: items,
    total: allLogs.length,
    relation: 'eq',
  }
}