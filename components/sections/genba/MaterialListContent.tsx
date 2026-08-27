'use client'

import { useTransition } from 'react'
import { Camera } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { List, ListRow } from '@/components/genba/list-row'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, toJstDate } from '@/lib/domain/clock'
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE } from '@/lib/domain/labels'
import { cancelRequest, reorderMaterial } from '@/lib/genba/actions'
import { type SiteRow } from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export default function MaterialListContent({
  requests,
  sites,
}: {
  requests: RequestWithItems[];
  sites: SiteRow[];
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const siteById = new Map(sites.map((s) => [s.id, s]))

  const seen = new Set<string>()
  const recent = requests.filter((request) => {
      const item = request.items[0]
      if (!item || seen.has(item.model)) return false
      seen.add(item.model)
      return true
    }).slice(0, 3)

  function reorder(request: RequestWithItems) {
    const key = `reorder-${request.id}-${Date.now()}`

    startTransition(async () => {
      const result = await reorderMaterial(request.id, key)
      if (!result.ok) {
        toast.error(result.reasons[0])
        return
      }

      const newId = result.data.requestId

      toast.success('送りました', {
        action: {
          label: '取り消す',
          onClick: () => {
            startTransition(async () => {
              const undo = await cancelRequest(newId)
              if (undo.ok) {
                toast.success('取り消しました')
                router.push('/material')
                router.refresh()
              } else {
                toast.error(undo.reasons[0])
              }
            })
          },
        },
      })

      router.push(`/material/${newId}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="材料を頼む" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Button asChild size="field">
          <Link href="/material/new" className='text-white'>
            <Camera className="mr-2 size-5" aria-hidden />
            写真を送って相談する
          </Link>
        </Button>

        {recent.length ? (
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle>前回と同じものを頼む</CardTitle>
              <p className="text-sm text-muted-foreground">
                写真を撮らずに、そのまま同じ内容で出せます。
              </p>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="divide-y">
                {recent.map((request) => {
                  const item = request.items[0]
                  return (
                    <ListRow
                      key={request.id}
                      disabled={pending}
                      onClick={() => reorder(request)}
                      title={`${item.maker} ${item.model}`}
                      meta={`${item.qty} 個／${
                        request.site_id ? (siteById.get(request.site_id)?.name ?? '') : ''
                      }`}
                      trailing={<StatusBadge tone="ok">この内容で送る</StatusBadge>}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {requests.length ? (
          <List>
            {requests.map((request) => {
              const item = request.items[0]
              if (!item) return null
              return (
                <ListRow
                  key={request.id}
                  href={`/material/${request.id}`}
                  title={`${item.maker} ${item.model} × ${item.qty}`}
                  meta={`${request.site_id ? (siteById.get(request.site_id)?.name ?? '') : ''}／${formatDate(toJstDate(request.created_at))}`}
                  trailing={
                    <StatusBadge tone={REQUEST_STATUS_TONE[request.status]}>
                      {REQUEST_STATUS_LABEL[request.status]}
                    </StatusBadge>
                  }
                />
              )
            })}
          </List>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            まだ相談がありません。
          </p>
        )}
      </div>
    </div>
  )
}
