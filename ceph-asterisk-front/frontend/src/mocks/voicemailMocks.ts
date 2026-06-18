import type {
  VoicemailBox,
  VoicemailCreate,
  VoicemailUpdate,
  VoicemailRecording,
  VoicemailUserBindingRequest,
} from '@/types/voicemail'

const boxesByInstance: Record<number, VoicemailBox[]> = {}
const recordingsByMailbox: Record<string, VoicemailRecording[]> = {}
const userBindings: Record<string, string> = {}

function mailboxKey(instanceId: number, mailbox: string, context: string) {
  return `${instanceId}:${context}:${mailbox}`
}

export function getMockVoicemailBoxes(instanceId: number): VoicemailBox[] {
  return (boxesByInstance[instanceId] ?? []).map((b) => ({ ...b }))
}

export function createMockVoicemailBox(instanceId: number, data: VoicemailCreate): VoicemailBox {
  if (!boxesByInstance[instanceId]) boxesByInstance[instanceId] = []
  const exists = boxesByInstance[instanceId]!.some(
    (b) => b.mailbox === data.mailbox && b.context === (data.context ?? 'default')
  )
  if (exists) throw new Error('Voicemail box already exists')

  const box: VoicemailBox = {
    mailbox: data.mailbox,
    context: data.context ?? 'default',
    password: data.password,
    full_name: data.full_name,
    email: data.email ?? null,
  }
  boxesByInstance[instanceId]!.push(box)
  recordingsByMailbox[mailboxKey(instanceId, box.mailbox, box.context)] = []
  return { ...box }
}

export function updateMockVoicemailBox(
  instanceId: number,
  mailbox: string,
  context: string,
  data: VoicemailUpdate
): VoicemailBox {
  const boxes = boxesByInstance[instanceId]
  if (!boxes) throw new Error('Voicemail box not found')
  const index = boxes.findIndex((b) => b.mailbox === mailbox && b.context === context)
  if (index === -1) throw new Error('Voicemail box not found')

  const updated = {
    ...boxes[index]!,
    full_name: data.full_name ?? boxes[index]!.full_name,
    email: data.email ?? boxes[index]!.email,
  }
  boxes[index] = updated
  return { ...updated }
}

export function deleteMockVoicemailBox(instanceId: number, mailbox: string, context: string): boolean {
  const boxes = boxesByInstance[instanceId]
  if (!boxes) return false
  const before = boxes.length
  boxesByInstance[instanceId] = boxes.filter((b) => !(b.mailbox === mailbox && b.context === context))
  delete recordingsByMailbox[mailboxKey(instanceId, mailbox, context)]
  return boxesByInstance[instanceId]!.length < before
}

export function getMockVoicemailRecordings(
  instanceId: number,
  mailbox: string,
  context = 'default'
): VoicemailRecording[] {
  return [...(recordingsByMailbox[mailboxKey(instanceId, mailbox, context)] ?? [])]
}

export function bindMockVoicemailUser(instanceId: number, data: VoicemailUserBindingRequest) {
  userBindings[`${instanceId}:${data.user_id}`] = data.mailbox
  return { status: 'ok', mailbox: data.mailbox, user_id: data.user_id }
}

export function getMockVoicemailBoxByUser(instanceId: number, userId: string): VoicemailBox | null {
  const mailbox = userBindings[`${instanceId}:${userId}`]
  if (!mailbox) return null
  return boxesByInstance[instanceId]?.find((b) => b.mailbox === mailbox) ?? null
}
