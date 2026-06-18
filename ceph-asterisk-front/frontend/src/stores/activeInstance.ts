import { defineStore } from 'pinia'

const STORAGE_KEY = 'active_instance'

interface StoredActiveInstance {
  id: number
  name: string
}

function readStored(): StoredActiveInstance | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredActiveInstance
    if (typeof parsed.id === 'number' && typeof parsed.name === 'string') {
      return parsed
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

const stored = readStored()

export const useActiveInstanceStore = defineStore('activeInstance', {
  state: () => ({
    instanceId: stored?.id ?? null as number | null,
    instanceName: stored?.name ?? null as string | null,
  }),
  getters: {
    hasSelection: (state): boolean => state.instanceId != null,
  },
  actions: {
    setInstance(id: number, name: string) {
      this.instanceId = id
      this.instanceName = name
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }))
    },
    clear() {
      this.instanceId = null
      this.instanceName = null
      localStorage.removeItem(STORAGE_KEY)
    },
    syncName(name: string) {
      if (this.instanceId == null) return
      this.instanceName = name
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: this.instanceId, name })
      )
    },
  },
})
