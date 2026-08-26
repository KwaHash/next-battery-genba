import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export function TopBar({
  title,
  backTo,
  who,
}: {
  title: string;
  backTo?: string;
  who?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      {backTo ? (
        <Link
          href={backTo}
          className="-ml-1 flex min-h-11 items-center gap-0.5 pr-1 font-semibold text-primary"
        >
          <ChevronLeft className="size-5" aria-hidden />
          戻る
        </Link>
      ) : null}
      <h1 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h1>
      {who ? (
        <span className="shrink-0 text-xs text-muted-foreground">{who}</span>
      ) : null}
    </header>
  )
}
