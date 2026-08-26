'use client'

import {
  Building2,
  Camera,
  FileText,
  HandHelping,
  Images,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/material', label: '材料を頼む', icon: Camera },
  { href: '/photos', label: '現場写真', icon: Images },
  { href: '/report', label: '作業報告書', icon: FileText },
  { href: '/quote', label: 'お客様見積', icon: Receipt },
  { href: '/help', label: '応援を頼む', icon: HandHelping },
  { href: '/sites', label: '現場と履歴', icon: Building2 },
] as const

export function RichMenu() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="メニュー"
      className="sticky bottom-0 z-20 grid grid-cols-3 gap-px border-t bg-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-[76px] flex-col items-center justify-center gap-1.5',
              'bg-background text-xs font-bold transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-6" aria-hidden />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
