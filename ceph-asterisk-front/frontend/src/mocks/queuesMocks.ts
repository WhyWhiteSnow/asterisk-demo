// src/mocks/queuesMocks.ts
import type { QueueResponse, QueueCreate, QueueUpdate } from '@/types/queues'

// Хранилище очередей в памяти (по instance_id)
const queuesStore = new Map<number, Map<string, QueueResponse>>()

// Начальные данные для примера
const initMockData = () => {
  const initialQueues: QueueResponse[] = [
    {
      name: 'support',
      strategy: 'rrmemory',
      timeout: '20',
      retry: '5',
      musicclass: 'default',
      ringinuse: 'no',
      maxlen: '10',
      members: ['SIP/101', 'SIP/102'],
      options: { autofill: 'yes' },
    },
    {
      name: 'sales',
      strategy: 'ringall',
      timeout: '30',
      retry: '3',
      musicclass: 'holdmusic',
      ringinuse: 'yes',
      maxlen: '20',
      members: ['SIP/201', 'SIP/202'],
      options: { announce_holdtime: 'no' },
    },
  ]
  const instanceId = 1
  if (!queuesStore.has(instanceId)) {
    const map = new Map()
    initialQueues.forEach(q => map.set(q.name, q))
    queuesStore.set(instanceId, map)
  }
}
initMockData()

export const getMockQueues = (instanceId: number): QueueResponse[] => {
  const map = queuesStore.get(instanceId)
  if (!map) return []
  return Array.from(map.values())
}

export const getMockQueue = (instanceId: number, queueName: string): QueueResponse | null => {
  const map = queuesStore.get(instanceId)
  return map?.get(queueName) || null
}

export const createMockQueue = (instanceId: number, data: QueueCreate): QueueResponse => {
  const map = queuesStore.get(instanceId) || new Map()
  const newQueue: QueueResponse = {
    name: data.name,
    strategy: data.strategy || 'rrmemory',
    timeout: data.timeout?.toString() || '20',
    retry: data.retry?.toString() || '5',
    musicclass: data.musicclass || 'default',
    ringinuse: data.ringinuse || null,
    maxlen: data.maxlen?.toString() || null,
    members: data.members || [],
    options: data.options || {},
  }
  map.set(data.name, newQueue)
  queuesStore.set(instanceId, map)
  return newQueue
}

export const updateMockQueue = (
  instanceId: number,
  queueName: string,
  data: QueueUpdate
): QueueResponse | null => {
  const map = queuesStore.get(instanceId)
  if (!map) return null
  const existing = map.get(queueName)
  if (!existing) return null
  const updated: QueueResponse = {
    ...existing,
    strategy: data.strategy ?? existing.strategy,
    timeout: data.timeout?.toString() ?? existing.timeout,
    retry: data.retry?.toString() ?? existing.retry,
    musicclass: data.musicclass ?? existing.musicclass,
    ringinuse: data.ringinuse ?? existing.ringinuse,
    maxlen: data.maxlen?.toString() ?? existing.maxlen,
    members: data.members ?? existing.members,
    options: data.options ?? existing.options,
  }
  map.set(queueName, updated)
  return updated
}

export const deleteMockQueue = (instanceId: number, queueName: string): boolean => {
  const map = queuesStore.get(instanceId)
  if (!map) return false
  return map.delete(queueName)
}