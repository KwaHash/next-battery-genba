'use client'

import { usePathname } from 'next/navigation'
import { OfflineBar } from '@/components/genba/offline-bar'
import { RichMenu } from '@/components/genba/rich-menu'

const AUTH_PATHS = ['/login', '/auth']

const FRAME =
  'device-frame min-h-dvh shadow-xl sm:my-5 sm:min-h-[calc(100dvh-2.5rem)]'
  + ' sm:rounded-2xl sm:border'

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path))

  if (isAuthPage) {
    return <div className={FRAME}>{children}</div>
  }

  return (
    <div className={FRAME}>
      <OfflineBar />
      <main className="flex flex-1 flex-col">{children}</main>
      <RichMenu />
    </div>
  )
}
