import { today } from '@/lib/domain/clock'
import {
  type CalendarEventRow,
  type PhotoRow,
  type SiteRow,
  type TodoRow,
} from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export type TodoDraft = {
  title: string;
  due: string;
  site_id: string | null;
  kind: TodoRow['kind'];
  auto: true;
  dedupe_key: string;
}

export function deriveTodos(input: {
  todos: TodoRow[];
  requests: RequestWithItems[];
  photos: PhotoRow[];
  events: CalendarEventRow[];
  sites: SiteRow[];
}): TodoDraft[] {
  const existing = new Set(
    input.todos.map((t) => t.dedupe_key).filter((k): k is string => Boolean(k)),
  )
  const drafts: TodoDraft[] = []

  for (const request of input.requests) {
    if (request.status !== 'ORDERED') continue

    const due = request.delivery_changed_to || request.need_by
    if (!due || due > today(1)) continue

    const key = `ARRIVE_${request.id}`
    if (existing.has(key)) continue

    const item = request.items[0]
    if (!item) continue

    drafts.push({
      title: `${item.maker} ${item.model} の着荷を確認する`,
      due,
      site_id: request.site_id,
      kind: 'MATERIAL',
      auto: true,
      dedupe_key: key,
    })
  }

  for (const event of input.events) {
    if (event.event_date !== today() || event.kind !== 'WORK' || !event.site_id) continue

    const hasBefore = input.photos.some(
      (p) => p.site_id === event.site_id && p.kind === 'BEFORE',
    )
    if (hasBefore) continue

    const key = `PHOTO_BEFORE_${event.id}`
    if (existing.has(key)) continue

    const site = input.sites.find((s) => s.id === event.site_id)
    drafts.push({
      title: `施工前の写真を撮る（${site?.name ?? ''}）`,
      due: today(),
      site_id: event.site_id,
      kind: 'PHOTO',
      auto: true,
      dedupe_key: key,
    })
  }

  return drafts
}
