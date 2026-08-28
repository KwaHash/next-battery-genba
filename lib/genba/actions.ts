'use server'

import { revalidatePath } from 'next/cache'
import { canAutoAnswer, draftAnswer } from '@/lib/domain/auto-answer'
import { addDays, today } from '@/lib/domain/clock'
import { canRequestHelp, findHelpPackage } from '@/lib/domain/help-packages'
import { PHOTO_KIND_LABEL } from '@/lib/domain/labels'
import { recordAudit, recordDenied } from '@/lib/genba/audit'
import { requireSession } from '@/lib/genba/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  helpRequestSchema,
  materialRequestSchema,
  photoSchema,
  siteStateSchema,
  todoSchema,
} from '@/lib/validations/genba'
import { type ActionResult } from '@/types/genba'

function fail(reasons: string[]): ActionResult<never> {
  return { ok: false, reasons }
}

export async function createMaterialRequest(
  input: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  const session = await requireSession()
  const parsed = materialRequestSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => i.message))
  }

  const { productId, siteId, qty, needBy, note, photoName, idempotencyKey, offline } =
    parsed.data
  const supabase = createClient()

  // 同じキーで既に送っていたら、それを返す。押し直しでも増えない。
  const { data: existing } = await supabase
    .from('requests')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing) {
    return { ok: true, data: { requestId: existing.id } }
  }

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle()
  if (!product) return fail(['商品が見つかりません'])

  // 電波がないときは PENDING で置く。復帰したら flushPendingRequests が送る。
  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      tenant_id: session.tenantId,
      site_id: siteId,
      kind: 'QUOTE',
      status: offline ? 'PENDING' : 'SENT',
      channel: 'WEB',
      from_person: session.actor,
      photo_name: photoName ?? null,
      need_by: needBy,
      note,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()

  if (error || !request) return fail([error?.message ?? '送信できませんでした'])

  const { error: itemError } = await supabase.from('request_items').insert({
    tenant_id: session.tenantId,
    request_id: request.id,
    product_id: product.id,
    maker: product.maker,
    model: product.model,
    name: product.name,
    category: product.category,
    qty,
    // 依頼した時点の値を残す。あとでマスタが変わっても遡って書き換えない。
    unit_price: product.unit_price,
    stock: product.stock,
    lead_days: product.lead_days,
    verified: product.verified,
    position: 0,
  })
  if (itemError) return fail([itemError.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'REQUEST_CREATED',
    entity: 'requests',
    entityId: request.id,
    after: { status: offline ? 'PENDING' : 'SENT', model: product.model, qty },
  })

  if (!offline) {
    await tryAnswer(request.id)
  }

  revalidatePath('/material')
  revalidatePath('/')
  return { ok: true, data: { requestId: request.id } }
}

async function tryAnswer(requestId: string): Promise<void> {
  try {
    await answerRequestOnServer(requestId)
  } catch (error) {
    console.error('自動回答の判定を実行できませんでした。SENT のまま担当者へ回します', {
      requestId,
      error,
    })
  }
}

async function answerRequestOnServer(requestId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: request } = await admin
    .from('requests')
    .select('*, items:request_items(*)')
    .eq('id', requestId)
    .maybeSingle()

  if (!request) return
  const item = (request.items ?? [])[0]
  if (!item) return
  if (request.status !== 'SENT') return

  // 同じ型番に、**人が承認した**回答の履歴があるか。初回は必ず人。
  // 自動回答した履歴は数えない。数えると、1件目の自動回答が2件目の根拠になり、
  // 「初回は人」という条件が1回で溶ける。
  const { count } = await admin
    .from('request_items')
    .select('id, requests!inner(status, answer_mode)', { count: 'exact', head: true })
    .eq('tenant_id', request.tenant_id)
    .eq('model', item.model)
    .neq('request_id', requestId)
    .eq('requests.answer_mode', 'HUMAN')
    .in('requests.status', ['ANSWERED', 'ORDERED'])

  const verdict = canAutoAnswer(item, { answeredBefore: (count ?? 0) > 0 })

  if (!verdict.ok) {
    // 止めた理由を残す。「なぜ人が確認するのか」が見えないと運用されない。
    await recordDenied({
      tenantId: request.tenant_id,
      actor: 'system',
      action: 'AUTO_ANSWER',
      entity: 'requests',
      entityId: requestId,
      reasons: verdict.blockers,
    })
    await admin
      .from('requests')
      .update({ answer_reasons: verdict.blockers })
      .eq('id', requestId)
    return
  }

  await admin
    .from('requests')
    .update({
      status: 'ANSWERED',
      answer_by: '電池屋 自動回答',
      answer_at: new Date().toISOString(),
      answer_text: draftAnswer(item, { answeredBefore: true }),
      answer_mode: 'AUTO',
      answer_reasons: verdict.reasons,
    })
    .eq('id', requestId)

  await recordAudit({
    tenantId: request.tenant_id,
    actor: 'system',
    action: 'AUTO_ANSWER',
    entity: 'requests',
    entityId: requestId,
    after: { mode: 'AUTO', reasons: verdict.reasons },
  })
}

