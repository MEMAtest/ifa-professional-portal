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
  Zap  // ADD: Advanced Analytics icon
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

// ADD: Cash flow statistics tracking
interface CashFlowStats {
  totalScenarios: number;
  clientsWithAnalysis: number;
  scenariosNeedingReview: number;
  advancedAnalysisCount: number; // NEW: Track advanced analytics runs
}

// UPDATE: Your existing navigation with Advanced Analytics added
const navigation: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { name: 'Overview', href: '/dashboard', icon: BarChart3 },
      { name: 'Analytics', href: '/analytics', icon: TrendingUp },
      { name: 'AI Insights', href: '/insights', icon: PieChart },
    ],
  },
  {
    title: 'Client Management',
    items: [
      { name: 'All Clients', href: '/clients', icon: Users, count: 5 },
      { name: 'Suitability Assessments', href: '/assessments', icon: FileText },
      { name: 'Cash Flow Modeling', href: '/cashflow', icon: Calculator },
      { name: 'Advanced Analytics', href: '/cashflow/advanced-analytics', icon: Zap }, // NEW: Advanced Analytics
      { name: 'Risk Profiling', href: '/risk', icon: Shield },
    ],
  },
  {
    title: 'Assessment Tools',
    items: [
      { name: 'Assessment Dashboard', href: '/assessments', icon: ClipboardList },
      { name: 'Suitability Assessment', href: '/assessments/suitability', icon: FileCheck },
      { name: 'Risk Assessment (ATR)', href: '/assessments/atr', icon: Brain },
      { name: 'Investor Personas', href: '/assessments/personas', icon: Target },
    ],
  },
  {
    title: 'Documents & Reports',
    items: [
      { name: 'Document Vault', href: '/documents', icon: Briefcase },
      { name: 'Reports', href: '/reports', icon: BookOpen },
      { name: 'Digital Signatures', href: '/signatures', icon: CheckCircle },
    ],
  },
  {
    title: 'Communications',
    items: [
      { name: 'Email Hub', href: '/communications/email', icon: Mail },
      { name: 'Call Logs', href: '/communications/calls', icon: Phone },
      { name: 'Meetings', href: '/communications/meetings', icon: Calendar },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { name: 'Compliance Dashboard', href: '/compliance', icon: CheckCircle },
      { name: 'Vulnerable Clients', href: '/compliance/vulnerable', icon: AlertTriangle, count: 2 },
      { name: 'Review Schedule', href: '/compliance/reviews', icon: RotateCcw },
      { name: 'Audit Trail', href: '/compliance/audit', icon: BookOpen },
    ],
  },
  {
    title: 'Market Data',
    items: [
      { name: 'Live Prices', href: '/market/prices', icon: TrendingUp },
      { name: 'Economic Calendar', href: '/market/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Platform Settings', href: '/settings', icon: Settings },
      { name: 'User Management', href: '/settings/users', icon: Users },
    ],
  },
]

export const Sidebar: React.FC = () => {
  const pathname = usePathname()
  
  // UPDATE: Enhanced cash flow statistics
  const [cashFlowStats, setCashFlowStats] = useState<CashFlowStats>({
    totalScenarios: 0,
    clientsWithAnalysis: 0,
    scenariosNeedingReview: 0,
    advancedAnalysisCount: 0
  });

  // UPDATE: Load enhanced cash flow statistics
  useEffect(() => {
    loadCashFlowStats();
  }, []);

  const loadCashFlowStats = async () => {
    try {
      // Get total scenarios
      const { count: totalScenarios } = await supabase
        .from('cash_flow_scenarios')
        .select('id', { count: 'exact' })
        .eq('isActive', true);

      // Get unique clients with analysis
      const { data: clientsData } = await supabase
        .from('cash_flow_scenarios')
        .select('client_id') 
.eq('is_active', true)
      
      const uniqueClients = new Set(clientsData?.map(s => s.client_id) || []).size;

      // Get scenarios needing review (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: staleScenarios } = await supabase
        .from('cash_flow_scenarios')
        .select('id', { count: 'exact' })
        .eq('isActive', true)
        .lt('lastAssumptionsReview', thirtyDaysAgo.toISOString());

      // NEW: Get advanced analytics count (you can add this table later)
      // For now, we'll use a mock count
      const advancedAnalysisCount = 0; // Replace with actual query when you add analytics tracking

      setCashFlowStats({
        totalScenarios: totalScenarios || 0,
        clientsWithAnalysis: uniqueClients,
        scenariosNeedingReview: staleScenarios || 0,
        advancedAnalysisCount
      });

    } catch (error) {
      console.error('Error loading cash flow stats:', error);
    }
  };

  // UPDATE: Add advanced analytics count to navigation
  const navigationWithCounts = navigation.map(section => {
    if (section.title === 'Client Management') {
      return {
        ...section,
        items: section.items.map(item => {
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
        
        {/* UPDATE: Enhanced Cash Flow Quick Stats */}
        {cashFlowStats.totalScenarios > 0 && (
          <div className="border-t pt-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Cash Flow Summary</h4>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Total Scenarios:</span>
                  <span className="font-medium">{cashFlowStats.totalScenarios}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clients Analyzed:</span>
                  <span className="font-medium">{cashFlowStats.clientsWithAnalysis}</span>
                </div>
                {cashFlowStats.advancedAnalysisCount > 0 && (
                  <div className="flex justify-between text-purple-700">
                    <span>Advanced Analysis:</span>
                    <span className="font-medium">{cashFlowStats.advancedAnalysisCount}</span>
                  </div>
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