'use client'

import { useTransition } from 'react'
import { CalendarCheck, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ListRow } from '@/components/genba/list-row'
import { Notice } from '@/components/genba/notice'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, isDueBy, today } from '@/lib/domain/clock'
import {
  EVENT_KIND_LABEL,
  SITE_STATE_LABEL,
  SITE_STATE_TONE,
  TODO_KIND_LABEL,
} from '@/lib/domain/labels'
import { setCalendarLinked, setSiteState, toggleTodo } from '@/lib/genba/actions'
import { type CalendarEventRow, type SiteRow } from '@/types/database'
import { type FieldNotice, type HomeData } from '@/types/genba'

export default function HomeContent({
  data,
  notices,
}: {
  data: HomeData;
  notices: FieldNotice[];
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const { sites, events, todos, settings } = data
  const siteById = new Map(sites.map((s) => [s.id, s]))

  const todayEvents = events.filter((e) => e.event_date === today())
  const tomorrowEvents = events.filter((e) => e.event_date === today(1))
  const openTodos = todos.filter((t) => !t.done && isDueBy(t.due))

  // 作業ボタンは今日の工事の1件目にだけ付ける。全部に付けると押し間違える。
  const firstWork = todayEvents.find((e) => e.kind === 'WORK')
  const activeSite = firstWork?.site_id ? siteById.get(firstWork.site_id) : undefined

  function run(action: () => Promise<{ ok: boolean; reasons?: string[] }>, message: string) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(message)
        router.refresh()
      } else {
        toast.error(result.reasons?.[0] ?? '記録できませんでした')
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="今日の作業" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-lg">{formatDate(today())}</strong>
          {settings?.calendar_linked ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarCheck className="size-4 text-success" aria-hidden />
              カレンダー連携中
            </span>
          ) : (
            <Button
              variant="outline"
              size="compact"
              disabled={pending}
              onClick={() => run(() => setCalendarLinked(true), '連携しました（読み取りのみ）')}
            >
              <CalendarPlus className="mr-1.5 size-4" aria-hidden />
              カレンダーを繋ぐ
            </Button>
          )}
        </div>

        {notices.map((notice) => (
          <Link key={notice.requestId} href={`/material/${notice.requestId}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <StatusBadge tone={notice.tone}>{notice.kind}</StatusBadge>
                <CardTitle className="pt-1 text-base">{notice.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="rounded-lg bg-muted p-3 text-sm">{notice.text}</p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {todayEvents.length ? (
          todayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              site={event.site_id ? siteById.get(event.site_id) : undefined}
              withActions={event.id === firstWork?.id}
              state={activeSite?.today_state ?? 'NONE'}
              pending={pending}
              onSetState={(state, message) =>
                activeSite
                  && run(() => setSiteState({ siteId: activeSite.id, state }), message)
              }
            />
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>本日の予定はありません</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              カレンダーに予定が入ると、ここに出ます。
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>やること（{openTodos.length}）</CardTitle>
            <Button asChild variant="ghost" size="compact">
              <Link href="/todo">すべて見る</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {openTodos.length ? (
              <div className="divide-y">
                {openTodos.slice(0, 5).map((todo) => (
                  <ListRow
                    key={todo.id}
                    disabled={pending}
                    onClick={() => run(() => toggleTodo(todo.id, true), '完了にしました')}
                    leading="☐"
                    title={todo.title}
                    meta={
                      [
                        todo.site_id ? siteById.get(todo.site_id)?.name : null,
                        TODO_KIND_LABEL[todo.kind],
                      ]
                        .filter(Boolean)
                        .join('／')
                    }
                    trailing={
                      todo.auto ? <StatusBadge tone="neutral">自動</StatusBadge> : null
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="px-4 text-sm text-muted-foreground">
                今日のやることはありません。
              </p>
            )}
          </CardContent>
        </Card>

        {/* 明日の予定。道具と材料の準備を前日に済ませられるように。 */}
        {tomorrowEvents.length ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>明日（{formatDate(today(1))}）</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="divide-y">
                {tomorrowEvents.map((event) => (
                  <ListRow
                    key={event.id}
                    title={`${event.start_time ?? ''} ${
                      event.site_id ? (siteById.get(event.site_id)?.name ?? '') : ''
                    }`}
                    meta={event.title}
                    trailing={
                      <StatusBadge tone="neutral">
                        {EVENT_KIND_LABEL[event.kind]}
                      </StatusBadge>
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Button asChild variant="outline" size="field">
          <Link href="/reminders">通知の設定</Link>
        </Button>

        <Notice
          variant="info"
          title="カレンダーは読み取りだけです"
          lines={[
            '予定を取り込むだけで、書き換えません。',
            '知らせるのは、あなたの現場と発注に起きたことだけです。',
          ]}
        />
      </div>
    </div>
  )
}

function EventCard({
  event,
  site,
  withActions,
  state,
  pending,
  onSetState,
}: {
  event: CalendarEventRow;
  site: SiteRow | undefined;
  withActions: boolean;
  state: SiteRow['today_state'];
  pending: boolean;
  onSetState: (state: SiteRow['today_state'], message: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-2 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone="neutral">
            {event.start_time}–{event.end_time}
          </StatusBadge>
          <StatusBadge tone={event.kind === 'WORK' ? 'ok' : 'neutral'}>
            {EVENT_KIND_LABEL[event.kind]}
          </StatusBadge>
          {withActions ? (
            <StatusBadge tone={SITE_STATE_TONE[state]}>
              {SITE_STATE_LABEL[state]}
            </StatusBadge>
          ) : null}
        </div>
        <CardTitle className="text-lg">{site?.name ?? '（現場未設定）'}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-0.5 text-sm text-muted-foreground">
          <p>{event.title}</p>
          {site?.address ? <p>{site.address}</p> : null}
          {event.members ? <p>体制：{event.members}</p> : null}
        </div>

        {site?.note ? (
          <Notice variant="warning" title="現場の注意" lines={[site.note]} />
        ) : null}

        {withActions ? (
          <div className="space-y-2">
            {state === 'NONE' ? (
              <Button
                size="field"
                disabled={pending}
                onClick={() => onSetState('ARRIVED', '到着を記録しました')}
              >
                到着しました
              </Button>
            ) : null}

            {state === 'ARRIVED' ? (
              <Button
                size="field"
                disabled={pending}
                onClick={() => onSetState('WORKING', '開始を記録しました')}
              >
                作業を開始する
              </Button>
            ) : null}

            {state === 'WORKING' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="destructive" size="field">
                  <Link href="/material/new">材料が足りない</Link>
                </Button>
                <Button
                  size="field"
                  disabled={pending}
                  onClick={() => onSetState('DONE', 'お疲れさまでした')}
                >
                  本日の作業を完了
                </Button>
              </div>
            ) : null}

            {state === 'DONE' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="field">
                  <Link href={`/photos/${event.site_id}`}>写真を確認</Link>
                </Button>
                <Button asChild size="field">
                  <Link href="/report">報告書を作る</Link>
                </Button>
              </div>
            ) : null}

            {state !== 'WORKING' && state !== 'DONE' ? (
              <Button asChild variant="outline" size="field">
                <Link href="/material/new">材料が足りない</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
