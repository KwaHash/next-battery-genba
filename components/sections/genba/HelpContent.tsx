'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ListRow } from '@/components/genba/list-row'
import { Notice } from '@/components/genba/notice'
import { StatusBadge } from '@/components/genba/status-badge'
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
import { yen } from '@/lib/domain/clock'
import { HELP_PACKAGES } from '@/lib/domain/help-packages'
import { HELP_LEVEL } from '@/lib/domain/labels'
import { createHelpRequest } from '@/lib/genba/actions'
import { type HelpRequestRow, type SiteRow } from '@/types/database'

export default function HelpContent({
  sites,
  helpRequests,
}: {
  sites: SiteRow[];
  helpRequests: HelpRequestRow[];
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')

  function request(packageKey: string) {
    startTransition(async () => {
      const result = await createHelpRequest({ packageKey, siteId })
      if (result.ok) {
        toast.success('依頼を出しました')
        router.refresh()
      } else {
        toast.error(result.reasons[0], {
          description: result.reasons.slice(1).join(' / ') || undefined,
        })
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="応援を頼む" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Notice
          variant="warning"
          title="「1人1日いくら」では出しません"
          lines={[
            '完成させる中身（成果物）で依頼します。',
            '人を貸し借りする形は、建設業務では扱いが変わるためです。',
            '必要な資格は自動で表示されます。',
          ]}
        />

        <div className="space-y-1.5">
          <Label htmlFor="help-site">現場</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger id="help-site" className="min-h-12 text-field">
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

        <div className="divide-y rounded-lg border bg-card">
          {HELP_PACKAGES.map((pkg) => {
            const level = HELP_LEVEL[pkg.level]
            const blocked = !level.assignable

            return (
              <ListRow
                key={pkg.key}
                disabled={pending}
                onClick={() =>
                  blocked
                    ? toast.error('責任者の確認が済むまで依頼できません', {
                        description: pkg.note,
                      })
                    : request(pkg.key)
                }
                className={blocked ? 'opacity-65' : undefined}
                title={pkg.title}
                meta={
                  <>
                    <span className="block">
                      {pkg.unit}／{pkg.hours}／{yen(pkg.price)}
                    </span>
                    <span className="block">{pkg.note}</span>
                  </>
                }
                trailing={
                  <>
                    <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {pkg.qual_label}
                    </span>
                  </>
                }
              />
            )
          })}
        </div>

        <Notice
          variant="info"
          title="色の意味"
          lines={[
            '赤：資格者にしか依頼できません',
            '黄：条件により変わるため、責任者の確認が済むまで依頼できません',
            '緑：資格不要と確認済みです',
          ]}
        />

        {helpRequests.length ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>出している依頼（{helpRequests.length}）</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="divide-y border-y">
                {helpRequests.map((help) => (
                  <ListRow
                    key={help.id}
                    title={help.title}
                    meta={`${yen(help.price)}／${help.qual_label ?? ''}`}
                    trailing={<StatusBadge tone="ok">募集中</StatusBadge>}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
