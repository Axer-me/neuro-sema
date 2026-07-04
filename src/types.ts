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

/** Публикация из строки Excel «сайты, проф.статьи…» */
export interface PublicationMention {
  source: string
  title: string
  excerpt: string
  date: string
}

/** Соцсети, сайты (кроме основного), статьи и достижения ЮЛ/ЛПР */
export interface PublicPresence {
  socialNetworks: string
  additionalSites: string
  publications: PublicationMention[]
  achievements: string[]
}

/** Строка чек-листа с подписью из Excel */
export interface LabeledField {
  label: string
  value: string
}

export interface CompanyBrief {
  id: string
  inn: string
  groupName: string
  name: string
  website: string
  publicPresence: PublicPresence
  industry: string
  okved: string
  segment: string
  revenue: string
  financialStatements: string
  staffCount: string
  isAlfaBankClient: boolean
  kpGroup: string
  lastCommunicationDate: string
  systems: SystemFilter[]
  contactRole: string
  lastEvent: string
  summary: string
  /** Excel, row 2 — История взаимодействия */
  interactionHistory: string
  /** Excel, row 12 — БО / Баланс */
  boBalance: string
  /** Excel, row 14 — Состав группы + связи с проспектами */
  groupProspects: string
  goals: string[]
  offerChecks: LabeledField[]
  riskChecks: LabeledField[]
  questions: CallQuestion[]
  objectionHandling: string[]
}
