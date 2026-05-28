export type SearchMode = 'inn' | 'name' | 'group'

export const SYSTEM_FILTERS = [
  'SFA',
  'Pega',
  'ClaimCRM',
  'AlfaClever',
  'Расчётный конвейер',
  'Кредитный конвейер',
  'LM',
  'ЕСКО',
  'Дашборд VOC',
] as const

export type SystemFilter = (typeof SYSTEM_FILTERS)[number]

export type QuestionTone = 'icebreaker' | 'discovery' | 'value' | 'closing'

export interface CallQuestion {
  id: string
  tone: QuestionTone
  text: string
  note: string
}

export interface CompanyBrief {
  id: string
  inn: string
  groupName: string
  name: string
  website: string
  industry: string
  okved: string
  segment: string
  isAlfaBankClient: boolean
  kpGroup: string
  lastCommunicationDate: string
  systems: SystemFilter[]
  contactRole: string
  lastEvent: string
  summary: string
  goals: string[]
  risks: string[]
  opportunities: string[]
  questions: CallQuestion[]
  objectionHandling: string[]
}
