import { defineStore } from 'pinia'
import { vatsApi } from '@/api/vatsApi'
import type { VatsInstanceFromAPI } from '@/types/vats'

function instancesSignature(list: VatsInstanceFromAPI[]): string {
  return list
    .map((i) => `${i.id}:${i.name}:${i.status}`)
    .sort()
    .join('|')
}

export const useInstancesStore = defineStore('instances', {
  state: () => ({
    instances: [] as VatsInstanceFromAPI[],
    isLoading: false,
    revision: 0,
  }),
  actions: {
    async fetchInstances(): Promise<VatsInstanceFromAPI[]> {
      if (this.isLoading) return this.instances
      this.isLoading = true
      try {
        const list = await vatsApi.getVatsList()
        const prevSignature = instancesSignature(this.instances)
        this.instances = list
        if (prevSignature !== instancesSignature(list)) {
          this.revision += 1
        }
        return list
      } finally {
        this.isLoading = false
      }
    },
    async refreshInstances(): Promise<VatsInstanceFromAPI[]> {
      this.isLoading = true
      try {
        this.instances = await vatsApi.getVatsList()
        this.revision += 1
        return this.instances
      } finally {
        this.isLoading = false
      }
    },
  },
})
