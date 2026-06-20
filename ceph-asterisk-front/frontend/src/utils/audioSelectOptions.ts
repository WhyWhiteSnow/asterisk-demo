import type { AudioFileSchema } from '@/types/audio'
import { audioFileStem } from '@/utils/dialplanArgs'

export interface AudioSelectOption {
  value: string
  label: string
}

export function buildAudioSelectOptions(files: AudioFileSchema[]): AudioSelectOption[] {
  return files.map((file) => {
    if (file.source === 'builtin') {
      return {
        value: file.name,
        label: `${file.name} (стандарт Asterisk)`,
      }
    }
    const stem = audioFileStem(file.name)
    return {
      value: stem,
      label: file.name,
    }
  })
}

export function buildMohClassOptions(files: AudioFileSchema[]): AudioSelectOption[] {
  const libraryOptions = buildAudioSelectOptions(
    files.filter((file) => file.source === 'library' || file.source === 'builtin')
  )
  return [
    { value: '', label: 'По умолчанию (default)' },
    ...libraryOptions,
  ]
}
