import 'server-only'

import { type IsoDate, addDays, today } from '@/lib/domain/clock'
import { type RequestItemRow, type SiteRow } from '@/types/database'

export const SAFETY_KEYWORDS = [
  '漏電遮断器',
  '漏電',
  '遮断器',
  'ブレーカ',
  '保護継電器',
  '継電器',
  'ELCB',
  'MCCB',
] as const

export const AUTO_MAX_QTY = 50
export const AUTO_MAX_AMOUNT = 300_000

export type AnswerableItem = Pick<
  RequestItemRow,
  'name' | 'model' | 'category' | 'qty' | 'stock' | 'unit_price' | 'lead_days' | 'verified'
>

export type AutoAnswerContext = {
  answeredBefore: boolean;
  aliases?: { from_model: string; to_model: string }[];
}

export type AutoAnswerVerdict = {
  ok: boolean;
  reasons: string[];
  blockers: string[];
}

export function isSafetyItem(item: AnswerableItem): boolean {
  const haystack = `${item.name || ''} ${item.model || ''} ${item.category || ''}`
  return SAFETY_KEYWORDS.some((keyword) => haystack.includes(keyword))
}

export function canAutoAnswer(
  item: AnswerableItem,
  ctx: AutoAnswerContext,
): AutoAnswerVerdict {
  const reasons: string[] = []
  const blockers: string[] = []

  if (isSafetyItem(item)) {
    blockers.push('保安に関わる機器です。必ず人が確認します')
  } else {
    reasons.push('保安機器ではありません')
  }

  if (ctx.answeredBefore) {
    reasons.push('同じ型番に、人が承認した回答の履歴があります')
  } else {
    blockers.push('この型番の回答履歴がありません（初回は人が確認します）')
  }

  if (item.stock >= item.qty) {
    reasons.push(`在庫で引き当てられます（在庫 ${item.stock}／必要 ${item.qty}）`)
  } else {
    blockers.push('在庫が不足しています。納期の判断が要ります')
  }

  const amount = (item.unit_price || 0) * (item.qty || 0)
  if (item.qty <= AUTO_MAX_QTY && amount <= AUTO_MAX_AMOUNT) {
    reasons.push('数量・金額が自動回答の範囲内です')
  } else {
    blockers.push(
      `大口のため人が確認します（${item.qty}個／${amount.toLocaleString('ja-JP')}円）`,
    )
  }

  if (item.verified) {
    reasons.push('適合確認済みの商品です')
  } else {
    blockers.push('適合が未確認の商品です')
  }

  return { ok: blockers.length === 0, reasons, blockers }
}

export function draftAnswer(item: AnswerableItem, ctx: AutoAnswerContext): string {
  const lines: string[] = []

  if (item.stock >= item.qty) {
    lines.push('在庫あります。本日15時までのご注文で翌営業日着です。')
  } else if (item.stock > 0) {
    lines.push(
      `在庫が${item.stock}個です。不足分は${item.lead_days}営業日で入荷します。分納も可能です。`,
    )
  } else {
    lines.push(`在庫切れです。${item.lead_days}営業日で入荷予定です。`)
  }

  lines.push(`単価 ${Number(item.unit_price || 0).toLocaleString('ja-JP')}円（税別）。`)

  const alias = (ctx.aliases || []).find((a) => a.to_model === item.model)
  if (alias) lines.push(`※ ${alias.from_model} の後継品です。`)
  if (!item.verified) lines.push('※ 適合は未確認です。取付寸法をご確認ください。')

  return lines.join('\n')
}

export const LOGISTICS = {
  DIRECT: { label: '現場直送', days: 1, note: '拠点を通さない。最短' },
  HUB: { label: '拠点経由', days: 2, note: '検品・仕分けが入る' },
  KITTING: { label: '拠点でキッティング', days: 2, note: '定尺切断・番号シール・施工順梱包' },
} as const

export type LogisticsRoute = keyof typeof LOGISTICS

export type DeliveryPlan = {
  route: (typeof LOGISTICS)[LogisticsRoute];
  shipDays: number;
  logisticsDays: number;
  arrive: IsoDate;
  recommended: IsoDate | null;
  warnings: string[];
  source: string;
}

export function deliveryPlan(
  item: AnswerableItem,
  opts: { route?: LogisticsRoute; workDate?: IsoDate | null; site?: SiteRow | null } = {},
): DeliveryPlan {
  const route = LOGISTICS[opts.route || 'DIRECT']
  const shipDays = item.stock >= item.qty ? 0 : item.lead_days || 0
  const arrive = addDays(today(), shipDays + route.days)

  const warnings: string[] = []
  let recommended: IsoDate | null = null

  if (opts.workDate) {
    recommended = addDays(opts.workDate, -1)
    if (arrive > recommended) {
      warnings.push(
        `施工予定（${opts.workDate}）に間に合いません。分納か、代替品の検討が要ります`,
      )
    } else if (arrive < addDays(opts.workDate, -4)) {
      warnings.push(
        '着荷が早すぎます。現場に置き場がなければ、拠点で預かって前日出荷にできます',
      )
    }
  }

  if (opts.site?.receive_note) {
    warnings.push(`受取条件：${opts.site.receive_note}`)
  }

  return {
    route,
    shipDays,
    logisticsDays: route.days,
    arrive,
    recommended,
    warnings,
    source:
      item.stock >= item.qty
        ? '自社在庫から出荷'
        : `メーカー手配（${item.lead_days}営業日）`,
  }
}
