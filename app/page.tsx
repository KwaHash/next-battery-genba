import { type Metadata } from 'next'
import HomeContent from '@/components/sections/genba/HomeContent'
import { buildNotices, getHomeData } from '@/lib/genba/queries'
import { requireSession } from '@/lib/genba/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '今日の作業｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function HomePage() {
  const session = await requireSession()
  const data = await getHomeData(session.tenantId)

  return <HomeContent data={data} notices={buildNotices(data.requests)} />
}
