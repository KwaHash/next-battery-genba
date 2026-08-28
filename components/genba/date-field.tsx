'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatIsoDate, parseIsoDate, today } from '@/lib/domain/clock'
import { cn } from '@/lib/utils'

const QUICK_PICKS = [
  { label: '明日', offset: 1 },
  { label: 'あさって', offset: 2 },
  { label: '3日後', offset: 3 },
  { label: '来週', offset: 7 },
] as const

export function DateField({
  id,
  value,
  onChange,
  disabled,
  fromYear = new Date().getFullYear(),
  toYear = new Date().getFullYear() + 2,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
}) {
  const [open, setOpen] = useState(false)
  const selected = parseIsoDate(value)

  const minDate = parseIsoDate(today())
  const isDisabled =
    disabled ?? ((date: Date) => (minDate ? date < minDate : false))

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {QUICK_PICKS.map(({ label, offset }) => {
          const date = today(offset)
          return (
            <Button
              key={label}
              type="button"
              variant={value === date ? 'default' : 'outline'}
              size="compact"
              className={value === date ? 'text-primary-foreground' : undefined}
              onClick={() => onChange(date)}
            >
              {label}
            </Button>
          )
        })}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            className={cn(
              'min-h-12 w-full justify-start rounded-md px-3 text-field font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            <CalendarDays className="mr-2 size-5 shrink-0" aria-hidden />
            {selected
              ? format(selected, 'yyyy年M月d日（E）', { locale: ja })
              : '日付を選ぶ'}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            selected={selected}
            onSelect={(date) => pick(date ? formatIsoDate(date) : '')}
            disabled={isDisabled}
            defaultMonth={selected}
            locale={ja}
            formatters={{
              formatMonthDropdown: (month) => format(month, 'M月', { locale: ja }),
              formatYearDropdown: (year) => format(year, 'yyyy年', { locale: ja }),
            }}
            labels={{
              labelMonthDropdown: () => '月を選択',
              labelYearDropdown: () => '年を選択',
              labelPrevious: () => '前の月',
              labelNext: () => '次の月',
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
