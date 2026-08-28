import Link from 'next/link'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type PhotoRow, type SiteRow } from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export default function SitesContent({
  sites,
  requests,
  photos,
}: {
  sites: SiteRow[];
  requests: RequestWithItems[];
  photos: PhotoRow[];
}) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="現場と履歴" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        {sites.map((site) => {
          const materialCount = requests.filter((r) => r.site_id === site.id).length
          const photoCount = photos.filter((p) => p.site_id === site.id).length

          return (
            <Card key={site.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{site.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p>{site.address}</p>
                  <p>
                    施主：{site.owner_name || '—'}／{site.contact ?? ''}
                  </p>
                  {site.note ? <p>注意：{site.note}</p> : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge tone="neutral">材料 {materialCount} 件</StatusBadge>
                  <StatusBadge tone="neutral">写真 {photoCount} 枚</StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="compact">
                    <Link href={`/photos/${site.id}`}>写真</Link>
                  </Button>
                  <Button asChild variant="outline" size="compact">
                    <Link href="/report">報告書</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
