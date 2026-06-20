export interface AudioFileSchema {
  id: number | string
  name: string
  format: string
  size_kb: number
  duration_sec: number
  create_date: string // YYYY-MM-DD
  source?: 'library' | 'voicemail' | 'builtin'
}

export interface AudioFileDisplay {
  id: number | string
  name: string
  format: string
  size: string      // форматированный размер
  duration: string  // форматированная длительность
  uploadDate: string // форматированная дата
}