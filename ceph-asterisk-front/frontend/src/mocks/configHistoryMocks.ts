// src/mocks/configHistoryMocks.ts
import type {
  ConfigHistoryListResponse,
  ConfigHistoryVersionContent,
  ConfigRollbackResponse,
} from '@/types/configHistory'

const mockInstances = [1, 2, 3]
const configTypes = ['pjsip.conf', 'extensions.conf', 'queues.conf']

// Базовая генерация
const generateVersionContent = (instanceId: number, configType: string, version: number): string => {
  const filename = getFilename(configType)
  return `# ${filename} для инстанса ${instanceId}, версия ${version}
[general]
context=default
allowoverlap=yes

[${configType.split('.')[0]}]
type=peer
host=dynamic
context=from-internal
`
}

const getFilename = (configType: string): string => {
  const map: Record<string, string> = {
    pjsip: 'pjsip.conf',
    extensions: 'extensions.conf',
    queues: 'queues.conf',
    manager: 'manager.conf',
    stasis: 'stasis.conf',
    cdr: 'cdr.conf',
    cdr_adaptive_odbc: 'cdr_adaptive_odbc.conf',
    http: 'http.conf',
    rtp: 'rtp.conf',
  }
  return map[configType] || `${configType}.conf`
}

const generateHistoryEntry = (id: number, version: number, instanceId: number, configType: string): any => ({
  id,
  instance_id: instanceId,
  filename: configType,
  version,
  description: version === 1 ? 'Исходная конфигурация' : `Обновление #${version}`,
  created_at: new Date(Date.now() - version * 86400000).toISOString(),
  author: version === 1 ? 'system' : `user${(version % 3) + 1}`,
})

// Хранилище (in-memory)
const historyStore = new Map<string, any[]>()

export const getMockConfigHistory = (
  instanceId: number,
  configType: string
): ConfigHistoryListResponse => {
  const key = `${instanceId}-${configType}`
  if (!historyStore.has(key)) {
    const items = Array.from({ length: 10 }, (_, i) => generateHistoryEntry(i + 1, i + 1, instanceId, configType)).reverse()
    historyStore.set(key, items)
  }
  const items = historyStore.get(key)!
  return {
    config_type: configType,   // то же, что пришло
    filename: getFilename(configType),
    items,
  }
}

export const getMockConfigVersionContent = (
  instanceId: number,
  configType: string,
  version: number
): ConfigHistoryVersionContent => {
  const history = getMockConfigHistory(instanceId, configType)
  const entry = history.items.find(e => e.version === version)
  if (!entry) throw new Error('Version not found')
  return {
    config_type: configType,
    filename: configType,
    version,
    history_id: entry.id,
    description: entry.description,
    created_at: entry.created_at,
    author: entry.author,
    content: generateVersionContent(instanceId, configType, version),
    source: 'history',
  }
}

export const postMockRollback = (
  instanceId: number,
  configType: string,
  version: number
): ConfigRollbackResponse => {
  // Симулируем откат – добавляем новую версию в историю
  const key = `${instanceId}-${configType}`
  const existing = historyStore.get(key) || []
  const newVersion = (existing.length > 0 ? Math.max(...existing.map(e => e.version)) : 0) + 1
  const newEntry = generateHistoryEntry(Date.now(), newVersion, instanceId, configType)
  newEntry.description = `Откат к версии ${version}`
  historyStore.set(key, [newEntry, ...existing])
  return {
    message: `Откат к версии ${version} выполнен успешно`,
    filename: configType,
    restored_version: version,
    history_id: newEntry.id,
    rows_restored: 1,
    snapshot_saved_version: newVersion,
  }
}

export const getMockCurrentConfig = (instanceId: number, configType: string): string => {
  const history = getMockConfigHistory(instanceId, configType)
  const lastVersion = history.items[0]?.version || 1
  return generateVersionContent(instanceId, configType, lastVersion)
}