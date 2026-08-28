import { List, ListRow } from '@/components/genba/list-row'
import { TopBar } from '@/components/genba/top-bar'
import { type PhotoRow, type SiteRow } from '@/types/database'

export default function PhotosContent({
  sites,
  photos,
}: {
  sites: SiteRow[];
  photos: PhotoRow[];
}) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="現場写真" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          現場ごとに、施工前・施工後で自動的に分かれます。カメラロールを探さなくて済みます。
        </p>

        <List>
          {sites.map((site) => {
            const count = photos.filter((p) => p.site_id === site.id).length
            return (
              <ListRow
                key={site.id}
                href={`/photos/${site.id}`}
                title={site.name}
                meta={`${count} 枚／${site.address ?? ''}`}
              />
            )
          })}
        </List>
      </div>
    </div>
  )
}
