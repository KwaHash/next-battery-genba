import 'server-only'

import { deriveTodos } from '@/lib/domain/todo-sync'
import { createClient } from '@/lib/supabase/server'
import {
  type CalendarEventRow,
  type HelpRequestRow,
  type PhotoRow,
  type ProductRow,
  type SettingsRow,
  type SiteRow,
  type TodoRow,
} from '@/types/database'
import { type FieldNotice, type HomeData, type RequestWithItems } from '@/types/genba'

const REQUEST_SELECT = '*, items:request_items(*)'

function sortItems(rows: RequestWithItems[]): RequestWithItems[] {
  return rows.map((r) => ({
    ...r,
    items: [...(r.items ?? [])].sort((a, b) => a.position - b.position),
  }))
}

export async function listSites(): Promise<SiteRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sites')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getSite(id: string): Promise<SiteRow | null> {
  const supabase = createClient()
  const { data } = await supabase.from('sites').select('*').eq('id', id).maybeSingle()
  return data
}

export async function listProducts(): Promise<ProductRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function listRequests(): Promise<RequestWithItems[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('requests')
    .select(REQUEST_SELECT)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  return sortItems((data ?? []) as RequestWithItems[])
}

export async function getRequest(id: string): Promise<RequestWithItems | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('requests')
    .select(REQUEST_SELECT)
    .eq('id', id)
    .maybeSingle()
  return data ? sortItems([data as RequestWithItems])[0] : null
}

export async function listPhotos(siteId?: string): Promise<PhotoRow[]> {
  const supabase = createClient()
  let query = supabase.from('photos').select('*').is('archived_at', null)
  if (siteId) query = query.eq('site_id', siteId)
  const { data } = await query.order('taken_at', { ascending: false })
  return data ?? []
}

export async function listEvents(): Promise<CalendarEventRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .is('archived_at', null)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
  return data ?? []
}

export async function listTodos(): Promise<TodoRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('todos')
    .select('*')
    .is('archived_at', null)
    .order('due', { ascending: true })
  return data ?? []
}

export async function getSettings(): Promise<SettingsRow | null> {
  const supabase = createClient()
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle()
  return data
}

export async function listHelpRequests(): Promise<HelpRequestRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('help_requests')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getHomeData(tenantId: string): Promise<HomeData> {
  const [sites, events, todos, requests, settings] = await Promise.all([
    listSites(),
    listEvents(),
    listTodos(),
    listRequests(),
    getSettings(),
  ])

  const drafts = deriveTodos({ todos, requests, photos: await listPhotos(), events, sites })

  if (drafts.length) {
    const supabase = createClient()
    await supabase
      .from('todos')
      .upsert(
        drafts.map((d) => ({ ...d, tenant_id: tenantId, done: false })),
        { onConflict: 'tenant_id,dedupe_key', ignoreDuplicates: true },
      )
    return { sites, events, todos: await listTodos(), requests, settings }
  }

  return { sites, events, todos, requests, settings }
}

export function buildNotices(requests: RequestWithItems[]): FieldNotice[] {
  const notices: FieldNotice[] = []

  for (const request of requests) {
    const item = request.items[0]
    if (!item) continue

    if (request.delivery_changed_to && !request.delivery_seen) {
      notices.push({
        requestId: request.id,
        kind: '納期が変わりました',
        tone: 'warn',
        title: `${item.maker} ${item.model}`,
        text: `${request.delivery_promised} → ${request.delivery_changed_to}`
          + `（${request.delivery_reason ?? ''}）`,
      })
    } else if (request.status === 'ANSWERED' && request.answer_text) {
      notices.push({
        requestId: request.id,
        kind: '回答が届きました',
        tone: 'ok',
        title: `${item.maker} ${item.model}`,
        text: request.answer_text,
      })
    }
  }

  return notices
}
