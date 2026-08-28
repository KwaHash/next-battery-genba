import { type Metadata } from 'next'
import QuoteContent from '@/components/sections/genba/QuoteContent'
import { listRequests, listSites } from '@/lib/genba/queries'
import { requireSession } from '@/lib/genba/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'お客様への見積｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function QuotePage() {
  const session = await requireSession()
  const [sites, requests] = await Promise.all([listSites(), listRequests()])

  return <QuoteContent sites={sites} requests={requests} issuer={session.actor} />
}
