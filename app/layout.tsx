import '@/styles/globals.scss'
import HolyLoader from 'holy-loader'
import { type Metadata, type Viewport } from 'next'
import Providers from './providers'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import { Toaster } from '@/components/ui/sonner'
import { env } from '@/lib/config'
import { notoSansJP } from '@/lib/fonts'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_HOST),
  title: '現場アシスト',
  applicationName: '現場アシスト',
  description: '工事会社が毎日開く画面。材料の相談・現場写真・作業報告書・見積・応援依頼を、写真1枚から進めます。',
  robots: { index: false, follow: false },
  openGraph: {
    title: '現場アシスト',
    siteName: '現場アシスト',
    description: '工事会社が毎日開く画面',
    type: 'website',
  },
  icons: [
    { rel: 'icon', url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJP.className} ${notoSansJP.variable}`}>
        <HolyLoader color="hsl(25 100% 50%)" height="2px" easing="linear" />
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
