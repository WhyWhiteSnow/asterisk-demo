import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { vatsApi } from '@/api/vatsApi'
import { useActiveInstanceStore } from '@/stores/activeInstance'
import type { VatsInstanceFromAPI } from '@/types/vats'

export function useActiveInstanceSelection() {
  const route = useRoute()
  const activeStore = useActiveInstanceStore()

  const instances = ref<VatsInstanceFromAPI[]>([])
  const selectedInstanceId = ref<number | null>(null)
  const loadError = ref('')

  const instanceOptions = computed(() =>
    instances.value.map(i => ({ value: i.id, label: i.name }))
  )

  const applySelection = (id: number) => {
    const inst = instances.value.find(i => i.id === id)
    if (!inst) return false
    selectedInstanceId.value = id
    activeStore.setInstance(id, inst.name)
    return true
  }

  const resolveInitialSelection = () => {
    const queryRaw = route.query.instanceId
    if (queryRaw) {
      const id = Number(Array.isArray(queryRaw) ? queryRaw[0] : queryRaw)
      if (!isNaN(id) && applySelection(id)) return
    }

    if (activeStore.instanceId != null && applySelection(activeStore.instanceId)) {
      return
    }

    if (instances.value.length === 1) {
      applySelection(instances.value[0]!.id)
    }
  }

  const loadInstances = async () => {
    loadError.value = ''
    try {
      instances.value = await vatsApi.getVatsList()
      resolveInitialSelection()
    } catch (err: unknown) {
      let msg = 'Ошибка загрузки ВАТС'
      if (axios.isAxiosError(err)) {
        msg = String(err.response?.data?.detail ?? err.message)
      } else if (err instanceof Error) {
        msg = err.message
      }
      loadError.value = msg
    }
  }

  watch(selectedInstanceId, (id) => {
    if (id == null) return
    const inst = instances.value.find(i => i.id === id)
    if (inst) activeStore.setInstance(id, inst.name)
  })

  return {
    instances,
    selectedInstanceId,
    instanceOptions,
    loadInstances,
    loadError,
    applySelection,
  }
}
