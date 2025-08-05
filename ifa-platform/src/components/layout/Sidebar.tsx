// src/components/layout/Sidebar.tsx
// ===================================================================
// CONTEXT-AWARE SIDEBAR WITH CLIENT REQUIREMENTS
// ===================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useClientContext } from '@/hooks/useClientContext';
import { supabase } from '@/lib/supabase';
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
  LineChart,
  ChevronDown,
  ChevronRight,
  Lock
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

export const Sidebar = () => {
  const pathname = usePathname();
  const { clientId, isProspect } = useClientContext();
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

  const navigation: NavSection[] = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Overview', href: '/dashboard', icon: BarChart3 },
        { name: 'AI Insights', href: '/dashboard', icon: PieChart },
        { name: 'Risk Profiling', href: '/assessments/atr', icon: Shield, requiresClient: true },
      ],
    },
    {
      title: 'Client Management',
      items: [
        { name: 'All Clients', href: '/clients', icon: Users },
        { name: 'Suitability Assessments', href: '/assessments/suitability-clients', icon: FileText },
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
        { name: 'Suitability Assessment', href: '/assessments/suitability', icon: FileCheck, requiresClient: true },
        { name: 'Risk Assessment (ATR)', href: '/assessments/atr', icon: Brain, requiresClient: true },
        { name: 'Risk Assessment (CFL)', href: '/assessments/cfl', icon: Calculator, requiresClient: true },
        { name: 'Investor Persona', href: '/assessments/persona-assessment', icon: Target, requiresClient: true },
        { name: 'Persona Library', href: '/assessments/personas', icon: Users },
      ],
    },
    {
      title: 'Documents & Reports',
      items: [
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Reports', href: '/reports', icon: Briefcase },
        { name: 'Reviews', href: '/reviews', icon: RotateCcw },
        { name: 'Signatures', href: '/signatures', icon: FileCheck },
      ],
    },
    {
      title: 'Communication',
      items: [
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Calls', href: '/calls', icon: Phone },
        { name: 'Inbox', href: '/inbox', icon: Mail },
      ],
    },
    {
      title: 'Settings',
      items: [
        { name: 'Compliance', href: '/compliance', icon: BookOpen },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch cash flow stats
        const { data: scenarios } = await supabase
          .from('cash_flow_scenarios')
          .select('id, client_id, last_analysis_date')
          .not('client_id', 'is', null);

        if (scenarios) {
          const uniqueClients = new Set(scenarios.map(s => s.client_id));
          const needingReview = scenarios.filter(s => {
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
  }, []);

  // Add counts to navigation items
  const navigationWithCounts = navigation.map(section => {
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
          if (item.name === 'Advanced Analytics') {
            return { ...item, count: cashFlowStats.advancedAnalysisCount > 0 ? cashFlowStats.advancedAnalysisCount : undefined };
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
    <div className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-6">
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
                    const isActive = pathname === item.href.split('?')[0];
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
      </nav>
    </div>
  );
};