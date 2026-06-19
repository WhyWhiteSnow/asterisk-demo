import type { VatsInstanceFromAPI, VatsTableItem } from '@/types/vats'
import { formatVatsCreateDate } from '@/utils/formatVatsDate'
import { mapApiStatusToUi } from '@/utils/vatsStatus'

export const mapInstanceToTableItem = (instance: VatsInstanceFromAPI): VatsTableItem => ({
  id: instance.id.toString(),
  name: instance.name,
  status: mapApiStatusToUi(instance.status),
  apiStatus: instance.status,
  server: `asterisk-${instance.name}`,
  port: instance.sip_port,
  date: formatVatsCreateDate(instance.created_at ?? instance.create_date),
  transportType: (instance.transport_type || 'udp').toLowerCase(),
  internalNumbers: [],
})

export const mapInstancesToTableItems = (instances: VatsInstanceFromAPI[]): VatsTableItem[] =>
  instances.map(mapInstanceToTableItem)
