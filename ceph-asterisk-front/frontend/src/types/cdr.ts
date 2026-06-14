export interface CDRRecord {
  id: number
  answer: string
  end: string
  clid: string
  src: string
  dst: string
  duration: number
  billsec: number
  disposition: string
  uniqueid: string
  userfield: string
  instance_name: string
  accountcode?: string
  dcontext?: string
  channel?: string
  dstchannel?: string
  lastapp?: string
  lastdata?: string
  amaflags?: number
}

export interface CDRFilter {
  instance_name?: string
  src?: string
  dst?: string
  date_from?: string
  date_to?: string
  disposition?: string
  limit?: number
  offset?: number
}

export interface CallRecord {
  answerDateTime: string
  endDateTime: string
  from: string
  to: string
  duration: string
  status: string
  vats: string
}

export interface CDRResponse {
  total: number
  items: CDRRecord[]
  limit: number
  offset: number
}

export interface CDRQueryParams {
  limit: number
  offset: number
  src?: string
  dst?: string
  disposition?: string
  date_from?: string
  date_to?: string
  instance_name?: string
}