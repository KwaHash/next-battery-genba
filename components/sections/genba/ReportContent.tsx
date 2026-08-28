'use client'

import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/genba/copy-button'
import { Notice } from '@/components/genba/notice'
import { TopBar } from '@/components/genba/top-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildWorkReport } from '@/lib/domain/documents'
import { type PhotoRow, type SiteRow } from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export default function ReportContent({
  sites,
  photos,
  requests,
  reporter,
}: {
  sites: SiteRow[];
  photos: PhotoRow[];
  requests: RequestWithItems[];
  reporter: string;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')

  const text = useMemo(() => {
    const site = sites.find((s) => s.id === siteId)
    if (!site) return ''

    return buildWorkReport({
      site,
      photos: photos.filter((p) => p.site_id === siteId),
      orderedRequests: requests.filter(
        (r) => r.site_id === siteId && r.status === 'ORDERED',
      ),
      reporter,
    })
  }, [siteId, sites, photos, requests, reporter])

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="作業報告書" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="report-site">現場</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger id="report-site" className="min-h-12 text-field">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>写真と材料から自動で作りました</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm leading-relaxed">
              {text}
            </pre>
            <CopyButton text={text} title="作業報告書" variant="default" />
          </CardContent>
        </Card>

        <Notice
          variant="info"
          title="夜に書かなくて済むように"
          lines={[
            '現場で写真を撮っていれば、報告書はここまで自動で埋まります。',
            '足りない部分だけ足してください。',
          ]}
        />
      </div>
    </div>
  )
}
