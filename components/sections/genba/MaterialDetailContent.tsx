'use client'

import { useTransition } from 'react'
import { ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CopyButton } from '@/components/genba/copy-button'
import { Notice } from '@/components/genba/notice'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, yen } from '@/lib/domain/clock'
import { buildMaterialShare } from '@/lib/domain/documents'
import { acknowledgeDelivery, orderRequest } from '@/lib/genba/actions'
import { type SiteRow } from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export default function MaterialDetailContent({
  request,
  site,
}: {
  request: RequestWithItems;
  site: SiteRow | null;
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const item = request.items[0]
  if (!item) {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar title="相談の内容" backTo="/material" />
        <p className="p-8 text-center text-muted-foreground">
          明細が見つかりません。
        </p>
      </div>
    )
  }

  const total = item.unit_price * item.qty
  const enough = item.stock >= item.qty

  function order() {
    startTransition(async () => {
      const result = await orderRequest(request.id)
      if (result.ok) {
        toast.success('発注しました')
        router.refresh()
      } else {
        toast.error(result.reasons[0])
      }
    })
  }

  function acknowledge() {
    startTransition(async () => {
      const result = await acknowledgeDelivery(request.id)
      if (result.ok) {
        toast.success('確認を記録しました')
        router.refresh()
      } else {
        toast.error(result.reasons[0])
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="相談の内容" backTo="/material" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground">
              <ImageIcon className="size-7" aria-hidden />
              <span>{request.photo_name || '写真なし'}</span>
            </div>

            <div>
              <h2 className="text-lg font-bold">{item.maker} {item.model}</h2>
              <p className="text-sm text-muted-foreground">{item.name}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <StatusBadge tone="neutral">数量 {item.qty}</StatusBadge>
              <StatusBadge tone="neutral">単価 {yen(item.unit_price)}</StatusBadge>
              <StatusBadge tone="ok">計 {yen(total)}</StatusBadge>
            </div>

            <div className="space-y-0.5 text-sm text-muted-foreground">
              <p>
                現場：{site?.name ?? '—'}／希望 {request.need_by ?? '—'}
              </p>
              {request.note ? <p>メモ：{request.note}</p> : null}
            </div>
          </CardContent>
        </Card>

        {request.answer_text ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>担当者からの回答</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="divide-y border-y">
                <AnswerRow label="現行品" value={`${item.maker} ${item.model}`} />
                <AnswerRow
                  label="相当品の候補"
                  value={request.alternatives?.length ? request.alternatives.join('／') : '同等品の登録なし（必要なら担当者が探します）'}
                />
                <AnswerRow
                  label="在庫"
                  value={ enough ? `引当可（在庫 ${item.stock}）` : `不足（在庫 ${item.stock}／必要 ${item.qty}）` }
                  badge={
                    <StatusBadge tone={enough ? 'ok' : 'warn'}>
                      {enough ? '出せます' : '一部取寄'}
                    </StatusBadge>
                  }
                />
                <AnswerRow
                  label="納期"
                  value={
                    request.delivery_changed_to
                      ? `${request.delivery_changed_to}（変更後）`
                      : enough ? '翌営業日' : `${item.lead_days}営業日`
                  }
                />
                <AnswerRow
                  label="価格"
                  value={`${yen(item.unit_price)} × ${item.qty} = ${yen(total)}`}
                />
              </dl>

              <div className="rounded-lg bg-muted p-3">
                <p className="mb-1 text-xs text-muted-foreground">
                  {request.answer_by}　{formatDateTime(request.answer_at)}
                </p>
                <p className="whitespace-pre-wrap text-sm">{request.answer_text}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                適合の最終判断は有資格者が行ってください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <Notice
            variant="info"
            title="担当者が確認しています"
            lines={
              request.answer_reasons?.length
                ? [...request.answer_reasons, '営業時間内に担当者から回答します。']
                : ['営業時間内に担当者から回答します。']
            }
          />
        )}

        {request.delivery_changed_to ? (
          <Card>
            <CardContent className="space-y-3 pt-4">
              <Notice
                variant="warning"
                title="納期が変わりました"
                lines={[
                  `${request.delivery_promised} → ${request.delivery_changed_to}`,
                  `理由：${request.delivery_reason ?? '—'}`,
                ]}
              />
              {request.delivery_seen ? (
                <StatusBadge tone="ok">確認済み</StatusBadge>
              ) : (
                <Button size="field" disabled={pending} onClick={acknowledge} className='text-white'>
                  確認しました
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {request.status === 'ORDERED' ? (
          <Notice
            variant="success"
            title="発注済みです"
            lines={['納期が変わったらお知らせします。']}
          />
        ) : request.status === 'ANSWERED' ? (
          <Button size="field" disabled={pending} onClick={order} className='text-white'>
            この内容で発注する
          </Button>
        ) : null}

        <CopyButton
          text={buildMaterialShare(request, site)}
          label="この内容を転送する"
          title="材料の手配"
        />
      </div>
    </div>
  )
}

function AnswerRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-touch-row items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-semibold leading-snug">{value}</dd>
      </div>
      {badge}
    </div>
  )
}
