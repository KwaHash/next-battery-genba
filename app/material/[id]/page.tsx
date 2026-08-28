import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import MaterialDetailContent from '@/components/sections/genba/MaterialDetailContent'
import { getRequest, getSite } from '@/lib/genba/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '相談の内容｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params
  const request = await getRequest(id)
  if (!request) notFound()

  const site = request.site_id ? await getSite(request.site_id) : null

  return <MaterialDetailContent request={request} site={site} />
}
