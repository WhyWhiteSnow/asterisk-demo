<template>
  <div class="args-editor">
    <template v-if="editorKind === 'dial'">
      <CustomSelect
        v-model="dial.channelType"
        :options="channelTypeOptions"
        class="args-field args-field--sm"
        @update:modelValue="emitArgs"
      />
      <CustomSelect
        v-if="dial.channelType === 'PJSIP' && extensionOptions.length > 0"
        v-model="dial.extension"
        :options="extensionOptions"
        placeholder="Номер"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-else-if="dial.channelType === 'PJSIP'"
        v-model="dial.extension"
        :with-icon="false"
        placeholder="Номер"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-else
        v-model="dial.customChannel"
        :with-icon="false"
        placeholder="Канал (PJSIP/101)"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="dial.timeout"
        type="number"
        :with-icon="false"
        placeholder="Сек"
        class="args-field args-field--xs"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="dial.options"
        :with-icon="false"
        placeholder="Опции (tTr)"
        class="args-field args-field--md"
        @update:modelValue="emitArgs"
      />
    </template>

    <template v-else-if="editorKind === 'voicemail'">
      <CustomSelect
        v-if="mailboxOptions.length > 0"
        v-model="voicemail.mailbox"
        :options="mailboxOptions"
        placeholder="Ящик"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-else
        v-model="voicemail.mailbox"
        :with-icon="false"
        placeholder="Ящик"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="voicemail.context"
        :with-icon="false"
        placeholder="Контекст"
        class="args-field args-field--sm"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="voicemail.options"
        :with-icon="false"
        placeholder="Опции"
        class="args-field args-field--md"
        @update:modelValue="emitArgs"
      />
    </template>

    <template v-else-if="editorKind === 'playback'">
      <CustomSelect
        v-if="audioOptions.length > 0"
        v-model="playback.audioName"
        :options="audioOptions"
        placeholder="Аудиофайл"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-else
        v-model="playback.audioName"
        :with-icon="false"
        placeholder="Имя файла"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="playback.options"
        :with-icon="false"
        placeholder="Опции"
        class="args-field args-field--md"
        @update:modelValue="emitArgs"
      />
    </template>

    <template v-else-if="editorKind === 'queue'">
      <CustomSelect
        v-if="queueOptions.length > 0"
        v-model="queue.queueName"
        :options="queueOptions"
        placeholder="Очередь"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-else
        v-model="queue.queueName"
        :with-icon="false"
        placeholder="Имя очереди"
        class="args-field"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="queue.options"
        :with-icon="false"
        placeholder="Опции (t,,,300)"
        class="args-field args-field--md"
        @update:modelValue="emitArgs"
      />
    </template>

    <template v-else-if="editorKind === 'wait'">
      <CustomInput
        v-model="wait.seconds"
        type="number"
        :with-icon="false"
        placeholder="Секунды"
        class="args-field args-field--xs"
        @update:modelValue="emitArgs"
      />
    </template>

    <template v-else-if="editorKind === 'waitexten'">
      <CustomInput
        v-model="waitExten.timeout"
        type="number"
        :with-icon="false"
        placeholder="Таймаут, сек"
        class="args-field args-field--xs"
        @update:modelValue="emitArgs"
      />
      <CustomInput
        v-model="waitExten.options"
        :with-icon="false"
        placeholder="Опции"
        class="args-field args-field--md"
        @update:modelValue="emitArgs"
      />
    </template>

    <CustomInput
      v-else
      :model-value="modelValue"
      :with-icon="false"
      :placeholder="fallbackPlaceholder"
      class="args-field args-field--full"
      @update:modelValue="emitRawArgs"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import CustomInput from '@/components/UI/CustomInput.vue'
import CustomSelect from '@/components/UI/CustomSelect.vue'
import type { AudioFileSchema } from '@/types/audio'
import type { VoicemailBox } from '@/types/voicemail'
import type { QueueResponse } from '@/types/queues'
import {
  audioFileStem,
  buildDialArgs,
  buildPlaybackArgs,
  buildQueueArgs,
  buildVoiceMailArgs,
  buildWaitArgs,
  buildWaitExtenArgs,
  normalizeDialplanApp,
  parseDialArgs,
  parsePlaybackArgs,
  parseQueueArgs,
  parseVoiceMailArgs,
  parseWaitArgs,
  parseWaitExtenArgs,
} from '@/utils/dialplanArgs'

