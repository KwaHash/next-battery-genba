'use client'

import { useMemo, useState, useTransition } from 'react'
import { Camera, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DateField } from '@/components/genba/date-field'
import { ListRow } from '@/components/genba/list-row'
import { Notice } from '@/components/genba/notice'
import { QtyStepper } from '@/components/genba/qty-stepper'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { today } from '@/lib/domain/clock'
import { guessProducts } from '@/lib/domain/product-match'
import { cancelRequest, createMaterialRequest } from '@/lib/genba/actions'
import { type ProductRow, type SiteRow } from '@/types/database'

export default function MaterialNewContent({
  products,
  sites,
}: {
  products: ProductRow[];
  sites: SiteRow[];
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [photo, setPhoto] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [picked, setPicked] = useState<ProductRow | null>(null)
  const [qty, setQty] = useState(1)
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [needBy, setNeedBy] = useState(today(2))
  const [note, setNote] = useState('')

  const candidates = useMemo(() => guessProducts(products, hint), [products, hint])

  function submit() {
    if (!picked || !siteId) return

    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${picked.id}-${Date.now()}`

    startTransition(async () => {
      const result = await createMaterialRequest({
        productId: picked.id,
        siteId,
        qty,
        needBy,
        note: note.trim(),
        photoName: photo,
        idempotencyKey,
        offline,
      })

      if (!result.ok) {
        toast.error(result.reasons[0], {
          description: result.reasons.slice(1).join(' / ') || undefined,
        })
        return
      }

      const requestId = result.data.requestId

      if (offline) {
        toast.success('電波が戻ったら送ります')
        router.push('/material')
        router.refresh()
        return
      }

      toast.success('送りました', {
        action: {
          label: '取り消す',
          onClick: () => {
            startTransition(async () => {
              const undo = await cancelRequest(requestId)
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

      router.push(`/material/${requestId}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="写真を送る" backTo="/material" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>① 現物の写真</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              {photo ? (
                <>
                  <ImageIcon className="size-8" aria-hidden />
                  <span>{photo}</span>
                </>
              ) : (
                <>
                  <Camera className="size-8" aria-hidden />
                  <span>銘板か、器具全体が写るように</span>
                </>
              )}
            </div>

            <Button
              size="field"
              onClick={() => setPhoto(`現物_${today()}.jpg`)}
              className='text-white'
            >
              {photo ? '撮り直す' : '写真を撮る'}
            </Button>

            <p className="text-sm text-muted-foreground">
              銘板が汚れて読めなくても構いません。分かる範囲で答えます。
            </p>
          </CardContent>
        </Card>

        {photo ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>② 候補（人が最終確認します）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="hint">分かっていれば型番や形式（任意）</Label>
                <Input
                  id="hint"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="例：40形 ベースライト／FSA41029"
                  className="min-h-12 text-field"
                />
              </div>

              {candidates.length ? (
                <div className="divide-y border-y">
                  {candidates.map(({ product, confidence, reason }) => (
                    <ListRow
                      key={product.id}
                      onClick={() => setPicked(product)}
                      title={`${product.maker} ${product.model}`}
                      meta={
                        <>
                          <span className="block">{product.name}</span>
                          <span className="block">{reason}</span>
                        </>
                      }
                      className={
                        picked?.id === product.id ? 'bg-accent/60' : undefined
                      }
                      trailing={
                        <>
                          <StatusBadge tone={confidence >= 0.6 ? 'ok' : 'warn'}>
                            {Math.round(confidence * 100)}%
                          </StatusBadge>
                          <StatusBadge tone="neutral">
                            {product.stock > 0
                              ? `在庫${product.stock}`
                              : `取寄${product.lead_days}日`}
                          </StatusBadge>
                          {picked?.id === product.id ? (
                            <StatusBadge tone="ok">選択中</StatusBadge>
                          ) : null}
                        </>
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  候補が出ませんでした。そのまま送っていただければ人が調べます。
                </p>
              )}

              <Notice
                variant="warning"
                title="最終判断は有資格者が行ってください"
                lines={[
                  '適合の確認は担当者が行います。',
                  '保安に関わる機器（漏電遮断器・保護継電器など）は必ず人が確認します。',
                ]}
              />
            </CardContent>
          </Card>
        ) : null}

        {photo && picked ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>③ 数量と届け先</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <QtyStepper value={qty} onChange={setQty} />

              <div className="space-y-1.5">
                <Label htmlFor="site">現場</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger id="site" className="min-h-12 text-field">
                    <SelectValue placeholder="現場を選ぶ" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="need-by">いつまでに</Label>
                <DateField id="need-by" value={needBy} onChange={setNeedBy} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">メモ（省略できます）</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="場所や条件"
                  className="min-h-12 text-field"
                />
              </div>

              <Button size="field" disabled={pending || !siteId} onClick={submit} className='text-white'>
                {pending ? '送っています…' : '見積・在庫を聞く'}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
