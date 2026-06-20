import { ref, computed } from 'vue'
import type { DialplanBlockDefinition } from '@/constants/dialplanBlocks'
import { cloneBlockDefinition } from '@/utils/dialplanBlockConvert'

const STORAGE_KEY = 'ceph-asterisk-custom-dialplan-blocks'

const customBlocks = ref<DialplanBlockDefinition[]>(loadFromStorage())

function loadFromStorage(): DialplanBlockDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DialplanBlockDefinition[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((block) => block?.id && block?.label && Array.isArray(block.rows))
  } catch {
    return []
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customBlocks.value))
}

export function useCustomDialplanBlocks() {
  const blocks = computed(() => customBlocks.value)

  const upsertBlock = (block: DialplanBlockDefinition) => {
    const normalized = { ...cloneBlockDefinition(block), isCustom: true }
    const index = customBlocks.value.findIndex((item) => item.id === normalized.id)
    if (index === -1) {
      customBlocks.value.push(normalized)
    } else {
      customBlocks.value[index] = normalized
    }
    persist()
    return normalized
  }

  const deleteBlock = (blockId: string) => {
    customBlocks.value = customBlocks.value.filter((block) => block.id !== blockId)
    persist()
  }

  const getBlock = (blockId: string) =>
    customBlocks.value.find((block) => block.id === blockId) ?? null

  const reload = () => {
    customBlocks.value = loadFromStorage()
  }

  return {
    blocks,
    upsertBlock,
    deleteBlock,
    getBlock,
    reload,
  }
}
