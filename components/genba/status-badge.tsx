import { Badge } from '@/components/ui/badge'
import { type Tone } from '@/lib/domain/labels'

const TONE_VARIANT = {
  ok: 'success',
  warn: 'warning',
  danger: 'destructive',
  info: 'info',
  neutral: 'secondary',
} as const

export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return <Badge variant={TONE_VARIANT[tone]}>{children}</Badge>
}
