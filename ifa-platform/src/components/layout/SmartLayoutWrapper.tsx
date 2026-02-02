// ================================================================
// 1. NEW FILE: src/components/layout/SmartLayoutWrapper.tsx
// ================================================================

'use client'
import { createContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFirm } from '@/modules/firm/hooks/useFirm'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
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
  const isPlatformAdmin = isPlatformAdminUser({ email: user?.email, role: user?.role })
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/')
  const shouldRedirectToAdmin = Boolean(user && isPlatformAdmin && !isAdminRoute)

  // Hooks must be called unconditionally at the top
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  // Define pages that don't need layout (public/client-facing pages + onboarding)
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
                       pathname.startsWith('/client/') ||
                       pathname === '/onboarding'

  // Fetch firm data to check onboarding status
  const { firm } = useFirm()
  const isOnboardingRoute = pathname === '/onboarding'

  // Check if admin user needs onboarding redirect
  const firmSettings = firm?.settings as any
  const onboardingCompleted = firmSettings?.onboarding?.completed === true
  const isAdminUser = user?.role === 'admin'
  const shouldRedirectToOnboarding = Boolean(
    user && isAdminUser && !isPlatformAdmin && !onboardingCompleted && !isOnboardingRoute && !isPublicPage
  )

  useEffect(() => {
    if (!shouldRedirectToAdmin) return
    router.replace('/admin')
  }, [shouldRedirectToAdmin, router])

  useEffect(() => {
    if (!shouldRedirectToOnboarding) return
    router.replace('/onboarding')
  }, [shouldRedirectToOnboarding, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (shouldRedirectToAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-600">Redirecting to Owner Admin...</p>
        </div>
      </div>
    )
  }

  // Show public pages without layout
  if (!user || isPublicPage) {
    return <>{children}</>
  }

  const layout = (
    <div className="min-h-screen bg-gray-50">
      <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} sidebarId="primary-navigation" />
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <main className="pt-[var(--app-header-height)] lg:ml-64">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  )

  return (
    <LayoutContext.Provider value={true}>
      {isPlatformAdmin ? layout : <NotificationsProvider>{layout}</NotificationsProvider>}
    </LayoutContext.Provider>
  )
}
