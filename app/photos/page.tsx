import { type Metadata } from 'next'
import PhotosContent from '@/components/sections/genba/PhotosContent'
import { listPhotos, listSites } from '@/lib/genba/queries'
import { requireSession } from '@/lib/genba/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '現場写真｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function PhotosPage() {
  await requireSession()
  const [sites, photos] = await Promise.all([listSites(), listPhotos()])

  return <PhotosContent sites={sites} photos={photos} />
}
