import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  themeColor: '#050505',
}

export const metadata: Metadata = {
  title: 'Utrip - あなただけのキャリア特性プロファイル',
  description: '旅行中の行動データと感情記録から、あなたのキャリア特性を分析します。',
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Utrip',
    statusBarStyle: 'black-translucent',
    capable: true,
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
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#fff',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)'
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
