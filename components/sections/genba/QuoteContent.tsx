'use client'

import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/genba/copy-button'
import { Notice } from '@/components/genba/notice'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { yen } from '@/lib/domain/clock'
import { buildCustomerQuote, quoteTotals } from '@/lib/domain/documents'
import { type SiteRow } from '@/types/database'
import { type RequestWithItems } from '@/types/genba'

export default function QuoteContent({
  sites,
  requests,
  issuer,
}: {
  sites: SiteRow[];
  requests: RequestWithItems[];
  issuer: string;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [people, setPeople] = useState(2)
  const [days, setDays] = useState(2)
  const [rate, setRate] = useState(25000)
  const [marginPercent, setMarginPercent] = useState(20)

  const { text, totals } = useMemo(() => {
    const site = sites.find((s) => s.id === siteId)
    if (!site) return { text: '', totals: null }

    const input = {
      site,
      requests: requests.filter(
        (r) => r.site_id === siteId && ['ANSWERED', 'ORDERED'].includes(r.status),
      ),
      people,
      days,
      rate,
      marginPercent,
      issuer,
    }

    return { text: buildCustomerQuote(input), totals: quoteTotals(input) }
  }, [siteId, sites, requests, people, days, rate, marginPercent, issuer])

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="お客様への見積" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="quote-site">現場</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger id="quote-site" className="min-h-12 text-field">
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

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="人数" value={people} onChange={setPeople} min={1} />
          <NumberField label="日数" value={days} onChange={setDays} min={1} />
          <NumberField label="人工単価" value={rate} onChange={setRate} step={1000} />
          <NumberField
            label="諸経費（%）"
            value={marginPercent}
            onChange={setMarginPercent}
            max={100}
          />
        </div>

        {totals ? (
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge tone="neutral">材料 {yen(totals.material)}</StatusBadge>
                <StatusBadge tone="neutral">工事 {yen(totals.labor)}</StatusBadge>
                <StatusBadge tone="ok">合計 {yen(totals.total)}</StatusBadge>
              </div>

              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm leading-relaxed">
                {text}
              </pre>

              <CopyButton
                text={text}
                label="お客様へ転送する"
                title="御見積書"
                variant="default"
              />
            </CardContent>
          </Card>
        ) : null}

        <Notice
          variant="success"
          title="材料は発注データから入っています"
          lines={[
            '拾い出しと単価入れをやり直さなくて済みます。',
            '工事費だけ調整してください。',
          ]}
        />
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = `quote-${label}`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="min-h-12 text-field tabular-nums"
      />
    </div>
  )
}
