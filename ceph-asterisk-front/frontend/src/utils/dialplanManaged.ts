export interface RowMeta {
  isManaged: boolean
  persistedSuffix: string | null
  blockLabel: string | null
  blockTemplateId: string | null
}

/** @deprecated use extractRowMeta */
export interface ManagedMeta {
  isManaged: boolean
  managedSuffix: string | null
  blockLabel: string | null
}

export function extractRowMeta(varVal: string): RowMeta {
  const semiIdx = varVal.indexOf(';')
  if (semiIdx === -1) {
    return {
      isManaged: false,
      persistedSuffix: null,
      blockLabel: null,
      blockTemplateId: null,
    }
  }

  const suffix = varVal.slice(semiIdx + 1)
  const isManaged = suffix.includes('@managed:')
  const blockMatch = suffix.match(/(?:^|;)block=([^;]+)/)
  const manualBlockMatch = suffix.match(/@block=([^;]+)/)
  const tplMatch = suffix.match(/(?:^|;)block_tpl=([^;]+)/)

  if (isManaged) {
    return {
      isManaged: true,
      persistedSuffix: suffix,
      blockLabel: blockMatch?.[1]?.trim() || null,
      blockTemplateId: tplMatch?.[1]?.trim() || null,
    }
  }

  if (manualBlockMatch) {
    return {
      isManaged: false,
      persistedSuffix: suffix,
      blockLabel: manualBlockMatch[1]?.trim() || null,
      blockTemplateId: tplMatch?.[1]?.trim() || null,
    }
  }

  return {
    isManaged: false,
    persistedSuffix: null,
    blockLabel: null,
    blockTemplateId: null,
  }
}

export function extractManagedMeta(varVal: string): ManagedMeta {
  const meta = extractRowMeta(varVal)
  return {
    isManaged: meta.isManaged,
    managedSuffix: meta.isManaged ? meta.persistedSuffix : null,
    blockLabel: meta.blockLabel,
  }
}

export function buildManualBlockSuffix(
  blockLabel: string,
  blockTemplateId?: string | null
): string {
  let suffix = `@block=${blockLabel.trim()}`
  if (blockTemplateId?.trim()) {
    suffix += `;block_tpl=${blockTemplateId.trim()}`
  }
  return suffix
}

export function appendRowSuffix(varVal: string, suffix: string | null): string {
  if (!suffix) return varVal
  const semiIdx = varVal.indexOf(';')
  const base = semiIdx === -1 ? varVal : varVal.slice(0, semiIdx)
  return `${base};${suffix}`
}

/** @deprecated use appendRowSuffix */
export function appendManagedSuffix(varVal: string, managedSuffix: string | null): string {
  return appendRowSuffix(varVal, managedSuffix)
}

export interface BlockGroupableRow {
  extension: string
  isManaged: boolean
  managedBlockLabel: string | null
  blockId: string | null
  blockLabel: string | null
  isManagedBlock: boolean
}

export function displayBlockLabel(label: string): string {
  const map: Record<string, string> = {
    pattern_XXX: 'Общий шаблон внутренних номеров (_XXX)',
    incoming_routes: 'Входящие маршруты',
    feature_codes: 'Короткие коды',
  }
  if (map[label]) return map[label]
  const routeMatch = label.match(/^route_(\d+)(?:_cfna_cfb)?$/)
  if (routeMatch) return `Маршрутизация номера ${routeMatch[1]}`
  const cfuMatch = label.match(/^cfu_(\d+)$/)
  if (cfuMatch) return `Переадресация всегда (${cfuMatch[1]})`
  const cfnaMatch = label.match(/^cfna_(\d+)$/)
  if (cfnaMatch) return `Переадресация при неответе (${cfnaMatch[1]})`
  const cfbMatch = label.match(/^cfb_(\d+)$/)
  if (cfbMatch) return `Переадресация при занятости (${cfbMatch[1]})`
  return label
}

  let groupLabel: string | null = null
  let blockId: string | null = null

  for (const row of rows) {
    if (row.isManaged) {
      const label = displayBlockLabel(
        row.managedBlockLabel ||
          (row.extension ? `Автомаршрутизация ${row.extension}` : 'Автогенерация')
      )

      if (label !== groupLabel) {
        groupLabel = label
        blockId = `managed-${label}`
      }

      row.blockId = blockId
      row.blockLabel = label
      row.isManagedBlock = true
      continue
    }

    const manualLabel = row.managedBlockLabel
      ? displayBlockLabel(row.managedBlockLabel)
      : null
    if (manualLabel) {
      if (manualLabel !== groupLabel) {
        groupLabel = manualLabel
        blockId = `manual-${manualLabel}`
      }
      row.blockId = blockId
      row.blockLabel = manualLabel
      row.isManagedBlock = false
      continue
    }

    if (row.blockId && row.blockLabel) {
      if (row.blockLabel !== groupLabel) {
        groupLabel = row.blockLabel
        blockId = row.blockId
      }
      continue
    }

    groupLabel = null
    blockId = null
  }
}
