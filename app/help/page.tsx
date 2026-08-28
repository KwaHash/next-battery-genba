import { type Metadata } from 'next'
import HelpContent from '@/components/sections/genba/HelpContent'
import { listHelpRequests, listSites } from '@/lib/genba/queries'
import { requireSession } from '@/lib/genba/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '応援を頼む｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function HelpPage() {
  await requireSession()
  const [sites, helpRequests] = await Promise.all([listSites(), listHelpRequests()])

  return <HelpContent sites={sites} helpRequests={helpRequests} />
}