/** 電波が戻ったときに、溜まっている依頼を送る。二重にはならない。 */
export async function flushPendingRequests(): Promise<ActionResult<{ sent: number }>> {
  const session = await requireSession()
  const supabase = createClient()

  const { data: pending } = await supabase
    .from('requests')
    .select('id')
    .eq('status', 'PENDING')
    .is('archived_at', null)

  if (!pending?.length) return { ok: true, data: { sent: 0 } }

  for (const row of pending) {
    // クライアントは PENDING → SENT までしか進めない。回答はこのあとサーバが決める。
    await supabase.from('requests').update({ status: 'SENT' }).eq('id', row.id)
    await tryAnswer(row.id)
  }

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'REQUEST_FLUSHED',
    entity: 'requests',
    after: { count: pending.length },
  })

  revalidatePath('/material')
  revalidatePath('/')
  return { ok: true, data: { sent: pending.length } }
}

export async function reorderMaterial(
  sourceRequestId: string,
  idempotencyKey: string,
): Promise<ActionResult<{ requestId: string }>> {
  const supabase = createClient()

  const { data: source } = await supabase
    .from('requests')
    .select('site_id, need_by, items:request_items(product_id, qty)')
    .eq('id', sourceRequestId)
    .maybeSingle()

  const item = (source?.items ?? [])[0]
  if (!source || !item?.product_id || !source.site_id) {
    return fail(['前回の内容を読み取れませんでした'])
  }

  return createMaterialRequest({
    productId: item.product_id,
    siteId: source.site_id,
    qty: item.qty,
    needBy: addDays(today(), 2),
    note: '前回と同じものです',
    idempotencyKey,
  })
}

export async function orderRequest(requestId: string): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = createClient()

  const { data: request } = await supabase
    .from('requests')
    .select('id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (!request) return fail(['依頼が見つかりません'])

  if (request.status !== 'ANSWERED') {
    const reasons = ['回答が届いてから発注できます']
    await recordDenied({
      tenantId: session.tenantId,
      actor: session.actor,
      action: 'ORDER',
      entity: 'requests',
      entityId: requestId,
      reasons,
    })
    return fail(reasons)
  }

  const { error } = await supabase
    .from('requests')
    .update({ status: 'ORDERED', ordered_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) return fail([error.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'ORDER',
    entity: 'requests',
    entityId: requestId,
    before: { status: request.status },
    after: { status: 'ORDERED' },
  })

  revalidatePath('/material')
  revalidatePath(`/material/${requestId}`)
  return { ok: true, data: undefined }
}

export async function cancelRequest(requestId: string): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = createClient()

  const { data: request } = await supabase
    .from('requests')
    .select('status')
    .eq('id', requestId)
    .maybeSingle()

  if (!request) return fail(['依頼が見つかりません'])
  if (request.status === 'ORDERED') {
    return fail(['発注済みのものは取り消せません。担当者へご連絡ください'])
  }

  const { error } = await supabase
    .from('requests')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) return fail([error.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'REQUEST_CANCELLED',
    entity: 'requests',
    entityId: requestId,
    before: { status: request.status },
  })

  revalidatePath('/material')
  revalidatePath('/')
  return { ok: true, data: undefined }
}

/** 納期の変更を見たことを記録する。催促の電話をなくすための往復。 */
export async function acknowledgeDelivery(requestId: string): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = createClient()

  const { error } = await supabase
    .from('requests')
    .update({ delivery_seen: true })
    .eq('id', requestId)
  if (error) return fail([error.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'DELIVERY_ACKNOWLEDGED',
    entity: 'requests',
    entityId: requestId,
  })

  revalidatePath(`/material/${requestId}`)
  revalidatePath('/')
  return { ok: true, data: undefined }
}

