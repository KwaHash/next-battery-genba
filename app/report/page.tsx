import { type Metadata } from 'next'
import ReportContent from '@/components/sections/genba/ReportContent'
import { listPhotos, listRequests, listSites } from '@/lib/genba/queries'
import { requireSession } from '@/lib/genba/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '作業報告書｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function ReportPage() {
  const session = await requireSession()
  const [sites, photos, requests] = await Promise.all([
    listSites(),
    listPhotos(),
    listRequests(),
  ])

  return (
    <ReportContent
      sites={sites}
      photos={photos}
      requests={requests}
      reporter={session.actor}
    />
  )
}
