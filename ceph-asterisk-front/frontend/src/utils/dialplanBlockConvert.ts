import type {
  DialplanBlockDefinition,
  DialplanBlockRowTemplate,
} from '@/constants/dialplanBlocks'

export interface BlockRowSource {
  type: 'exten' | 'include' | 'switch'
  extension: string
  priority: string
  app: string
  args: string
  includeContext?: string
  switchPattern?: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function substituteExtension(value: string, extension: string): string {
  if (!extension) return value
  return value.replace(new RegExp(escapeRegExp(extension), 'g'), '{ext}')
}

export function rowsToBlockTemplates(
  rows: BlockRowSource[],
  options: {
    useExtensionPlaceholder?: boolean
    placeholderExtension?: string
  } = {}
): { rows: DialplanBlockRowTemplate[]; needsExtension: boolean; defaultExtension?: string } {
  const extenRows = rows.filter((row) => row.type === 'exten')
  if (extenRows.length === 0) {
    return { rows: [], needsExtension: false }
  }

  const extensions = [...new Set(extenRows.map((row) => row.extension).filter(Boolean))]
  const primaryExt =
    options.placeholderExtension?.trim() ||
    (extensions.length === 1 ? extensions[0] : '') ||
    ''

  const usePlaceholder =
    options.useExtensionPlaceholder ??
    (extensions.length === 1 && !!primaryExt && !primaryExt.includes('$'))

  const templates: DialplanBlockRowTemplate[] = extenRows.map((row) => {
    if (!usePlaceholder || !primaryExt) {
      return {
        extension: row.extension,
        priority: row.priority,
        app: row.app,
        args: row.args,
      }
    }
    return {
      extension: substituteExtension(row.extension, primaryExt),
      priority: substituteExtension(row.priority, primaryExt),
      app: row.app,
      args: substituteExtension(row.args, primaryExt),
    }
  })

  const hasPlaceholder = templates.some(
    (row) =>
      row.extension.includes('{ext}') ||
      row.priority.includes('{ext}') ||
      row.args.includes('{ext}')
  )

  return {
    rows: templates,
    needsExtension: hasPlaceholder,
    defaultExtension: hasPlaceholder ? primaryExt || '101' : undefined,
  }
}

export function createCustomBlockDefinition(
  meta: {
    id?: string
    label: string
    description: string
    needsExtension?: boolean
    defaultExtension?: string
  },
  rows: BlockRowSource[],
  options?: { useExtensionPlaceholder?: boolean; placeholderExtension?: string }
): DialplanBlockDefinition | null {
  const converted = rowsToBlockTemplates(rows, options)
  if (converted.rows.length === 0) return null

  const id =
    meta.id ||
    `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    label: meta.label.trim(),
    description: meta.description.trim(),
    isCustom: true,
    needsExtension: meta.needsExtension ?? converted.needsExtension,
    defaultExtension: meta.defaultExtension ?? converted.defaultExtension,
    rows: converted.rows,
  }
}

export function cloneBlockDefinition(
  block: DialplanBlockDefinition
): DialplanBlockDefinition {
  return {
    ...block,
    rows: block.rows.map((row) => ({ ...row })),
  }
}
