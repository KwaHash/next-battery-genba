'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Notice } from '@/components/genba/notice'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PHOTO_KIND_LABEL } from '@/lib/domain/labels'
import { addPhoto } from '@/lib/genba/actions'
import { type PhotoRow, type SiteRow } from '@/types/database'

type Kind = PhotoRow['kind']

const KINDS: { kind: Kind; variant: 'default' | 'outline' | 'destructive' }[] = [
  { kind: 'BEFORE', variant: 'default' },
  { kind: 'AFTER', variant: 'outline' },
  { kind: 'DEFECT', variant: 'destructive' },
]

export default function SitePhotosContent({
  site,
  photos,
}: {
  site: SiteRow;
  photos: PhotoRow[];
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [openKind, setOpenKind] = useState<Kind | null>(null)
  const [area, setArea] = useState('')
  const [note, setNote] = useState('')

  function close() {
    setOpenKind(null)
    setArea('')
    setNote('')
  }

  function save() {
    if (!openKind) return

    startTransition(async () => {
      const result = await addPhoto({
        siteId: site.id,
        kind: openKind,
        area: area.trim() || '未設定',
        note: note.trim(),
      })

      if (result.ok) {
        toast.success('保存しました')
        close()
        router.refresh()
      } else {
        toast.error(result.reasons[0])
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title={site.name} backTo="/photos" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map(({ kind, variant }) => (
            <Button
              key={kind}
              variant={variant}
              size="compact"
              onClick={() => setOpenKind(kind)}
            >
              ＋ {PHOTO_KIND_LABEL[kind]}
            </Button>
          ))}
        </div>

        {site.note ? (
          <Notice variant="info" title="現場のメモ" lines={[site.note]} />
        ) : null}

        {(['BEFORE', 'AFTER', 'DEFECT'] as const).map((kind) => {
          const group = photos.filter((p) => p.kind === kind)
          if (!group.length) return null

          return (
            <Card key={kind}>
              <CardHeader className="pb-2">
                <CardTitle>
                  {PHOTO_KIND_LABEL[kind]}（{group.length}）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {group.map((photo) => (
                    <div
                      key={photo.id}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border bg-muted/50 p-2 text-center text-xs"
                    >
                      {kind === 'DEFECT' ? (
                        <AlertTriangle className="size-6 text-destructive" aria-hidden />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
                      )}
                      <span className="font-semibold">{photo.area}</span>
                      {photo.note ? (
                        <span className="text-muted-foreground">{photo.note}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {photos.length ? null : (
          <p className="py-8 text-center text-muted-foreground">
            まだ写真がありません。
          </p>
        )}

        <Notice
          variant="info"
          title="位置情報は消しています"
          lines={[
            '写真に入っている撮影場所の情報は、保存する前に取り除いています。',
            'そのまま施主へ転送しても、現場の座標は付いていきません。',
          ]}
        />
      </div>

      <Dialog open={openKind !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openKind ? PHOTO_KIND_LABEL[openKind] : ''}の写真を追加
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="area">場所</Label>
              <Input
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="例：1F 廊下"
                className="min-h-12 text-field"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="photo-note">メモ（省略できます）</Label>
              <Input
                id="photo-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例：取付面に汚れ。要清掃"
                className="min-h-12 text-field"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="field" disabled={pending} onClick={save} className='text-white'>
              保存する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
