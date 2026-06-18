<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content audio-player-modal" @click.stop>
      <div class="modal-header">
        <h3>Прослушивание: {{ fileName }}</h3>
        <button class="modal-close" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <audio controls autoplay :src="audioUrl" class="audio-player" />
      </div>
      <div class="modal-footer">
        <CustomButton @click="closeModal">Закрыть</CustomButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRef } from 'vue'
import CustomButton from '../UI/CustomButton.vue'
import { audioApi } from '@/api/audioApi'
import { useModalEscape } from '@/composables/useModalEscape'

interface Props {
  show: boolean
  fileId: number | null
  fileName: string
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioUrl = ref<string | undefined>(undefined)

watch(() => props.show, async (newVal) => {
  if (newVal && props.fileId) {
    // Освобождаем старый URL, если есть
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
    }
    audioUrl.value = await audioApi.getFileBlob(props.fileId)
  }
})

const closeModal = () => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = undefined
  }
  emit('close')
}
useModalEscape(toRef(props, 'show'), closeModal)
</script>

<style scoped>
/* Стили как в других модальных окнах */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal);
}
.modal-content.audio-player-modal {
  max-width: 500px;
  width: 90%;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
}
.audio-player {
  width: 100%;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
}
.modal-footer {
  margin-top: var(--spacing-lg);
  text-align: right;
}
</style>