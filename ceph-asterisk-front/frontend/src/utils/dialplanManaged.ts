export interface ManagedMeta {
  isManaged: boolean
  managedSuffix: string | null
  blockLabel: string | null
}

export function extractManagedMeta(varVal: string): ManagedMeta {
  const semiIdx = varVal.indexOf(';')
  if (semiIdx === -1) {
    return { isManaged: false, managedSuffix: null, blockLabel: null }
  }

  const suffix = varVal.slice(semiIdx + 1)
  const isManaged = suffix.includes('@managed:')
  if (!isManaged) {
    return { isManaged: false, managedSuffix: null, blockLabel: null }
  }

  const blockMatch = suffix.match(/(?:^|;)block=([^;]+)/)
  return {
    isManaged: true,
    managedSuffix: suffix,
    blockLabel: blockMatch?.[1]?.trim() || null,
  }
}

export function appendManagedSuffix(varVal: string, managedSuffix: string | null): string {
  if (!managedSuffix) return varVal
  const semiIdx = varVal.indexOf(';')
  const base = semiIdx === -1 ? varVal : varVal.slice(0, semiIdx)
  return `${base};${managedSuffix}`
}

export interface BlockGroupableRow {
  extension: string
  isManaged: boolean
  managedBlockLabel: string | null
  blockId: string | null
  blockLabel: string | null
  isManagedBlock: boolean
}

export function assignBlockGroups<T extends BlockGroupableRow>(rows: T[]): void {
  let groupLabel: string | null = null
  let blockId: string | null = null

  for (const row of rows) {
    if (row.blockId && row.blockLabel && !row.isManaged) {
      groupLabel = row.blockLabel
      blockId = row.blockId
      continue
    }

    if (!row.isManaged) {
      if (!row.blockId) {
        groupLabel = null
        blockId = null
      }
      continue
    }

    const label =
      row.managedBlockLabel ||
      (row.extension ? `Автомаршрутизация ${row.extension}` : 'Автогенерация')

    if (label !== groupLabel) {
      groupLabel = label
      blockId = `managed-${label}`
    }

    row.blockId = blockId
    row.blockLabel = label
    row.isManagedBlock = true
  }
}
