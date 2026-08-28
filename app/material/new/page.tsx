import { type Metadata } from 'next'
import MaterialNewContent from '@/components/sections/genba/MaterialNewContent'
import { listProducts, listSites } from '@/lib/genba/queries'
import { requireSession } from '@/lib/genba/tenant'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '写真を送る｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function MaterialNewPage() {
  await requireSession()
  const [products, sites] = await Promise.all([listProducts(), listSites()])

  return <MaterialNewContent products={products} sites={sites} />
}
