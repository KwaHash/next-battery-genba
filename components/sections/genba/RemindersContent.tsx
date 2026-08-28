'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Notice } from '@/components/genba/notice'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { formatDateTime } from '@/lib/domain/clock'
import { setCalendarLinked, toggleReminder } from '@/lib/genba/actions'
import { type SettingsRow } from '@/types/database'

export default function RemindersContent({ settings }: { settings: SettingsRow | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const reminders = settings?.reminders ?? []

  function toggle(key: string, wasOn: boolean) {
    startTransition(async () => {
      const result = await toggleReminder(key)
      if (result.ok) {
        toast.success(wasOn ? '止めました' : '入れました')
        router.refresh()
      } else {
        toast.error(result.reasons[0])
      }
    })
  }

  function link() {
    startTransition(async () => {
      const result = await setCalendarLinked(true)
      if (result.ok) {
        toast.success('連携しました（読み取りのみ）')
        router.refresh()
      } else {
        toast.error(result.reasons[0])
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="通知の設定" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>カレンダー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings?.calendar_linked ? (
              <div className="space-y-1.5">
                <StatusBadge tone="ok">連携中</StatusBadge>
                <p className="text-sm text-muted-foreground">
                  {settings.calendar_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  最終同期：{formatDateTime(settings.last_sync)}
                </p>
                <Button
                  variant="outline"
                  size="field"
                  disabled={pending}
                  onClick={link}
                >
                  今すぐ同期
                </Button>
              </div>
            ) : (
              <Button size="field" disabled={pending} onClick={link} className='text-white'>
                カレンダーを繋ぐ
              </Button>
            )}

            <Notice
              variant="info"
              title="読み取りだけです"
              lines={[
                '予定を取り込むだけで、書き換えません。',
                '書き込むのは、確定した工事だけにします。私用の予定には触れません。',
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>知らせること</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y border-y">
              {reminders.map((reminder) => (
                <div
                  key={reminder.key}
                  className="flex min-h-touch-row items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{reminder.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {reminder.note}
                    </p>
                  </div>

                  {reminder.locked ? (
                    <StatusBadge tone="neutral">常時</StatusBadge>
                  ) : (
                    <Switch
                      checked={reminder.on}
                      disabled={pending}
                      aria-label={reminder.label}
                      onCheckedChange={() => toggle(reminder.key, reminder.on)}
                    />
                  )}
                </div>
              ))}
            </div>

            <Notice
              variant="warning"
              title="うるさいと使われなくなります"
              lines={[
                '送るのは、あなたの現場と発注に起きたことだけです。',
                'お知らせやキャンペーンは送りません。',
                '納期の変更だけは止められません。工事が止まるためです。',
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
