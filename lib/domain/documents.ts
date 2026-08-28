import { today, yen } from '@/lib/domain/clock'
import { PHOTO_KIND_LABEL } from '@/lib/domain/labels'
import { type PhotoRow, type SiteRow } from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export function buildWorkReport(input: {
  site: SiteRow;
  photos: PhotoRow[];
  orderedRequests: RequestWithItems[];
  reporter: string;
}): string {
  const { site, photos, orderedRequests, reporter } = input
  const lines: string[] = []

  lines.push('作業報告書')
  lines.push(`現場：${site.name}（${site.address ?? ''}）`)
  lines.push(`施主：${site.owner_name || '—'}`)
  lines.push(`作業日：${today()}`)
  lines.push(`報告者：${reporter}`)
  lines.push('')

  lines.push('■ 使用材料')
  if (orderedRequests.length) {
    for (const request of orderedRequests) {
      for (const item of request.items) {
        lines.push(`・${item.maker} ${item.model}　${item.qty}個`)
      }
    }
  } else {
    lines.push('・（発注済みの材料がありません）')
  }
  lines.push('')

  lines.push('■ 写真')
  for (const kind of ['BEFORE', 'AFTER', 'DEFECT'] as const) {
    const group = photos.filter((p) => p.kind === kind)
    if (!group.length) continue
    lines.push(`・${PHOTO_KIND_LABEL[kind]}　${group.length}枚`)
    for (const photo of group) {
      lines.push(`    ${photo.area}${photo.note ? `（${photo.note}）` : ''}`)
    }
  }

  const defects = photos.filter((p) => p.kind === 'DEFECT')
  if (defects.length) {
    lines.push('')
    lines.push('■ 申し送り')
    for (const photo of defects) {
      lines.push(`・${photo.area}：${photo.note || '要確認'}`)
    }
  }

  return lines.join('\n')
}

export type QuoteInput = {
  site: SiteRow;
  /** 見積に載せる材料。発注済み・回答済みのものが自動で入る。 */
  requests: RequestWithItems[];
  people: number;
  days: number;
  /** 人工単価。 */
  rate: number;
  /** 諸経費（%）。 */
  marginPercent: number;
  issuer: string;
}

export type QuoteTotals = {
  material: number;
  labor: number;
  margin: number;
  subtotal: number;
  tax: number;
  total: number;
}

export function quoteTotals(input: QuoteInput): QuoteTotals {
  const material = input.requests.reduce(
    (sum, request) =>
      sum + request.items.reduce((t, item) => t + item.unit_price * item.qty, 0),
    0,
  )
  const labor = (input.days || 0) * (input.people || 0) * (input.rate || 0)
  const beforeMargin = material + labor
  const margin = Math.round((beforeMargin * (input.marginPercent || 0)) / 100)
  const subtotal = beforeMargin + margin
  const tax = Math.round(subtotal * 0.1)

  return { material, labor, margin, subtotal, tax, total: subtotal + tax }
}

/**
 * お客様への見積。
 * 材料は発注データから入った状態で始まる。拾い出しと単価入れをやり直さなくて済むのが要点。
 */
export function buildCustomerQuote(input: QuoteInput): string {
  const { site, requests, people, days, rate, marginPercent, issuer } = input
  const totals = quoteTotals(input)
  const lines: string[] = []

  lines.push('御見積書')
  lines.push(`宛先：${site.owner_name || '—'} ${site.contact || ''}`)
  lines.push(`件名：${site.name}　照明更新工事`)
  lines.push(`発行：${issuer}　${today()}`)
  lines.push('')

  lines.push('■ 材料費')
  if (requests.length) {
    for (const request of requests) {
      for (const item of request.items) {
        lines.push(
          `・${item.maker} ${item.model}　${item.qty} × ${yen(item.unit_price)}`
            + `　= ${yen(item.unit_price * item.qty)}`,
        )
      }
    }
  } else {
    lines.push('・（材料の見積がまだありません）')
  }
  lines.push(`　小計　${yen(totals.material)}`)
  lines.push('')

  lines.push('■ 工事費')
  lines.push(`・${people}名 × ${days}日 × ${yen(rate)}　= ${yen(totals.labor)}`)
  lines.push('')

  lines.push(`諸経費（${marginPercent}%）　${yen(totals.margin)}`)
  lines.push(`小計　${yen(totals.subtotal)}`)
  lines.push(`消費税　${yen(totals.tax)}`)
  lines.push(`合計　${yen(totals.total)}`)
  lines.push('')
  lines.push('※ 現場条件により変動する場合があります。')

  return lines.join('\n')
}

export function buildMaterialShare(
  request: RequestWithItems,
  site: SiteRow | null,
): string {
  const item = request.items[0]
  if (!item) return ''

  const lines = [
    '【材料の手配】',
    `${item.maker} ${item.model}`,
    item.name,
    `数量：${item.qty}`,
    `単価：${yen(item.unit_price)}`,
    `計：${yen(item.unit_price * item.qty)}`,
    `現場：${site?.name ?? ''}`,
    `希望：${request.need_by ?? ''}`,
  ]

  if (request.answer_text) {
    lines.push('', `回答：${request.answer_text}`)
  }

  return lines.join('\n')
}
