// File: src/app/layout.tsx
// FINAL CORRECTED VERSION with viewport export
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// --- context providers ---
import Providers from './providers'
import { AuthProvider } from '@/hooks/useAuth'
import { SmartLayoutWrapper } from '@/components/layout/SmartLayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

// METADATA
export const metadata: Metadata = {
  title: 'Plannetic',
  description: 'Strategic Planning in Motion - Professional Financial Advisory Platform',
  keywords: ['financial planning', 'advisory', 'cash flow modeling', 'retirement planning', 'risk assessment'],
  authors: [{ name: 'Plannetic Team' }],
  creator: 'Plannetic',
  publisher: 'Plannetic',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://plannetic.com'),
  openGraph: {
    title: 'Plannetic - Strategic Planning in Motion',
    description: 'Professional Financial Advisory Platform for strategic planning and performance optimization',
    type: 'website',
    locale: 'en_GB',
    siteName: 'Plannetic',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plannetic',
    description: 'Strategic Planning in Motion - Professional Financial Advisory Platform',
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

// VIEWPORT (New export to fix theme-color warning)
export const viewport: Viewport = {
  themeColor: '#2563eb',
}

// ROOT LAYOUT
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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