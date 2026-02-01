// src/components/layout/Sidebar.tsx
// ===================================================================
// CONTEXT-AWARE SIDEBAR WITH CLIENT REQUIREMENTS
// ===================================================================

'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useClientContext } from '@/hooks/useClientContext';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Bell,
  Users,
  FileText,
  PoundSterling,
  Shield,
  MessageSquare,
  Calendar,
  Settings,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  BookOpen,
  PieChart,
  Phone,
  Mail,
  Brain,
  ClipboardList,
  Target,
  FileCheck,
  Calculator,
  Zap,
  LineChart,
  ChevronDown,
  ChevronRight,
  Lock,
  UserCheck,
  X,
  Fingerprint,
  CheckSquare,
  Upload
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  disabled?: boolean;
  requiresClient?: boolean;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface CashFlowStats {
  totalScenarios: number;
  clientsWithAnalysis: number;
  scenariosNeedingReview: number;
  advancedAnalysisCount: number;
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar = ({ isOpen = true, onClose }: SidebarProps) => {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const { clientId, isProspect } = useClientContext();
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const lastActiveRef = useRef<HTMLElement | null>(null)
  const bodyStyleRef = useRef<{
    overflow: string
    position: string
    top: string
    width: string
    touchAction: string
  } | null>(null)
  const htmlOverflowRef = useRef<string>('')
  const scrollYRef = useRef(0)
  const lastLocationRef = useRef<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [cashFlowStats, setCashFlowStats] = useState<CashFlowStats>({
    totalScenarios: 0,
    clientsWithAnalysis: 0,
    scenariosNeedingReview: 0,
    advancedAnalysisCount: 0
  });
  const [monteCarloCount, setMonteCarloCount] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Assessment Tools': true
  });
  const isPlatformAdmin = useMemo(
    () => isPlatformAdminUser({ email: user?.email, role: user?.role }),
    [user?.email, user?.role]
  )

  // Helper to build assessment URLs with client context
  const getAssessmentUrl = (baseUrl: string): string => {
    if (!clientId) return '#';
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}clientId=${clientId}${isProspect ? '&isProspect=true' : ''}`;
  };

  // Check if assessment tool - these require client selection
  const isAssessmentTool = (href: string): boolean => {
    const assessmentRoutes = [
      '/assessments/suitability',
      '/assessments/atr',
      '/assessments/cfl',
      '/assessments/persona-assessment',
      '/assessments/personas'
    ];
    return assessmentRoutes.some(route => href.includes(route));
  };

  const ownerNavigation: NavSection[] = [
    {
      title: 'Owner Admin',
      items: [
        { name: 'Overview', href: '/admin', icon: Lock },
        { name: 'Billing & Plans', href: '/admin/billing', icon: PoundSterling }
      ]
    }
  ]

  const fullNavigation: NavSection[] = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Overview', href: '/dashboard', icon: BarChart3 },
        { name: 'Tasks', href: '/tasks', icon: CheckSquare },
        { name: 'AI Insights', href: '/dashboard/ai-insights', icon: Brain },
      ],
    },
    {
      title: 'Client Management',
      items: [
        { name: 'All Clients', href: '/clients', icon: Users },
        { name: 'Client Financials', href: '/clients/financials', icon: PoundSterling },
        { name: 'Reporting Hub', href: '/clients/reports', icon: PieChart },
        { name: 'Risk Center', href: '/risk', icon: Shield },
      ],
    },
    {
      title: 'Financial Analysis',
      items: [
        { name: 'Monte Carlo Analysis', href: '/monte-carlo', icon: LineChart },
        { name: 'Stress Testing', href: '/stress-testing', icon: AlertTriangle },
        { name: 'Cash Flow Modeling', href: '/cashflow', icon: Calculator },
        { name: 'Market Intelligence', href: '/market-intelligence', icon: TrendingUp },
      ],
    },
    {
      title: 'Assessment Tools',
      items: [
        { name: 'Assessment Dashboard', href: '/assessments/dashboard', icon: ClipboardList },
        { name: 'Suitability Assessment', href: '/assessments/suitability', icon: FileCheck, requiresClient: true },
        { name: 'ATR Questionnaire', href: '/assessments/atr', icon: Brain, requiresClient: true },
        { name: 'CFL Questionnaire', href: '/assessments/cfl', icon: Calculator, requiresClient: true },
        { name: 'Investor Persona', href: '/assessments/persona-assessment', icon: Target, requiresClient: true },
      ],
    },
    {
      title: 'Documents & Reports',
      items: [
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Reports', href: '/reports', icon: Briefcase },
        { name: 'Signatures', href: '/signatures', icon: FileCheck },
      ],
    },
    {
      title: 'Communication',
      items: [
        { name: 'Notifications', href: '/notifications', icon: Bell },
        { name: 'Communication Hub', href: '/communication', icon: MessageSquare },
      ],
    },
    {
      title: 'Compliance & Risk',
      items: [
        { name: 'Compliance Hub', href: '/compliance', icon: Shield },
        { name: 'AML/CTF', href: '/compliance/aml', icon: Fingerprint },
        { name: 'Consumer Duty', href: '/compliance/consumer-duty', icon: UserCheck },
        { name: 'Services & PROD', href: '/compliance/prod-services', icon: FileText },
        { name: 'Compliance Metrics', href: '/compliance/metrics', icon: BarChart3 },
        { name: 'Client Reviews', href: '/reviews', icon: RotateCcw },
      ],
    },
    {
      title: 'Administration',
      items: [
        { name: 'Preferences', href: '/settings', icon: Settings },
        { name: 'Bulk Setup', href: '/setup', icon: Upload },
        ...(isPlatformAdmin ? [{ name: 'Owner Admin', href: '/admin', icon: Lock }] : []),
      ],
    },
  ];

  const navigation = isPlatformAdmin ? ownerNavigation : fullNavigation

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update)
      return () => mediaQuery.removeEventListener('change', update)
    }

    mediaQuery.addListener(update)
    return () => mediaQuery.removeListener(update)
  }, [])

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      onClose?.()
    }
  }, [isMobile, onClose])

  const searchKey = searchParams?.toString() ?? ''

  useEffect(() => {
    if (!isOpen || !isMobile) return

    lastActiveRef.current = document.activeElement as HTMLElement | null
    const body = document.body
    const html = document.documentElement
    scrollYRef.current = window.scrollY
    bodyStyleRef.current = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      touchAction: body.style.touchAction
    }
    htmlOverflowRef.current = html.style.overflow

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollYRef.current}px`
    body.style.width = '100%'
    body.style.touchAction = 'none'
    html.style.overflow = 'hidden'
    sidebarRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const isShift = event.shiftKey
      const active = document.activeElement

      if (isShift && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!isShift && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      const previousStyles = bodyStyleRef.current
      if (previousStyles) {
        body.style.overflow = previousStyles.overflow
        body.style.position = previousStyles.position
        body.style.top = previousStyles.top
        body.style.width = previousStyles.width
        body.style.touchAction = previousStyles.touchAction
      }
      html.style.overflow = htmlOverflowRef.current
      window.scrollTo(0, scrollYRef.current)
      document.removeEventListener('keydown', handleKeyDown)
      lastActiveRef.current?.focus()
    }
  }, [isOpen, isMobile, onClose])

  useEffect(() => {
    if (!isMobile) return
    const locationKey = `${pathname}?${searchKey}`
    const previousKey = lastLocationRef.current
    lastLocationRef.current = locationKey

    if (!previousKey || previousKey === locationKey) return
    if (isOpen) {
      onClose?.()
    }
  }, [pathname, searchKey, isMobile, isOpen, onClose])

  // Fetch stats
  useEffect(() => {
    if (isPlatformAdmin) return
    const fetchStats = async () => {
      try {
        // Fetch cash flow stats
        const { data: scenarios } = await supabase
          .from('cash_flow_scenarios')
          .select('id, client_id, last_analysis_date')
          .not('client_id', 'is', null);

        if (scenarios) {
          const uniqueClients = new Set(scenarios.map((s: { client_id: string }) => s.client_id));
          const needingReview = scenarios.filter((s: { last_analysis_date: string | null }) => {
            if (!s.last_analysis_date) return true;
            const lastAnalysis = new Date(s.last_analysis_date);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return lastAnalysis < threeMonthsAgo;
          });

          setCashFlowStats({
            totalScenarios: scenarios.length,
            clientsWithAnalysis: uniqueClients.size,
            scenariosNeedingReview: needingReview.length,
            advancedAnalysisCount: Math.floor(scenarios.length * 0.3)
          });
        }

        // Fetch Monte Carlo count
        const { count: mcCount } = await supabase
          .from('monte_carlo_results')
          .select('*', { count: 'exact', head: true });

        setMonteCarloCount(mcCount || 0);
      } catch (error) {
        console.error('Error fetching sidebar stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [supabase, isPlatformAdmin]);

  useEffect(() => {
    if (!isPlatformAdmin) return
    setExpandedSections((prev) => ({
      ...prev,
      'Owner Admin': true
    }))
  }, [isPlatformAdmin])

  // Add counts to navigation items
  const navigationWithCounts = isPlatformAdmin
    ? navigation
    : navigation.map(section => {
        if (section.title === 'Financial Analysis') {
          return {
            ...section,
            items: section.items.map(item => {
              if (item.name === 'Monte Carlo Analysis') {
                return { ...item, count: monteCarloCount > 0 ? monteCarloCount : undefined };
              }
              if (item.name === 'Cash Flow Modeling') {
                return { ...item, count: cashFlowStats.totalScenarios > 0 ? cashFlowStats.totalScenarios : undefined };
              }
              if (item.name === 'Market Intelligence') {
                // No count for Market Intelligence - it's a real-time view
                return item;
              }
              return item;
            })
          };
        }
        return section;
      });

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeSidebar}
        aria-hidden={!isOpen}
      />
      <div
        id="primary-navigation"
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile ? true : undefined}
        aria-label="Primary navigation"
        aria-hidden={isMobile && !isOpen ? true : undefined}
        tabIndex={-1}
        ref={sidebarRef}
        className={cn(
          'fixed left-0 top-[var(--app-header-height)] w-64 bg-white border-r border-gray-200 overflow-y-auto overscroll-contain touch-pan-y z-50',
          'transform transition-transform lg:translate-x-0',
          'h-[calc(100vh-var(--app-header-height))] pb-[env(safe-area-inset-bottom)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          height: 'calc(100dvh - var(--app-header-height))',
          WebkitOverflowScrolling: 'touch'
        }}
      >
      <nav className="p-4 space-y-6">
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold text-gray-900">Menu</span>
          <button
            type="button"
            onClick={closeSidebar}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {navigationWithCounts.map((section) => {
          const isExpanded = expandedSections[section.title];

          return (
            <div key={section.title}>
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => toggleSection(section.title)}
              >
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
                {section.items.some(item => item.children) && (
                  isExpanded ? 
                    <ChevronDown className="h-3 w-3 text-gray-400" /> : 
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
              </div>
              
              {isExpanded && (
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const requiresClient = item.requiresClient || isAssessmentTool(item.href);
                    const isDisabled = requiresClient && !clientId;
                    const finalHref = requiresClient && clientId ? getAssessmentUrl(item.href) : item.href;

                    // Parse item href to get path and tab
                    const [itemPath, itemQuery] = item.href.split('?');
                    const itemTab = itemQuery ? new URLSearchParams(itemQuery).get('tab') : null;

                    // Check if this item is active - must match both path and tab (if tab exists)
                    const pathMatches = pathname === itemPath;
                    const isActive = itemTab
                      ? pathMatches && currentTab === itemTab  // Must match path AND tab
                      : pathMatches && !currentTab;             // Must match path with NO tab

                    const Icon = item.icon;

                    return (
                      <li key={item.name}>
                        {isDisabled ? (
                          <div
                            className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-400 cursor-not-allowed relative"
                            title="Please select a client first"
                          >
                            <Icon className="flex-shrink-0 mr-3 h-4 w-4 text-gray-300" />
                            <span className="truncate">{item.name}</span>
                            <Lock className="ml-auto h-3 w-3 text-gray-300" />
                          </div>
                        ) : (
                          <Link
                            href={finalHref}
                            onClick={closeSidebar}
                            className={cn(
                              'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                              isActive
                                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <Icon
                              className={cn(
                                'flex-shrink-0 mr-3 h-4 w-4',
                                isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                              )}
                            />
                            <span className="truncate">{item.name}</span>
                            {item.count && (
                              <span
                                className={cn(
                                  'ml-auto inline-block py-0.5 px-2 text-xs rounded-full',
                                  isActive
                                    ? 'bg-blue-200 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                                )}
                              >
                                {item.count}
                              </span>
                            )}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        
        {/* Client Context Indicator */}
        {!isPlatformAdmin && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {clientId ? (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-800 truncate">
                      Client Selected
                    </p>
                    {isProspect && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Prospect Mode
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (pathname?.includes('/assessments')) && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <p className="text-xs text-orange-800">
                    Select a client to access assessment tools
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
    </>
  );
};
