// src/mocks/audioMocks.ts
import type { AudioFileSchema } from '@/types/audio'

// Интерфейс для хранения файла в памяти (для моков)
interface MockAudioFile extends AudioFileSchema {
  blob: Blob  // храним бинарные данные для воспроизведения
}

// Исходные тестовые файлы (статичные, но можно генерировать случайные)
const initialFiles: Omit<MockAudioFile, 'blob'>[] = [
  {
    id: 1,
    name: 'welcome_greeting.wav',
    format: 'WAV',
    size_kb: 239.3,
    duration_sec: 15,
    create_date: '2025-10-20',
  },
  {
    id: 2,
    name: 'hold_music.wav',
    format: 'WAV',
    size_kb: 175.8,
    duration_sec: 120,
    create_date: '2025-10-21',
  },
  {
    id: 3,
    name: 'ivr_menu.wav',
    format: 'WAV',
    size_kb: 312.5,
    duration_sec: 20,
    create_date: '2025-10-22',
  },
]

// Хранилище мок-файлов в памяти (чтобы добавление/удаление работало)
const mockFiles: MockAudioFile[] = initialFiles.map(file => ({
  ...file,
  blob: generateMockWavBlob(file.duration_sec),
}))

// Генерация заглушки WAV-файла (тишина) заданной длительности (секунды)
function generateMockWavBlob(durationSec: number): Blob {
  // Создаём простой WAV заглушку (8 кГц, 16 бит, моно)
  const sampleRate = 8000
  const numSamples = sampleRate * durationSec
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  // RIFF chunk
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(view, 8, 'WAVE')
  // fmt subchunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true)  // PCM
  view.setUint16(22, 1, true)  // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)  // block align
  view.setUint16(34, 16, true) // bits per sample
  // data subchunk
  writeString(view, 36, 'data')
  view.setUint32(40, numSamples * 2, true)

  // Заполняем нулями (тишина)
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, 0, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

// Генерация нового ID (максимальный + 1)
function getNextId(): number {
  return Math.max(...mockFiles.map(f => f.id), 0) + 1
}

// Получить список файлов (без blob для ответа API)
export function getMockAudioFiles(): AudioFileSchema[] {
  return mockFiles.map(({ blob, ...rest }) => rest)
}

// Загрузить новый файл (имитация)
export function addMockAudioFile(file: File): AudioFileSchema {
  const durationSec = 30 // В реальности нужно вычислять, для мока фиксируем
  const sizeKb = file.size / 1024
  const now = new Date()
  const createDate = now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10)

  const newFile: MockAudioFile = {
    id: getNextId(),
    name: file.name,
    format: 'WAV', // принудительно
    size_kb: sizeKb,
    duration_sec: durationSec,
    create_date: createDate,
    blob: generateMockWavBlob(durationSec),
  }
  mockFiles.push(newFile)
  const { blob: _blob, ...fileWithoutBlob } = newFile
  return fileWithoutBlob
}

// Удалить файл по ID
export function deleteMockAudioFile(fileId: number): boolean {
  const index = mockFiles.findIndex(f => f.id === fileId)
  if (index !== -1) {
    mockFiles.splice(index, 1)
    return true
  }
  return false
}

// Получить Blob файла для воспроизведения
export function getMockAudioFileBlob(fileId: number): Blob | null {
  const file = mockFiles.find(f => f.id === fileId)
  return file ? file.blob : null
}