// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

// Context providers
import Providers from './providers'
import { AuthProvider } from '@/hooks/useAuth'
import { SmartLayoutWrapper } from '@/components/layout/SmartLayoutWrapper'
import { EnvironmentBanner } from '@/components/layout/EnvironmentBanner'

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
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://www.plannetic.com'), // Updated to www
  openGraph: {
    title: 'Plannetic - Turning Plans into Performance',
    description: 'Professional Financial Advisory Platform for strategic planning and performance optimization',
    type: 'website',
    locale: 'en_GB',
    siteName: 'Plannetic',
    images: [
      {
        url: '/logo.png', // Using your actual logo file
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
    images: ['/logo.png'], // Using your actual logo file
  },
  robots: {
    index: true, // Changed to true for production
    follow: true, // Changed to true for production
    noarchive: false,
    nosnippet: false,
    noimageindex: false,
    nocache: false,
  },
}

// VIEWPORT - Plannetic brand color (teal)
export const viewport: Viewport = {
  themeColor: '#14b8a6', // Updated to match your teal branding
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
      <body className="h-full font-sans">
        <EnvironmentBanner />
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
