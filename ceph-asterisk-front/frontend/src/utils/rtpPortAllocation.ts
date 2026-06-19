import { RTP_BLOCK_SIZE, RTP_MAX_PORT, RTP_SEARCH_START } from '@/constants/vatsDefaults'

export interface RtpPortRange {
  start: number
  end: number
}

export interface RtpRangeSource {
  rtp_port_start: number
  rtp_port_end: number
}

function rangesOverlap(a: RtpPortRange, b: RtpPortRange): boolean {
  return a.start <= b.end && b.start <= a.end
}

/** Уникальные start/end всех занятых RTP-диапазонов (как проверяет backend). */
function collectReservedRtpPorts(instances: RtpRangeSource[]): Set<number> {
  const reserved = new Set<number>()
  for (const instance of instances) {
    reserved.add(instance.rtp_port_start)
    reserved.add(instance.rtp_port_end)
  }
  return reserved
}

/**
 * Подбирает первый свободный непрерывный блок из `blockSize` портов.
 * Учитывает пересечение диапазонов и уникальность start/end в БД.
 */
export function findFreeRtpRange(
  instances: RtpRangeSource[],
  blockSize: number = RTP_BLOCK_SIZE,
  searchStart: number = RTP_SEARCH_START,
  searchEnd: number = RTP_MAX_PORT
): RtpPortRange | null {
  if (blockSize < 2) return null

  const occupied = instances.map((i) => ({
    start: i.rtp_port_start,
    end: i.rtp_port_end,
  }))
  const reservedPorts = collectReservedRtpPorts(instances)
  const span = blockSize - 1

  for (let start = searchStart; start + span <= searchEnd; start++) {
    const candidate: RtpPortRange = { start, end: start + span }

    if (reservedPorts.has(candidate.start) || reservedPorts.has(candidate.end)) {
      continue
    }

    const overlaps = occupied.some((range) => rangesOverlap(candidate, range))
    if (!overlaps) {
      return candidate
    }
  }

  return null
}
