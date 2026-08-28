import { type Metadata } from 'next'
import SitesContent from '@/components/sections/genba/SitesContent'
import { listPhotos, listRequests, listSites } from '@/lib/genba/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '現場と履歴｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function SitesPage() {
  const [sites, requests, photos] = await Promise.all([
    listSites(),
    listRequests(),
    listPhotos(),
  ])

  return <SitesContent sites={sites} requests={requests} photos={photos} />
}
