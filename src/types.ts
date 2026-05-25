export type SearchMode = 'inn' | 'name' | 'group'

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
  industry: string
  segment: string
  contactRole: string
  lastEvent: string
  summary: string
  goals: string[]
  risks: string[]
  opportunities: string[]
  questions: CallQuestion[]
  objectionHandling: string[]
}
