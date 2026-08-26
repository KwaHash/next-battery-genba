'use client'

import { useEffect, useState, useTransition } from 'react'
import { WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { flushPendingRequests } from '@/lib/genba/actions'

export function OfflineBar() {
  const [offline, setOffline] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    function flush() {
      startTransition(async () => {
        const result = await flushPendingRequests()
        if (result.ok && result.data.sent > 0) {
          toast.success(`${result.data.sent} 件を送りました`)
          router.refresh()
        }
      })
    }

    function goOnline() {
      setOffline(false)
      flush()
    }
    function goOffline() {
      setOffline(true)
    }

    setOffline(!navigator.onLine)
    if (navigator.onLine) flush()

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [router])

  if (!offline) return null

  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-warning px-4 py-2 text-sm font-bold text-warning-foreground"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      電波がありません。押した内容は保存され、戻ったら送ります
    </div>
  )
}
