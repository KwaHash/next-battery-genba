import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import SitePhotosContent from '@/components/sections/genba/SitePhotosContent'
import { getSite, listPhotos } from '@/lib/genba/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '現場写真｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function SitePhotosPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params

  const site = await getSite(siteId)
  if (!site) notFound()

  const photos = await listPhotos(siteId)

  return <SitePhotosContent site={site} photos={photos} />
}
