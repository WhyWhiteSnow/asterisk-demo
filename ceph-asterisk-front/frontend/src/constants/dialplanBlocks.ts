export interface DialplanBlockRowTemplate {
  extension: string
  priority: string
  app: string
  args: string
}

export interface DialplanBlockDefinition {
  id: string
  label: string
  description: string
  /** Пользовательский блок (хранится в браузере) */
  isCustom?: boolean
  /** Если true — перед вставкой спросить номер extension */
  needsExtension: boolean
  defaultExtension?: string
  rows: DialplanBlockRowTemplate[]
}

export const DIALPLAN_BLOCKS: DialplanBlockDefinition[] = [
  {
    id: 'internal_dial_vm',
    label: 'Звонок на номер + ГП',
    description: 'Dial внутренний номер, при неответе — голосовая почта',
    needsExtension: true,
    defaultExtension: '101',
    rows: [
      { extension: '{ext}', priority: '1', app: 'NoOp', args: 'Звонок на {ext}' },
      { extension: '{ext}', priority: 'n', app: 'Dial', args: 'PJSIP/{ext},30' },
      {
        extension: '{ext}',
        priority: 'n',
        app: 'GotoIf',
        args: '$["${DIALSTATUS}"="ANSWER"]?{ext}_done',
      },
      { extension: '{ext}', priority: 'n', app: 'VoiceMail', args: '{ext}@default' },
      { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
      { extension: '{ext}', priority: 'n({ext}_done)', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'cfna_forward',
    label: 'Переадресация при неответе',
    description: 'Дозвон на номер, затем переадресация на другой',
    needsExtension: true,
    defaultExtension: '101',
    rows: [
      { extension: '{ext}', priority: '1', app: 'NoOp', args: 'CFNA {ext}' },
      { extension: '{ext}', priority: 'n', app: 'Dial', args: 'PJSIP/{ext},15' },
      {
        extension: '{ext}',
        priority: 'n',
        app: 'GotoIf',
        args: '$["${DIALSTATUS}"="ANSWER"]?{ext}_done',
      },
      { extension: '{ext}', priority: 'n', app: 'Dial', args: 'PJSIP/102,30' },
      { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
      { extension: '{ext}', priority: 'n({ext}_done)', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'queue_route',
    label: 'Очередь',
    description: 'Ответ и направление в очередь',
    needsExtension: true,
    defaultExtension: '8000',
    rows: [
      { extension: '{ext}', priority: '1', app: 'NoOp', args: 'Очередь' },
      { extension: '{ext}', priority: 'n', app: 'Answer', args: '' },
      { extension: '{ext}', priority: 'n', app: 'Queue', args: 'support,t,,,300' },
      { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'voicemail_only',
    label: 'Голосовая почта',
    description: 'Сразу на голосовой ящик',
    needsExtension: true,
    defaultExtension: '101',
    rows: [
      { extension: '{ext}', priority: '1', app: 'NoOp', args: 'ГП {ext}' },
      { extension: '{ext}', priority: 'n', app: 'VoiceMail', args: '{ext}@default' },
      { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'incoming_answer_dial',
    label: 'Входящий: ответ + дозвон',
    description: 'Типичный входящий на оператора',
    needsExtension: true,
    defaultExtension: '777',
    rows: [
      { extension: '{ext}', priority: '1', app: 'NoOp', args: 'Входящий ${CALLERID(all)}' },
      { extension: '{ext}', priority: 'n', app: 'Answer', args: '' },
      { extension: '{ext}', priority: 'n', app: 'Dial', args: 'PJSIP/101,30' },
      { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'ivr_menu',
    label: 'Голосовое меню (IVR)',
    description: 'Приветствие и ожидание нажатия цифры',
    needsExtension: true,
    defaultExtension: '8000',
    rows: [
      { extension: '{ext}', priority: '1', app: 'Answer', args: '' },
      { extension: '{ext}', priority: 'n', app: 'Background', args: 'welcome' },
      { extension: '{ext}', priority: 'n', app: 'WaitExten', args: '5' },
      { extension: '{ext}', priority: 'n', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'pattern_internal',
    label: 'Шаблон _XXX (все 3-значные)',
    description: 'Звонки на любой внутренний номер формата XXX',
    needsExtension: false,
    rows: [
      { extension: '_XXX', priority: '1', app: 'NoOp', args: 'Внутренний ${EXTEN}' },
      { extension: '_XXX', priority: 'n', app: 'Dial', args: 'PJSIP/${EXTEN},30' },
      {
        extension: '_XXX',
        priority: 'n',
        app: 'GotoIf',
        args: '$["${DIALSTATUS}"="ANSWER"]?pattern_done',
      },
      { extension: '_XXX', priority: 'n', app: 'VoiceMail', args: '${EXTEN}@default' },
      { extension: '_XXX', priority: 'n', app: 'Hangup', args: '' },
      { extension: '_XXX', priority: 'n(pattern_done)', app: 'Hangup', args: '' },
    ],
  },
  {
    id: 'voicemail_access',
    label: 'Доступ к ГП (*97)',
    description: 'Проверка голосовой почты абонента',
    needsExtension: false,
    rows: [
      { extension: '*97', priority: '1', app: 'NoOp', args: 'ГП ${CALLERID(num)}' },
      { extension: '*97', priority: 'n', app: 'Answer', args: '' },
      { extension: '*97', priority: 'n', app: 'Wait', args: '1' },
      { extension: '*97', priority: 'n', app: 'VoiceMailMain', args: '${CALLERID(num)}@default' },
      { extension: '*97', priority: 'n', app: 'Hangup', args: '' },
    ],
  },
]

function substituteExt(value: string, extension: string): string {
  return value.replace(/\{ext\}/g, extension)
}

export function resolveDialplanBlockRows(
  block: DialplanBlockDefinition,
  extension: string
): DialplanBlockRowTemplate[] {
  return block.rows.map((row) => ({
    extension: substituteExt(row.extension, extension),
    priority: substituteExt(row.priority, extension),
    app: row.app,
    args: substituteExt(row.args, extension),
  }))
}
