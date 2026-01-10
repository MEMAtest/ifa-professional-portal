// ================================================================
// 1. NEW FILE: src/components/layout/SmartLayoutWrapper.tsx
// ================================================================

'use client'
import { createContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformAdminEmail } from '@/lib/auth/platformAdmin'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { LoginForm } from '@/components/auth/LoginForm'
import { NotificationsProvider } from '@/components/notifications/NotificationsProvider'

// Create context to signal that root layout is providing the layout
export const LayoutContext = createContext(false)

interface SmartLayoutWrapperProps {
  children: React.ReactNode
}

export const SmartLayoutWrapper: React.FC<SmartLayoutWrapperProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isPlatformAdmin = isPlatformAdminEmail(user?.email)
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/')

  // Hooks must be called unconditionally at the top
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  // Define pages that don't need layout (public/client-facing pages)
  const isPublicPage = pathname === '/login' ||
                       pathname === '/' ||
                       pathname === '/marketing' ||
                       pathname.startsWith('/marketing/') ||
                       pathname === '/privacy' ||
                       pathname === '/terms' ||
                       pathname === '/gdpr' ||
                       pathname === '/about' ||
                       pathname === '/contact' ||
                       pathname === '/blog' ||
                       pathname.startsWith('/blog/') ||
                       pathname.startsWith('/client/')

  useEffect(() => {
    if (!user || !isPlatformAdmin) return
    if (isAdminRoute) return
    router.replace('/admin')
  }, [user, isPlatformAdmin, isAdminRoute, router])

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

  return (
    <LayoutContext.Provider value={true}>
      <NotificationsProvider>
        <div className="min-h-screen bg-gray-50">
          <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} sidebarId="primary-navigation" />
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          <main className="pt-[var(--app-header-height)] lg:ml-64">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </NotificationsProvider>
    </LayoutContext.Provider>
  )
}
