import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// --- context providers ---
import Providers from './providers'          // wraps Supabase SessionContextProvider
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
        {/*
          1. Providers – makes the Supabase client & session available app‑wide.
          2. AuthProvider – your existing custom auth context (unchanged).
          3. SmartLayoutWrapper – keeps your responsive shell.
        */}
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
