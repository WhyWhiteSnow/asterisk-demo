import { defineStore } from 'pinia'
import type { SIPUserFromAPI } from '@/types/vats'

interface CacheEntry {
  users: SIPUserFromAPI[]
  timestamp: number
}

export const useVatsCacheStore = defineStore('vatsCache', {
  state: () => ({
    usersCache: {} as Record<number, CacheEntry>,
    ttl: 60000,
  }),
  actions: {
    getUsers(instanceId: number): SIPUserFromAPI[] | null {
      const entry = this.usersCache[instanceId]
      if (entry && Date.now() - entry.timestamp < this.ttl) return entry.users
      return null
    },
    setUsers(instanceId: number, users: SIPUserFromAPI[]) {
      this.usersCache[instanceId] = { users, timestamp: Date.now() }
    },
    invalidate(instanceId: number) {
      delete this.usersCache[instanceId]
    },
  },
})