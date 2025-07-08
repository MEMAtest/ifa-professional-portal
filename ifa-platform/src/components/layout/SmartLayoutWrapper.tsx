// ================================================================
// 1. NEW FILE: src/components/layout/SmartLayoutWrapper.tsx
// ================================================================

'use client'
import { createContext } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { LoginForm } from '@/components/auth/LoginForm'

// Create context to signal that root layout is providing the layout
export const LayoutContext = createContext(false)

interface SmartLayoutWrapperProps {
  children: React.ReactNode
}

export const SmartLayoutWrapper: React.FC<SmartLayoutWrapperProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  
  // Define pages that don't need layout
  const isPublicPage = pathname === '/login' || pathname === '/'
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  // Show public pages without layout
  if (!user || isPublicPage) {
    return <>{children}</>
  }
  
  // For authenticated pages, provide persistent layout
  return (
    <LayoutContext.Provider value={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Sidebar />
        <main className="ml-64 pt-16">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </LayoutContext.Provider>
  )
}
