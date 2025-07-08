// ================================================================
// 2. UPDATED FILE: src/app/layout.tsx
// ================================================================

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { SmartLayoutWrapper } from '@/components/layout/SmartLayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IFA Platform Pro',
  description: 'Professional Financial Advisory Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SmartLayoutWrapper>
            {children}
          </SmartLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}