import { type RequestRow, type SiteRow } from '@/types/database'

export const REQUEST_STATUS_LABEL: Record<RequestRow['status'], string> = {
  DRAFT: '下書き',
  PENDING: '送信待ち',
  SENT: '依頼中',
  ANSWERED: '回答あり',
  ORDERED: '発注済',
}

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral' | 'info'

export const REQUEST_STATUS_TONE: Record<RequestRow['status'], Tone> = {
  DRAFT: 'neutral',
  PENDING: 'warn',
  SENT: 'warn',
  ANSWERED: 'ok',
  ORDERED: 'neutral',
}

export const SITE_STATE_LABEL: Record<SiteRow['today_state'], string> = {
  NONE: '未着',
  ARRIVED: '到着済み',
  WORKING: '作業中',
  DONE: '本日完了',
}

export const SITE_STATE_TONE: Record<SiteRow['today_state'], Tone> = {
  NONE: 'warn',
  ARRIVED: 'neutral',
  WORKING: 'info',
  DONE: 'ok',
}

export const EVENT_KIND_LABEL = {
  WORK: '工事',
  SURVEY: '現調',
  OTHER: 'その他',
} as const

export const PHOTO_KIND_LABEL = {
  BEFORE: '施工前',
  AFTER: '施工後',
  DEFECT: '不具合',
} as const

export const TODO_KIND_LABEL = {
  MANUAL: 'やること',
  PHOTO: '写真',
  MATERIAL: '材料',
  DOC: '書類',
} as const

export const HELP_LEVEL = {
  RED: { label: '赤　資格者のみ', tone: 'danger' as Tone, assignable: true },
  YELLOW: { label: '黄　責任者の確認待ち', tone: 'warn' as Tone, assignable: false },
  GREEN: { label: '緑　資格不要', tone: 'ok' as Tone, assignable: true },
} as const

export type HelpLevel = keyof typeof HELP_LEVEL