/** 今日の作業 */
export async function setSiteState(input: unknown): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = siteStateSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message))

  const supabase = createClient()
  const { error } = await supabase
    .from('sites')
    .update({ today_state: parsed.data.state })
    .eq('id', parsed.data.siteId)
  if (error) return fail([error.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: `SITE_${parsed.data.state}`,
    entity: 'sites',
    entityId: parsed.data.siteId,
    after: { today_state: parsed.data.state },
  })

  revalidatePath('/')
  return { ok: true, data: undefined }
}

export async function toggleTodo(todoId: string, done: boolean): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('todos')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', todoId)
  if (error) return fail([error.message])

  revalidatePath('/todo')
  revalidatePath('/')
  return { ok: true, data: undefined }
}

export async function addTodo(input: unknown): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = todoSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message))

  const supabase = createClient()
  const { error } = await supabase.from('todos').insert({
    tenant_id: session.tenantId,
    title: parsed.data.title,
    site_id: parsed.data.siteId ?? null,
    due: parsed.data.due ?? null,
    kind: 'MANUAL',
    done: false,
    auto: false,
  })
  if (error) return fail([error.message])

  revalidatePath('/todo')
  revalidatePath('/')
  return { ok: true, data: undefined }
}

export async function addPhoto(input: unknown): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = photoSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message))

  const { siteId, kind, area, note } = parsed.data
  const supabase = createClient()
  const { error } = await supabase.from('photos').insert({
    tenant_id: session.tenantId,
    site_id: siteId,
    kind,
    area,
    note,
    name: `${PHOTO_KIND_LABEL[kind]}_${today()}.jpg`,
    taken_by: session.actor,
    exif_stripped: true,
  })
  if (error) return fail([error.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'PHOTO_ADDED',
    entity: 'photos',
    entityId: siteId,
    after: { kind, area },
  })

  revalidatePath('/photos')
  revalidatePath(`/photos/${siteId}`)
  return { ok: true, data: undefined }
}

export async function setCalendarLinked(linked: boolean): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = createClient()

  const { error } = await supabase
    .from('settings')
    .update({ calendar_linked: linked, last_sync: new Date().toISOString() })
    .eq('tenant_id', session.tenantId)
  if (error) return fail([error.message])

  revalidatePath('/reminders')
  revalidatePath('/')
  return { ok: true, data: undefined }
}

export async function toggleReminder(key: string): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = createClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('reminders')
    .eq('tenant_id', session.tenantId)
    .maybeSingle()

  if (!settings) return fail(['設定が見つかりません'])

  const target = settings.reminders.find((r) => r.key === key)
  if (!target) return fail(['その通知は登録されていません'])
  if (target.locked) return fail(['これは止められません。工事が止まるためです'])

  const next = settings.reminders.map((r) => (r.key === key ? { ...r, on: !r.on } : r))

  const { error } = await supabase
    .from('settings')
    .update({ reminders: next })
    .eq('tenant_id', session.tenantId)
  if (error) return fail([error.message])

  revalidatePath('/reminders')
  return { ok: true, data: undefined }
}

export async function createHelpRequest(input: unknown): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = helpRequestSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message))

  const pkg = findHelpPackage(parsed.data.packageKey)
  if (!pkg) return fail(['その作業は登録されていません'])

  const verdict = canRequestHelp(pkg)
  if (!verdict.ok) {
    await recordDenied({
      tenantId: session.tenantId,
      actor: session.actor,
      action: 'HELP_REQUEST',
      entity: 'help_requests',
      reasons: verdict.reasons,
      after: { package: pkg.key, level: pkg.level },
    })
    return fail(verdict.reasons)
  }

  const supabase = createClient()
  const { error } = await supabase.from('help_requests').insert({
    tenant_id: session.tenantId,
    site_id: parsed.data.siteId,
    title: pkg.title,
    level: pkg.level,
    qual_label: pkg.qual_label,
    unit: pkg.unit,
    price: pkg.price,
    hours: pkg.hours,
    note: pkg.note,
    status: 'OPEN',
  })
  if (error) return fail([error.message])

  await recordAudit({
    tenantId: session.tenantId,
    actor: session.actor,
    action: 'HELP_REQUEST',
    entity: 'help_requests',
    after: { package: pkg.key, level: pkg.level, price: pkg.price },
  })

  revalidatePath('/help')
  return { ok: true, data: undefined }
}
