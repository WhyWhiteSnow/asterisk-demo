export interface AudioFileSchema {
  id: number
  name: string
  format: string
  size_kb: number
  duration_sec: number
  create_date: string // YYYY-MM-DD
}

export interface AudioFileDisplay {
  id: number
  name: string
  format: string
  size: string      // форматированный размер
  duration: string  // форматированная длительность
  uploadDate: string // форматированная дата
}