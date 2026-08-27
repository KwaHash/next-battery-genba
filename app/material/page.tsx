import { type Metadata } from 'next'
import MaterialListContent from '@/components/sections/genba/MaterialListContent'
import { listRequests, listSites } from '@/lib/genba/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '材料を頼む｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function MaterialPage() {
  const [requests, sites] = await Promise.all([listRequests(), listSites()])

  return <MaterialListContent requests={requests} sites={sites} />
}
