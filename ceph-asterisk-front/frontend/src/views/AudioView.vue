<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import CustomButton from '@/components/UI/CustomButton.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import AudioFilesTable from '@/components/tables/AudioFilesTable.vue'
import { audioApi } from '@/api/audioApi'
import type { AudioFileSchema, AudioFileDisplay } from '@/types/audio'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import AudioPlayerModal from '@/components/modals/AudioPlayerModal.vue'

const toast = useToastStore()
const confirmStore = useConfirmStore()
const audioFiles = ref<AudioFileDisplay[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const showPlayer = ref(false)
const currentFileId = ref<number | null>(null)
const currentFileName = ref('')

// Вспомогательные функции форматирования
const formatFileSize = (sizeKb: number): string => {
  if (sizeKb < 1024) return `${sizeKb} KB`
  const mb = sizeKb / 1024
  return `${mb.toFixed(1)} MB`
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes} мин ${secs}с`
}

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-')
  return `${day}.${month}.${year}`
}

// Преобразование API-данных в формат для таблицы
const mapApiToDisplay = (files: AudioFileSchema[]): AudioFileDisplay[] => {
  return files.map(file => ({
    id: file.id,
    name: file.name,
    format: file.format,
    size: formatFileSize(file.size_kb),
    duration: formatDuration(file.duration_sec),
    uploadDate: formatDate(file.create_date),
  }))
}

// Загрузка списка файлов
const loadAudioFiles = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const files = await audioApi.getFiles()
    audioFiles.value = mapApiToDisplay(files)
  } catch (error: unknown) {
    console.error('Ошибка загрузки аудиофайлов:', error)
    let message = 'Не удалось загрузить аудиофайлы'
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.detail || message
    } else if (error instanceof Error) {
      message = error.message
    }
    errorMessage.value = message
    toast.addToast({ message, type: 'error' })
  } finally {
    isLoading.value = false
  }
}

// Открыть диалог выбора файла
const openFileDialog = () => fileInput.value?.click()

// Обработка выбора файла
const handleUploadFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  const file = files[0]
  if (!file) return

  const allowedMimeTypes = ['audio/wav', 'audio/x-wav', 'audio/mpeg']
  const extension = file.name.split('.').pop()?.toLowerCase()
  const isValid = allowedMimeTypes.includes(file.type) || (extension === 'wav') || (extension === 'mp3')

  if (!isValid) {
    toast.addToast({ message: 'Можно загружать только файлы в формате WAV или MP3', type: 'warning' })
    input.value = ''
    return
  }

  isUploading.value = true
  try {
    await audioApi.uploadFile(file)
    await loadAudioFiles()
    toast.addToast({ message: `Файл "${file.name}" успешно загружен`, type: 'success' })
  } catch (error: unknown) {
    console.error('Ошибка загрузки файла:', error)
    let message = 'Ошибка при загрузке файла'
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) {
        message = 'Файл слишком большой. Максимальный размер загрузки — 50 МБ'
      } else {
        message = error.response?.data?.detail || message
      }
    } else if (error instanceof Error) {
      message = error.message
    }
    toast.addToast({ message, type: 'error' })
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// Удаление файла
const handleDeleteFile = async (file: AudioFileDisplay) => {
  const confirmed = await confirmStore.confirm({
    title: 'Удаление файла',
    message: `Вы уверены, что хотите удалить файл "${file.name}"?`,
    confirmText: 'Удалить',
    variant: 'danger',
  })
  if (!confirmed) return
  if (typeof file.id !== 'number') return
  try {
    await audioApi.deleteFile(file.id)
    await loadAudioFiles()
    toast.addToast({ message: `Файл "${file.name}" удалён`, type: 'success' })
  } catch (error: unknown) {
    console.error('Ошибка удаления:', error)
    let message = 'Ошибка при удалении файла'
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.detail || message
    } else if (error instanceof Error) {
      message = error.message
    }
    toast.addToast({ message, type: 'error' })
  }
}

// Воспроизведение (можно реализовать позже)
const handlePlayFile = (file: AudioFileDisplay) => {
  if (typeof file.id !== 'number') return
  currentFileId.value = file.id
  currentFileName.value = file.name
  showPlayer.value = true
}

onMounted(() => {
  loadAudioFiles()
})
</script>

<template>
  <div class="wrapper">
    <PageHeader title="Библиотека аудиофайлов" subtitle="Все ВАТС">
      <template #actions>
        <CustomButton @click="openFileDialog" :disabled="isUploading">
          {{ isUploading ? 'Загрузка...' : '+ Загрузить файл' }}
        </CustomButton>
        <input
          ref="fileInput"
          type="file"
          accept="audio/*"
          style="display: none"
          @change="handleUploadFile"
        />
      </template>
    </PageHeader>

    <div v-if="errorMessage" class="error-message">
      <div class="error-content">
        <span class="error-icon">⚠</span>
        <span>{{ errorMessage }}</span>
      </div>
      <button @click="errorMessage = ''" class="error-close">×</button>
    </div>

    <main class="content">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner large"></div>
        <p>Загрузка аудиофайлов...</p>
      </div>
      <div v-else-if="audioFiles.length === 0" class="empty-state">
        <p>Нет загруженных аудиофайлов</p>
        <CustomButton @click="openFileDialog">Загрузить первый файл</CustomButton>
      </div>
      <AudioFilesTable
        v-else
        :audio-files="audioFiles"
        @play="handlePlayFile"
        @delete="handleDeleteFile"
      />
    </main>

    <AudioPlayerModal
      :show="showPlayer"
      :file-id="currentFileId"
      :file-name="currentFileName"
      @close="showPlayer = false"
    />
  </div>
</template>

<style scoped>
.wrapper {
  width: 100%;
  padding: 0 var(--spacing-md);
  display: flex;
  flex-direction: column;
}

.content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.error-message {
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  color: var(--vt-c-orange);
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  animation: slideIn 0.3s ease;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-close {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
}

/* Адаптивность */
@media (max-width: 768px) {
  .wrapper {
    padding: 0 var(--spacing-sm);
  }

  .content {
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    margin: 0;
  }
}
</style>