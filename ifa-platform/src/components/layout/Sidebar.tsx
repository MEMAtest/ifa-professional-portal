'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
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
  LineChart  // Add icon for Monte Carlo
} from 'lucide-react'
import { supabase } from '@/lib/supabase';

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface CashFlowStats {
  totalScenarios: number;
  clientsWithAnalysis: number;
  scenariosNeedingReview: number;
  advancedAnalysisCount: number;
}

const navigation: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Overview', href: '/dashboard', icon: BarChart3 },
      // Change these routes to existing ones:
{ name: 'AI Insights', href: '/dashboard', icon: PieChart }, // Changed from /insights
{ name: 'Risk Profiling', href: '/assessments/atr', icon: Shield }, // Point to ATR instead of /risk
    ],
  },
  {
    title: 'Client Management',
    items: [
      { name: 'All Clients', href: '/clients', icon: Users },
      { name: 'Suitability Assessments', href: '/assessments', icon: FileText },
      { name: 'Risk Management', href: '/risk', icon: Shield },
    ],
  },
  {
    title: 'Financial Analysis',
    items: [
      { name: 'Monte Carlo Analysis', href: '/monte-carlo', icon: LineChart },
      { name: 'Cash Flow Modeling', href: '/cashflow', icon: Calculator },
      { name: 'Advanced Analytics', href: '/cashflow/advanced-analytics', icon: Zap },
    ],
  },
  {
    title: 'Assessment Tools',
    items: [
      { name: 'Assessment Dashboard', href: '/assessments/dashboard', icon: ClipboardList },
      { name: 'Suitability Assessment', href: '/assessments/suitability', icon: FileCheck },
      { name: 'Risk Assessment (ATR)', href: '/assessments/atr', icon: Brain },
      { name: 'Risk Assessment (CFL)', href: '/assessments/cfl', icon: Calculator },
      { name: 'Investor Personas', href: '/assessments/personas', icon: Target },
    ],
  },
  {
    title: 'Documents & Reports',
    items: [
      { name: 'Document Vault', href: '/documents', icon: Briefcase },
      { name: 'Reports', href: '/reports', icon: BookOpen },
    ],
  },
  {
    title: 'Communications',
    items: [
      { name: 'Inbox', href: '/inbox', icon: Mail },
      { name: 'Messages', href: '/messages', icon: MessageSquare },
      { name: 'Calls', href: '/calls', icon: Phone },
      { name: 'Calendar', href: '/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Reviews & Compliance',
    items: [
      { name: 'Client Reviews', href: '/reviews', icon: CheckCircle },
      { name: 'Compliance', href: '/compliance', icon: AlertTriangle },
      { name: 'Rebalancing', href: '/rebalancing', icon: RotateCcw },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [cashFlowStats, setCashFlowStats] = useState<CashFlowStats>({
    totalScenarios: 0,
    clientsWithAnalysis: 0,
    scenariosNeedingReview: 0,
    advancedAnalysisCount: 0
  })
  const [monteCarloCount, setMonteCarloCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      // Load Cash Flow stats
      const { count: totalScenarios } = await supabase
        .from('cash_flow_scenarios')
        .select('id', { count: 'exact' })
        .eq('isActive', true);

      const { data: clientsData } = await supabase
        .from('cash_flow_scenarios')
        .select('client_id')
        .eq('isActive', true);
      
      const uniqueClients = new Set(clientsData?.map(s => s.client_id) || []).size;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: staleScenarios } = await supabase
        .from('cash_flow_scenarios')
        .select('id', { count: 'exact' })
        .eq('isActive', true)
        .lt('lastAssumptionsReview', thirtyDaysAgo.toISOString());

      // Load Monte Carlo count
      const { count: monteCarloTotal } = await supabase
        .from('monte_carlo_results')
        .select('id', { count: 'exact' });

      setCashFlowStats({
        totalScenarios: totalScenarios || 0,
        clientsWithAnalysis: uniqueClients,
        scenariosNeedingReview: staleScenarios || 0,
        advancedAnalysisCount: 0
      });

      setMonteCarloCount(monteCarloTotal || 0);

    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  // Add counts to navigation items
  const navigationWithCounts = navigation.map(section => {
    if (section.title === 'Financial Analysis') {
      return {
        ...section,
        items: section.items.map(item => {
          if (item.name === 'Monte Carlo Analysis') {
            return {
              ...item,
              count: monteCarloCount > 0 ? monteCarloCount : undefined
            };
          }
          if (item.name === 'Cash Flow Modeling') {
            return {
              ...item,
              count: cashFlowStats.totalScenarios > 0 ? cashFlowStats.totalScenarios : undefined
            };
          }
          if (item.name === 'Advanced Analytics') {
            return {
              ...item,
              count: cashFlowStats.advancedAnalysisCount > 0 ? cashFlowStats.advancedAnalysisCount : undefined
            };
          }
          return item;
        })
      };
    }
    return section;
  });

  return (
    <div className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-6">
        {navigationWithCounts.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
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
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        
        {/* Stats Summary */}
        {!loading && !error && (cashFlowStats.totalScenarios > 0 || monteCarloCount > 0) && (
          <div className="border-t pt-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Analysis Summary</h4>
              <div className="space-y-1 text-xs text-blue-700">
                {monteCarloCount > 0 && (
                  <div className="flex justify-between">
                    <span>Monte Carlo Runs:</span>
                    <span className="font-medium">{monteCarloCount}</span>
                  </div>
                )}
                {cashFlowStats.totalScenarios > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Cash Flow Scenarios:</span>
                      <span className="font-medium">{cashFlowStats.totalScenarios}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clients Analyzed:</span>
                      <span className="font-medium">{cashFlowStats.clientsWithAnalysis}</span>
                    </div>
                  </>
                )}
                {cashFlowStats.scenariosNeedingReview > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Need Review:</span>
                    <span className="font-medium">{cashFlowStats.scenariosNeedingReview}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}