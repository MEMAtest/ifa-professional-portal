// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// Context providers
import Providers from './providers'
import { AuthProvider } from '@/hooks/useAuth'
import { SmartLayoutWrapper } from '@/components/layout/SmartLayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

// METADATA - Updated for Plannetic
export const metadata: Metadata = {
  title: 'Plannetic - Turning Plans into Performance',
  description: 'Professional Financial Advisory Platform - Strategic planning and performance optimization for financial advisors',
  keywords: [
    'financial planning',
    'advisory platform',
    'cash flow modeling',
    'retirement planning',
    'risk assessment',
    'Monte Carlo analysis',
    'strategic planning',
    'performance optimization'
  ],
  authors: [{ name: 'Plannetic Team' }],
  creator: 'Plannetic',
  publisher: 'Plannetic',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://plannetic.com'),
  openGraph: {
    title: 'Plannetic - Turning Plans into Performance',
    description: 'Professional Financial Advisory Platform for strategic planning and performance optimization',
    type: 'website',
    locale: 'en_GB',
    siteName: 'Plannetic',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Plannetic - Turning Plans into Performance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plannetic - Professional Financial Advisory Platform',
    description: 'Turning Plans into Performance - Strategic planning and optimization for financial advisors',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: false,
    noimageindex: true,
    nocache: false,
  },
}

// VIEWPORT - Plannetic brand color (turquoise)
export const viewport: Viewport = {
  themeColor: '#00CED1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// ROOT LAYOUT
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <Providers>
          <AuthProvider>
            <SmartLayoutWrapper>
              {children}
            </SmartLayoutWrapper>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}