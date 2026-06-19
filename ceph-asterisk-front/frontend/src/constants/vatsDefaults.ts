/** Размер автоматически выделяемого RTP-блока (включительно). */
export const RTP_BLOCK_SIZE = 100

/** С какого порта начинать поиск свободного RTP-блока. */
export const RTP_SEARCH_START = 10000

export const RTP_MAX_PORT = 65535

/** Fallback, если свободный блок не найден. */
export const DEFAULT_RTP_PORT_START = RTP_SEARCH_START
export const DEFAULT_RTP_PORT_END = RTP_SEARCH_START + RTP_BLOCK_SIZE - 1
