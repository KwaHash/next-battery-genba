'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PRESETS = [10, 20, 30, 50, 100] as const

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 9999,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="field"
          className="w-16 shrink-0 text-2xl"
          aria-label="1つ減らす"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
        >
          <Minus className="size-6" aria-hidden />
        </Button>

        <output
          aria-live="polite"
          aria-label="数量"
          className="flex min-h-touch-btn flex-1 items-center justify-center rounded-lg border bg-muted text-3xl font-bold tabular-nums"
        >
          {value}
        </output>

        <Button
          type="button"
          variant="outline"
          size="field"
          className="w-16 shrink-0 text-2xl"
          aria-label="1つ増やす"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
        >
          <Plus className="size-6" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={value === preset ? 'default' : 'outline'}
            size="compact"
            className={cn('tabular-nums', value === preset && 'font-bold')}
            onClick={() => onChange(clamp(preset))}
          >
            {preset}
          </Button>
        ))}
      </div>
    </div>
  )
}
