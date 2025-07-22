// File: src/components/layout/Header.tsx
// FINAL CORRECTED VERSION
'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { 
  LogOut, 
  Search, 
  Bell, 
  Settings, 
  Home, 
  ChevronRight, 
  Users, 
  FileText, 
  BarChart3,
  Briefcase,
  PoundSterling,
  Shield,
  User,
  ChevronDown,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

export const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
  }

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname?.split('/').filter(Boolean) || []
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard', icon: Home }
    ]

    if (segments.length === 0 || segments[0] === 'dashboard') {
      return [{ label: 'Dashboard', icon: Home }]
    }

    switch (segments[0]) {
      case 'clients':
        breadcrumbs.push({ label: 'Clients', href: '/clients', icon: Users })
        if (segments[1] && segments[1] !== 'new' && segments[1] !== 'migrate' && segments[1] !== 'migration') {
          breadcrumbs.push({ label: `Client Details`, href: `/clients/${segments[1]}` })
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
            'cfl': 'Cash Flow Analysis',
            'personas': 'Investor Personas',
            'persona-assessment': 'Persona Assessment'
          }
          breadcrumbs.push({ 
            label: assessmentTypes[segments[1]] || segments[1],
            href: `/assessments/${segments[1]}`
          })
        }
        break
      case 'documents':
        breadcrumbs.push({ label: 'Documents', href: '/documents', icon: Briefcase })
        break
      case 'reports':
        breadcrumbs.push({ label: 'Reports', href: '/reports', icon: BarChart3 })
        break
      case 'settings':
        breadcrumbs.push({ label: 'Settings', href: '/settings', icon: Settings })
        break
      case 'cashflow':
        breadcrumbs.push({ label: 'Cash Flow Modeling', href: '/cashflow', icon: PoundSterling })
        break
      case 'risk':
        breadcrumbs.push({ label: 'Risk Profiling', href: '/risk', icon: Shield })
        break
      case 'compliance':
        breadcrumbs.push({ label: 'Compliance', href: '/compliance' })
        if (segments[1]) {
          const complianceTypes: Record<string, string> = {
            'vulnerable': 'Vulnerable Clients',
            'reviews': 'Review Schedule',
            'audit': 'Audit Trail'
          }
          breadcrumbs.push({ 
            label: complianceTypes[segments[1]] || segments[1],
            href: `/compliance/${segments[1]}`
          })
        }
        break
      default:
        const label = segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
        breadcrumbs.push({ label, href: `/${segments[0]}` })
    }
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <img 
              src="/plannetic-icon.png"
              alt="Plannetic Logo" 
              className="h-8 w-8"
            />
            <h1 className="text-xl font-bold text-blue-600">Plannetic</h1>
          </Link>
          
          {breadcrumbs.length > 1 && (
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
          )}
        </div>

        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search clients, assessments, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 flex-shrink-0">
          {pathname !== '/dashboard' && (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          )}

          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md">
            <Bell className="h-5 w-5" />
          </button>

          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md">
            <Settings className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
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