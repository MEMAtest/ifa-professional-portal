// File: src/components/layout/Header.tsx
// Updated version with Plannetic Logo component and Global Search
'use client'
import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformAdminEmail } from '@/lib/auth/platformAdmin'
import { Logo } from '@/components/ui/Logo'
import {
  LogOut,
  Settings,
  Home,
  Bell,
  ChevronRight,
  Users,
  FileText,
  BarChart3,
  Briefcase,
  PoundSterling,
  Shield,
  User,
  ChevronDown,
  HelpCircle,
  Lock,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/notifications'
import { GlobalSearchInput } from '@/components/search'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface HeaderProps {
  onToggleSidebar?: () => void
  isSidebarOpen?: boolean
  sidebarId?: string
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen, sidebarId }) => {
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isPlatformAdmin = isPlatformAdminEmail(user?.email)

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
  }

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname?.split('/').filter(Boolean) || []
    const returnTo = searchParams?.get('returnTo') || searchParams?.get('from')
    const clientId = searchParams?.get('clientId')
    const assessmentId = searchParams?.get('assessmentId')
    if (isPlatformAdmin) {
      const breadcrumbs: BreadcrumbItem[] = [
        { label: 'Owner Admin', href: '/admin', icon: Lock }
      ]

      if (segments[0] === 'admin') {
        if (segments[1] === 'billing') {
          breadcrumbs.push({ label: 'Billing & Plans' })
        } else if (segments[1] === 'firms') {
          breadcrumbs.push({ label: 'Firms' })
          if (segments[2]) {
            breadcrumbs.push({ label: 'Firm Details' })
          }
        } else if (segments[1]) {
          breadcrumbs.push({ label: segments[1].charAt(0).toUpperCase() + segments[1].slice(1) })
        }
      }

      return breadcrumbs
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard', icon: Home }
    ]

    if (segments.length === 0) {
      return [{ label: 'Dashboard', icon: Home }]
    }

    if (segments[0] === 'dashboard') {
      if (segments[1] === 'ai-insights') {
        return [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
          { label: 'AI Insights' }
        ]
      }
      return [{ label: 'Dashboard', icon: Home }]
    }

    switch (segments[0]) {
      case 'clients':
        breadcrumbs.push({ label: 'Clients', href: '/clients', icon: Users })
        if (segments[1] === 'reports') {
          breadcrumbs.push({ label: 'Reporting Hub', href: '/clients/reports' })
        } else if (segments[1] === 'financials') {
          breadcrumbs.push({ label: 'Client Financials' })
        } else if (segments[1] && segments[1] !== 'new' && segments[1] !== 'migrate' && segments[1] !== 'migration') {
          breadcrumbs.push({ label: 'Client Details', href: `/clients/${segments[1]}` })
          if (segments[2] === 'edit') {
            breadcrumbs.push({ label: 'Edit Client' })
          }
        } else if (segments[1] === 'new') {
          breadcrumbs.push({ label: 'New Client' })
        } else if (segments[1] === 'migrate' || segments[1] === 'migration') {
          breadcrumbs.push({ label: 'Client Migration' })
        }
        break
      case 'assessments':
        breadcrumbs.push({ label: 'Assessments', href: '/assessments', icon: FileText })
        if (segments[1]) {
          const assessmentTypes: Record<string, string> = {
            'suitability': 'Suitability Assessment',
            'atr': 'Risk Assessment (ATR)',
            'cfl': 'Capacity for Loss',
            'personas': 'Investor Personas',
            'persona-assessment': 'Persona Assessment',
            'dashboard': 'Assessment Dashboard'
          }
          if (segments[1] === 'suitability' && segments[2] === 'results') {
            breadcrumbs.push({ label: 'Suitability Results' })
          } else if (segments[1] === 'suitability' && returnTo === 'results' && clientId && segments[2] !== 'results') {
            const params = new URLSearchParams()
            if (assessmentId) params.set('assessmentId', assessmentId)
            const query = params.toString()
            breadcrumbs.push({
              label: 'Suitability Results',
              href: `/assessments/suitability/results/${clientId}${query ? `?${query}` : ''}`
            })
            breadcrumbs.push({ label: assessmentTypes[segments[1]] || segments[1] })
          } else {
            breadcrumbs.push({
              label: assessmentTypes[segments[1]] || segments[1],
              href: `/assessments/${segments[1]}`
            })
            // Handle results sub-page
            if (segments[2] === 'results') {
              breadcrumbs.push({ label: 'Results' })
            }
          }
        }
        break
      case 'documents':
        breadcrumbs.push({ label: 'Documents', href: '/documents', icon: Briefcase })
        if (segments[1]) {
          const docTypes: Record<string, string> = {
            'analytics': 'Document Analytics',
            'status': 'Document Status',
            'view': 'View Document'
          }
          if (docTypes[segments[1]]) {
            breadcrumbs.push({ label: docTypes[segments[1]] })
          }
        }
        break
      case 'reports':
        breadcrumbs.push({ label: 'Reports', href: '/reports', icon: BarChart3 })
        break
      case 'settings':
        breadcrumbs.push({ label: 'Settings', href: '/settings', icon: Settings })
        break
      case 'notifications':
        breadcrumbs.push({ label: 'Notifications', href: '/notifications', icon: Bell })
        break
      case 'cashflow':
        breadcrumbs.push({ label: 'Cash Flow Modeling', href: '/cashflow', icon: PoundSterling })
        if (segments[1] === 'scenarios' && segments[2]) {
          breadcrumbs.push({ label: 'Scenario Details' })
        }
        break
      case 'risk':
        breadcrumbs.push({ label: 'Risk Profiling', href: '/risk', icon: Shield })
        break
      case 'compliance':
        breadcrumbs.push({ label: 'Compliance Hub', href: '/compliance', icon: Shield })
        if (segments[1]) {
          const complianceTypes: Record<string, string> = {
            'aml': 'AML/CTF',
            'consumer-duty': 'Consumer Duty',
            'prod-services': 'Services & PROD',
            'metrics': 'Compliance Metrics',
            'vulnerable': 'Vulnerable Clients',
            'reviews': 'Client Reviews',
            'audit': 'Audit Trail'
          }
          breadcrumbs.push({
            label: complianceTypes[segments[1]] || segments[1].charAt(0).toUpperCase() + segments[1].slice(1).replace(/-/g, ' '),
            href: `/compliance/${segments[1]}`
          })
        }
        break
      case 'reviews':
        breadcrumbs.push({ label: 'Compliance Hub', href: '/compliance', icon: Shield })
        breadcrumbs.push({ label: 'Client Reviews' })
        break
      case 'monte-carlo':
        breadcrumbs.push({ label: 'Monte Carlo Analysis', href: '/monte-carlo', icon: BarChart3 })
        break
      case 'stress-testing':
        breadcrumbs.push({ label: 'Stress Testing', href: '/stress-testing', icon: Shield })
        break
      case 'market-intelligence':
        breadcrumbs.push({ label: 'Market Intelligence', href: '/market-intelligence', icon: BarChart3 })
        break
      case 'communication':
        breadcrumbs.push({ label: 'Communication Hub', href: '/communication', icon: Bell })
        break
      case 'calendar':
        breadcrumbs.push({ label: 'Calendar', href: '/calendar' })
        break
      case 'signatures':
        breadcrumbs.push({ label: 'Signatures', href: '/signatures', icon: FileText })
        break
      default:
        const label = segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
        breadcrumbs.push({ label, href: `/${segments[0]}` })
    }
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  const homeHref = isPlatformAdmin ? '/admin' : '/dashboard'
  const homeLabel = isPlatformAdmin ? 'Owner Admin' : 'Dashboard'
  const showHomeButton = isPlatformAdmin
    ? !pathname?.startsWith('/admin')
    : pathname !== '/dashboard'

  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--app-header-height)] pt-[env(safe-area-inset-top)] bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onToggleSidebar?.()}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Open navigation menu"
            aria-expanded={isSidebarOpen}
            aria-controls={sidebarId}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Use Logo component instead of hardcoded image */}
          <Logo variant="full" className="flex-shrink-0" />
          
          {breadcrumbs.length > 1 && (
            <>
              {/* Mobile: Show current page only */}
              <nav className="flex md:hidden items-center text-sm min-w-0 flex-1">
                <span className="text-gray-900 font-medium truncate">
                  {breadcrumbs[breadcrumbs.length - 1].label}
                </span>
              </nav>
              {/* Desktop: Full breadcrumb trail */}
              <nav className="hidden md:flex items-center space-x-2 text-sm min-w-0 flex-1">
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  const Icon = item.icon
                  return (
                    <div key={index} className="flex items-center min-w-0">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
                      )}
                      {item.href && !isLast ? (
                        <Link
                          href={item.href}
                          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors min-w-0"
                        >
                          {Icon && index === 0 && <Icon className="h-4 w-4 flex-shrink-0" />}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ) : (
                        <span className={cn(
                          "flex items-center gap-1.5 min-w-0",
                          isLast ? "text-gray-900 font-medium" : "text-gray-500"
                        )}>
                          {Icon && index === 0 && <Icon className="h-4 w-4 flex-shrink-0" />}
                          <span className="truncate">{item.label}</span>
                        </span>
                      )}
                    </div>
                  )
                })}
              </nav>
            </>
          )}
        </div>

        {!isPlatformAdmin && (
          <div className="hidden lg:block flex-1 max-w-lg mx-6">
            <GlobalSearchInput />
          </div>
        )}

        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {showHomeButton && (
            <Link
              href={homeHref}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Home className="h-4 w-4" />
              {homeLabel}
            </Link>
          )}

          <NotificationBell />

          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md">
            <Settings className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <div className="h-8 w-8 bg-plannetic-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                userMenuOpen && "rotate-180"
              )} />
            </button>

            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 z-20 rounded-xl shadow-lg overflow-hidden"
                     style={{
                       background: 'rgba(255, 255, 255, 0.85)',
                       backdropFilter: 'blur(12px)',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                     }}>
                  <div className="px-4 py-3 border-b border-white/20">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile Settings
                    </Link>
                    <Link
                      href="/settings/preferences"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Preferences
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <HelpCircle className="h-4 w-4 mr-3" />
                      Help & Support
                    </Link>
                    <div className="border-t border-white/20 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
