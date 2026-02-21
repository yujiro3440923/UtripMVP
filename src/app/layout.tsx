import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/providers/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Utrip - あなただけのキャリア特性プロファイル',
  description: '旅行中の行動データと感情記録から、あなたのキャリア特性を分析します。',
  appleWebApp: {
    title: 'Utrip',
    statusBarStyle: 'black-translucent',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-neutral-950 text-white antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
