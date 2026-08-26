import { type Metadata } from 'next'
import LoginContent from '@/components/sections/auth/LoginContent'

export const metadata: Metadata = {
  title: 'サインイン｜現場アシスト',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  return <LoginContent />
}
