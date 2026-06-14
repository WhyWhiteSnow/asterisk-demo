import type { CDRRecord } from '@/types/cdr'

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const phoneNumbers = [
  '6001', '6002', '6003', '6004', '6005',
  '74951234567', '74957654321', '74959876543', '74951112233', '74954445566'
]

const dispositions = ['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED']
const instances = ['main-office', 'branch-office', 'test-instance']

const generateCDRRecord = (id: number, baseDate: Date): CDRRecord => {
  // Генерируем случайную дату ответа в пределах дня (от baseDate)
  const answerDate = new Date(baseDate)
  answerDate.setSeconds(answerDate.getSeconds() + random(0, 86400))
  
  const duration = random(0, 3600)
  const endDate = new Date(answerDate.getTime() + duration * 1000)

  const src = phoneNumbers[random(0, phoneNumbers.length - 1)] as string
  let dst = phoneNumbers[random(0, phoneNumbers.length - 1)] as string
  while (dst === src) dst = phoneNumbers[random(0, phoneNumbers.length - 1)] as string

  const billsec = random(0, duration)
  const disposition = dispositions[random(0, dispositions.length - 1)] as string

  return {
    id,
    answer: answerDate.toISOString(),
    end: endDate.toISOString(),
    clid: `"Caller" <${src}>`,
    src,
    dst,
    duration,
    billsec,
    disposition,
    uniqueid: `${Date.now()}-${id}`,
    userfield: '',
    instance_name: instances[random(0, instances.length - 1)] as string,
    accountcode: random(0, 100).toString(),
    dcontext: 'from-internal',
    channel: `PJSIP/${src}-${random(1000,9999)}`,
    dstchannel: `PJSIP/${dst}-${random(1000,9999)}`,
    lastapp: 'Dial',
    lastdata: `PJSIP/${dst}`,
    amaflags: 0,
  }
}

export const generateMockCDR = (count: number = 150): CDRRecord[] => {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(now.getDate() - 30)

  const records = Array.from({ length: count }, (_, index) => {
    const randomOffset = random(0, (now.getTime() - startDate.getTime()) / 1000)
    const recordDate = new Date(startDate)
    recordDate.setSeconds(recordDate.getSeconds() + randomOffset)
    return generateCDRRecord(index + 1, recordDate)
  })

  // Сортируем по полю answer (дата ответа) – от новых к старым
  return records.sort((a, b) => new Date(b.answer).getTime() - new Date(a.answer).getTime())
}