import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const rowClass = 'flex min-h-touch-row w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60'

export function ListRow({
  href,
  onClick,
  disabled,
  leading,
  title,
  meta,
  trailing,
  className,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      {leading ? <span className="shrink-0 text-xl">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{title}</span>
        {meta ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      {trailing ? (
        <span className="flex shrink-0 flex-col items-end gap-1">{trailing}</span>
      ) : null}
      {href ? (
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cn(rowClass, className)}>
        {body}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(rowClass, disabled && 'opacity-60', className)}
      >
        {body}
      </button>
    )
  }

  return <div className={cn(rowClass, className)}>{body}</div>
}

export function List({ children }: { children: React.ReactNode }) {
  return <div className="divide-y rounded-lg border bg-card">{children}</div>
}
