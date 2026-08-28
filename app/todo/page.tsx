import { type Metadata } from 'next'
import TodoContent from '@/components/sections/genba/TodoContent'
import { listSites, listTodos } from '@/lib/genba/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'やること｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function TodoPage() {
  const [todos, sites] = await Promise.all([listTodos(), listSites()])

  return <TodoContent todos={todos} sites={sites} />
}
