import type { DialplanRowResponse, DialplanRowUpdate, DialplanResponse } from '@/types/dialplan'

const defaultRows: DialplanRowResponse[] = [
  {
    id: 1,
    cat_metric: 1,
    var_metric: 1,
    category: 'default',
    var_name: 'exten',
    var_val: '100,1,NoOp(Incoming call)',   // исправлено
    commented: 0,
  },
  {
    id: 2,
    cat_metric: 1,
    var_metric: 2,
    category: 'default',
    var_name: 'exten',
    var_val: '100,2,Dial(SIP/101,20)',      // исправлено
    commented: 0,
  },
  {
    id: 3,
    cat_metric: 1,
    var_metric: 3,
    category: 'default',
    var_name: 'include',
    var_val: 'internal',
    commented: 0,
  },
  {
    id: 4,
    cat_metric: 2,
    var_metric: 1,
    category: 'internal',
    var_name: 'exten',
    var_val: '101,1,Answer()',               // исправлено
    commented: 0,
  },
  {
    id: 5,
    cat_metric: 2,
    var_metric: 2,
    category: 'internal',
    var_name: 'switch',
    var_val: '_X.',
    commented: 0,
  },
]

const dialplanStore = new Map<number, DialplanResponse>()
dialplanStore.set(1, { instance_id: 1, filename: 'extensions.conf', rows: JSON.parse(JSON.stringify(defaultRows)) })

export const getMockDialplan = (instanceId: number, filename: string = 'extensions.conf'): DialplanResponse => {
  if (!dialplanStore.has(instanceId)) {
    dialplanStore.set(instanceId, { instance_id: instanceId, filename, rows: [] })
  }
  return dialplanStore.get(instanceId)!
}

export const updateMockDialplan = (instanceId: number, data: { rows: DialplanRowUpdate[] }): DialplanResponse => {
  const existing = getMockDialplan(instanceId)
  // Перестраиваем rows с новыми данными, назначаем новые id
  const newRows: DialplanRowResponse[] = data.rows.map((row, idx) => ({
    id: Date.now() + idx,
    cat_metric: row.cat_metric ?? 0,
    var_metric: row.var_metric,
    category: row.category,
    var_name: row.var_name,
    var_val: row.var_val,
    commented: row.commented ?? 0,
  }))
  existing.rows = newRows
  return existing
}

export const getMockContexts = (instanceId: number): string[] => {
  const dp = getMockDialplan(instanceId)
  const contexts = new Set(dp.rows.map(r => r.category))
  return Array.from(contexts).sort()
}

export const getMockContext = (instanceId: number, contextName: string): DialplanResponse => {
  const dp = getMockDialplan(instanceId)
  const filteredRows = dp.rows.filter(r => r.category === contextName)
  return { ...dp, rows: filteredRows }
}

export const updateMockContext = (instanceId: number, contextName: string, data: { rows: DialplanRowUpdate[] }): DialplanResponse => {
  const dp = getMockDialplan(instanceId)
  // Удаляем старые строки контекста
  const otherRows = dp.rows.filter(r => r.category !== contextName)
  const newRows: DialplanRowResponse[] = data.rows.map((row, idx) => ({
    id: Date.now() + idx,
    cat_metric: row.cat_metric ?? 0,
    var_metric: row.var_metric,
    category: contextName,
    var_name: row.var_name,
    var_val: row.var_val,
    commented: row.commented ?? 0,
  }))
  dp.rows = [...otherRows, ...newRows]
  return dp
}