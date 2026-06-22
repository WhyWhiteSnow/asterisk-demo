import { defineStore } from 'pinia'
import { vatsApi } from '@/api/vatsApi'
import type { VatsInstanceFromAPI } from '@/types/vats'

function instancesSignature(list: VatsInstanceFromAPI[]): string {
  return list
    .map((i) => `${i.id}:${i.name}:${i.status}`)
    .sort()
    .join('|')
}

let instancesFetchPromise: Promise<VatsInstanceFromAPI[]> | null = null
let instancesFetchGeneration = 0

export const useInstancesStore = defineStore('instances', {
  state: () => ({
    instances: [] as VatsInstanceFromAPI[],
    isLoading: false,
    revision: 0,
  }),
  actions: {
    async fetchInstances(): Promise<VatsInstanceFromAPI[]> {
      return this.loadInstances({ force: false })
    },
    async refreshInstances(): Promise<VatsInstanceFromAPI[]> {
      return this.loadInstances({ force: true, bumpRevision: true })
    },
    async loadInstances(options: {
      force?: boolean
      bumpRevision?: boolean
    } = {}): Promise<VatsInstanceFromAPI[]> {
      const { force = false, bumpRevision = false } = options

      if (!force && instancesFetchPromise) {
        return instancesFetchPromise
      }

      if (force) {
        instancesFetchPromise = null
        instancesFetchGeneration += 1
      }

      const generation = instancesFetchGeneration
      this.isLoading = true
      const request = (async () => {
        try {
          const list = await vatsApi.getVatsList()
          const prevSignature = instancesSignature(this.instances)
          this.instances = list
          if (bumpRevision || prevSignature !== instancesSignature(list)) {
            this.revision += 1
          }
          return list
        } finally {
          if (generation === instancesFetchGeneration) {
            instancesFetchPromise = null
            this.isLoading = false
          }
        }
      })()

      instancesFetchPromise = request
      return request
    },
  },
})
