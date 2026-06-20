export interface DialArgsParsed {
  channelType: 'PJSIP' | 'custom'
  extension: string
  customChannel: string
  timeout: string
  options: string
}

export interface VoiceMailArgsParsed {
  mailbox: string
  context: string
  options: string
}

export interface PlaybackArgsParsed {
  audioName: string
  options: string
}

export interface QueueArgsParsed {
  queueName: string
  options: string
}

export interface WaitArgsParsed {
  seconds: string
}

export interface WaitExtenArgsParsed {
  timeout: string
  options: string
}

export function normalizeDialplanApp(app: string): string {
  if (app.toLowerCase() === 'voicemail') return 'VoiceMail'
  return app
}

export function parseDialArgs(args: string): DialArgsParsed {
  const parts = args.split(',')
  const channel = parts[0]?.trim() ?? ''
  const pjsipMatch = channel.match(/^PJSIP\/(.+)$/i)
  if (pjsipMatch) {
    return {
      channelType: 'PJSIP',
      extension: pjsipMatch[1] ?? '',
      customChannel: '',
      timeout: parts[1]?.trim() || '30',
      options: parts.slice(2).join(',').trim(),
    }
  }
  return {
    channelType: 'custom',
    extension: '',
    customChannel: channel,
    timeout: parts[1]?.trim() || '30',
    options: parts.slice(2).join(',').trim(),
  }
}

export function buildDialArgs(parsed: DialArgsParsed): string {
  const channel =
    parsed.channelType === 'PJSIP'
      ? `PJSIP/${parsed.extension}`
      : parsed.customChannel.trim()
  if (!channel) return ''
  const parts = [channel, parsed.timeout.trim() || '30']
  if (parsed.options.trim()) parts.push(parsed.options.trim())
  return parts.join(',')
}

export function stripDialplanArgSuffix(value: string): string {
  const semiIdx = value.indexOf(';')
  return (semiIdx === -1 ? value : value.slice(0, semiIdx)).trim()
}

export function parseVoiceMailArgs(args: string): VoiceMailArgsParsed {
  const cleaned = stripDialplanArgSuffix(args)
  const commaIdx = cleaned.indexOf(',')
  const head = commaIdx === -1 ? cleaned : cleaned.slice(0, commaIdx)
  const options = commaIdx === -1 ? '' : cleaned.slice(commaIdx + 1).trim()
  const atIdx = head.indexOf('@')
  if (atIdx === -1) {
    return { mailbox: head.trim(), context: 'default', options }
  }
  return {
    mailbox: head.slice(0, atIdx).trim(),
    context: head.slice(atIdx + 1).trim() || 'default',
    options,
  }
}

export function buildVoiceMailArgs(parsed: VoiceMailArgsParsed): string {
  if (!parsed.mailbox.trim()) return ''
  const head = `${parsed.mailbox.trim()}@${parsed.context.trim() || 'default'}`
  return parsed.options.trim() ? `${head},${parsed.options.trim()}` : head
}

export function parsePlaybackArgs(args: string): PlaybackArgsParsed {
  const commaIdx = args.indexOf(',')
  if (commaIdx === -1) {
    return { audioName: args.trim(), options: '' }
  }
  return {
    audioName: args.slice(0, commaIdx).trim(),
    options: args.slice(commaIdx + 1).trim(),
  }
}

export function buildPlaybackArgs(parsed: PlaybackArgsParsed): string {
  if (!parsed.audioName.trim()) return ''
  return parsed.options.trim()
    ? `${parsed.audioName.trim()},${parsed.options.trim()}`
    : parsed.audioName.trim()
}

export function parseQueueArgs(args: string): QueueArgsParsed {
  const commaIdx = args.indexOf(',')
  if (commaIdx === -1) {
    return { queueName: args.trim(), options: '' }
  }
  return {
    queueName: args.slice(0, commaIdx).trim(),
    options: args.slice(commaIdx + 1).trim(),
  }
}

export function buildQueueArgs(parsed: QueueArgsParsed): string {
  if (!parsed.queueName.trim()) return ''
  return parsed.options.trim()
    ? `${parsed.queueName.trim()},${parsed.options.trim()}`
    : parsed.queueName.trim()
}

export function parseWaitArgs(args: string): WaitArgsParsed {
  return { seconds: args.trim() || '1' }
}

export function buildWaitArgs(parsed: WaitArgsParsed): string {
  return parsed.seconds.trim() || '1'
}

export function parseWaitExtenArgs(args: string): WaitExtenArgsParsed {
  const commaIdx = args.indexOf(',')
  if (commaIdx === -1) {
    return { timeout: args.trim() || '5', options: '' }
  }
  return {
    timeout: args.slice(0, commaIdx).trim() || '5',
    options: args.slice(commaIdx + 1).trim(),
  }
}

export function buildWaitExtenArgs(parsed: WaitExtenArgsParsed): string {
  const timeout = parsed.timeout.trim() || '5'
  return parsed.options.trim() ? `${timeout},${parsed.options.trim()}` : timeout
}

export function audioFileStem(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

const NEXT_PRIORITY_RE = /^n(?:\([a-zA-Z0-9_]+\))?$/

export function isNumericDialplanPriority(priority: string): boolean {
  const value = priority.trim()
  if (!value) return false
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1
}

export function isNextDialplanPriority(priority: string): boolean {
  return NEXT_PRIORITY_RE.test(priority.trim())
}

export function isValidDialplanPriority(priority: string): boolean {
  const value = priority.trim()
  if (!value) return false
  return isNumericDialplanPriority(value) || isNextDialplanPriority(value)
}

export function shouldRenumberDialplanPriority(priority: string): boolean {
  return isNumericDialplanPriority(priority)
}
