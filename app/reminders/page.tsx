import { type Metadata } from 'next'
import RemindersContent from '@/components/sections/genba/RemindersContent'
import { getSettings } from '@/lib/genba/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '通知の設定｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function RemindersPage() {
  const settings = await getSettings()

  return <RemindersContent settings={settings} />
}