export interface DialplanEditorResources {
  extensions: string[]
  mailboxes: VoicemailBox[]
  audioFiles: AudioFileSchema[]
  queues: QueueResponse[]
}

const props = withDefaults(
  defineProps<{
    app: string
    modelValue: string
    resources?: DialplanEditorResources
    fallbackPlaceholder?: string
  }>(),
  {
    resources: () => ({
      extensions: [],
      mailboxes: [],
      audioFiles: [],
      queues: [],
    }),
    fallbackPlaceholder: 'Аргументы',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const channelTypeOptions = [
  { value: 'PJSIP', label: 'PJSIP' },
  { value: 'custom', label: 'Свой канал' },
]

const normalizedApp = computed(() => normalizeDialplanApp(props.app))

const editorKind = computed(() => {
  switch (normalizedApp.value) {
    case 'Dial':
      return 'dial'
    case 'VoiceMail':
    case 'VoiceMailMain':
      return 'voicemail'
    case 'Playback':
    case 'Background':
      return 'playback'
    case 'Queue':
      return 'queue'
    case 'Wait':
      return 'wait'
    case 'WaitExten':
      return 'waitexten'
    default:
      return 'raw'
  }
})

const extensionOptions = computed(() =>
  props.resources.extensions.map((ext) => ({ value: ext, label: ext }))
)

const mailboxOptions = computed(() =>
  props.resources.mailboxes.map((box) => ({
    value: box.mailbox,
    label: `${box.mailbox} — ${box.full_name || box.mailbox}`,
  }))
)

const audioOptions = computed(() =>
  props.resources.audioFiles.map((file) => ({
    value: audioFileStem(file.name),
    label: file.name,
  }))
)

const queueOptions = computed(() =>
  props.resources.queues.map((q) => ({ value: q.name, label: q.name }))
)

const dial = reactive(parseDialArgs(''))
const voicemail = reactive(parseVoiceMailArgs(''))
const playback = reactive(parsePlaybackArgs(''))
const queue = reactive(parseQueueArgs(''))
const wait = reactive(parseWaitArgs(''))
const waitExten = reactive(parseWaitExtenArgs(''))

const syncFromModel = () => {
  switch (editorKind.value) {
    case 'dial':
      Object.assign(dial, parseDialArgs(props.modelValue))
      break
    case 'voicemail':
      Object.assign(voicemail, parseVoiceMailArgs(props.modelValue))
      break
    case 'playback':
      Object.assign(playback, parsePlaybackArgs(props.modelValue))
      break
    case 'queue':
      Object.assign(queue, parseQueueArgs(props.modelValue))
      break
    case 'wait':
      Object.assign(wait, parseWaitArgs(props.modelValue))
      break
    case 'waitexten':
      Object.assign(waitExten, parseWaitExtenArgs(props.modelValue))
      break
  }
}

watch(
  () => [props.modelValue, props.app] as const,
  () => syncFromModel(),
  { immediate: true }
)

const emitArgs = () => {
  let value = props.modelValue
  switch (editorKind.value) {
    case 'dial':
      value = buildDialArgs(dial)
      break
    case 'voicemail':
      value = buildVoiceMailArgs(voicemail)
      break
    case 'playback':
      value = buildPlaybackArgs(playback)
      break
    case 'queue':
      value = buildQueueArgs(queue)
      break
    case 'wait':
      value = buildWaitArgs(wait)
      break
    case 'waitexten':
      value = buildWaitExtenArgs(waitExten)
      break
  }
  emit('update:modelValue', value)
}

const emitRawArgs = (value: string | number | null | undefined) => {
  emit('update:modelValue', value == null ? '' : String(value))
}
</script>

<style scoped>
.args-editor {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  align-items: center;
  width: 100%;
}
.args-field {
  min-width: 0;
  flex: 1 1 120px;
}
.args-field--xs {
  flex: 0 1 72px;
}
.args-field--sm {
  flex: 0 1 100px;
}
.args-field--md {
  flex: 1 1 140px;
}
.args-field--full {
  flex: 1 1 100%;
}
</style>
