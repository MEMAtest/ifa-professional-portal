'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Users, 
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Filter,
  TrendingUp,
  Shield,
  User,
  FileText,
  Activity,
  DollarSign,
  LineChart,
  Calculator,
  Loader2
} from 'lucide-react';
import { clientService } from '@/services/ClientService';
import { createClient } from '@/lib/supabase/client';
import { normalizeAssessmentType } from '@/lib/assessments/routing';
import type { Client } from '@/types/client';
import clientLogger from '@/lib/logging/clientLogger'

// Types
type AssessmentTypeKey = 'atr' | 'cfl' | 'persona' | 'suitability' | 'monte_carlo' | 'cashflow';
type AssessmentStatus = 'not_started' | 'in_progress' | 'needs_review' | 'completed';

interface ClientWithAssessmentStatus extends Client {
  assessmentProgress?: {
    byType: Record<AssessmentTypeKey, { status: AssessmentStatus; completed_at?: string }>;
    last_assessment_date?: string;
    completion_percentage: number;
    needs_review: boolean;
    overdue: boolean;
    up_to_date: boolean;
  };
}

interface FilterOptions {
  status: 'all' | AssessmentStatus | 'overdue' | 'up_to_date';
  type: 'all' | AssessmentTypeKey;
  search: string;
}

// Simple UI Components
const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) => {
  const variants = {
    default: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    secondary: "bg-gray-100 text-gray-800"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant as keyof typeof variants] || variants.default}`}>
      {children}
    </span>
  );
};

const Input = ({ 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  className = "",
  icon
}: { 
  type?: string; 
  placeholder?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  className?: string;
  icon?: React.ReactNode;
}) => (
  <div className="relative">
    {icon && (
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {icon}
      </div>
    )}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 ${icon ? 'pl-10' : ''} border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  </div>
);

export default function AssessmentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientWithAssessmentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    type: 'all',
    search: ''
  });

  // Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    completeAssessments: 0,
    incompleteAssessments: 0,
    overdueAssessments: 0
  });

  // Support drilldowns from dashboard charts:
  //   /assessments?type=atr&status=in_progress
  useEffect(() => {
    const rawStatus = (searchParams.get('status') || '').trim()
    const rawType = (searchParams.get('type') || '').trim()

    const allowedStatus = new Set(['all', 'completed', 'in_progress', 'not_started', 'needs_review', 'overdue', 'up_to_date'])
    const allowedType = new Set(['all', 'atr', 'cfl', 'persona', 'suitability', 'monte_carlo', 'cashflow'])

    const nextStatus = allowedStatus.has(rawStatus) ? (rawStatus as FilterOptions['status']) : null
    const normalizedType = rawType ? normalizeAssessmentType(rawType) : ''
    const nextType = allowedType.has(normalizedType) ? (normalizedType as FilterOptions['type']) : null

    if (nextStatus || nextType) {
      setFilters((prev) => ({
        ...prev,
        status: nextStatus ?? prev.status,
        type: nextType ?? prev.type
      }))
    }
  }, [searchParams]);

  const loadClientsWithAssessmentStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all clients
      const clientsResponse = await clientService.getAllClients({}, 1, 100);
      
      // Get assessment progress for all clients
      const { data: progressData, error: progressError } = await supabase
        .from('assessment_progress')
        .select('*');

      if (progressError) throw progressError;

      const assessmentTypes: AssessmentTypeKey[] = [
        'atr',
        'cfl',
        'persona',
        'suitability',
        'monte_carlo',
        'cashflow'
      ];

      // Index progress by client + type (dedupe legacy duplicates)
      const progressByClient = new Map<string, Map<AssessmentTypeKey, any>>();
      (progressData || []).forEach((row: any) => {
        const clientId = row.client_id as string | undefined;
        if (!clientId) return;

        const type = normalizeAssessmentType(row.assessment_type || '') as AssessmentTypeKey;
        if (!assessmentTypes.includes(type)) return;

        const existing = progressByClient.get(clientId)?.get(type);
        const rowUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
        const existingUpdated = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;

        if (!existing || rowUpdated > existingUpdated) {
          const map = progressByClient.get(clientId) || new Map<AssessmentTypeKey, any>();
          map.set(type, row);
          progressByClient.set(clientId, map);
        }
      });

      const normalizeProgressRow = (row?: any): { status: AssessmentStatus; completed_at?: string } => {
        if (!row) return { status: 'not_started' };
        const pct = typeof row.progress_percentage === 'number' ? row.progress_percentage : 0;
        let status = (row.status || 'not_started') as string;

        // Auto-correct based on progress_percentage (matches /api/assessments/progress)
        if (pct === 100) status = 'completed';
        else if (pct > 0 && pct < 100 && status === 'not_started') status = 'in_progress';

        if (!['not_started', 'in_progress', 'needs_review', 'completed'].includes(status)) {
          status = 'not_started';
        }

        return {
          status: status as AssessmentStatus,
          completed_at: typeof row.completed_at === 'string' ? row.completed_at : undefined
        };
      };

      // Combine client data with assessment progress
      const clientsWithStatus: ClientWithAssessmentStatus[] = clientsResponse.clients.map((client: Client) => {
        const typeMap = progressByClient.get(client.id) || new Map<AssessmentTypeKey, any>();

        const byType = {} as Record<AssessmentTypeKey, { status: AssessmentStatus; completed_at?: string }>;
        const completedDates: number[] = [];

        let completedCount = 0;
        let startedCount = 0;

        for (const type of assessmentTypes) {
          const row = typeMap.get(type);
          const normalized = normalizeProgressRow(row);
          byType[type] = normalized;

          if (normalized.status === 'completed') {
            completedCount++;
            if (normalized.completed_at) {
              const dt = new Date(normalized.completed_at);
              if (!isNaN(dt.getTime())) completedDates.push(dt.getTime());
            }
          }

          if (normalized.status !== 'not_started') startedCount++;
        }

        const completionPercentage = Math.round((completedCount / assessmentTypes.length) * 100);
        const lastAssessmentMs = completedDates.length > 0 ? Math.max(...completedDates) : null;
        const lastAssessmentDate = lastAssessmentMs ? new Date(lastAssessmentMs).toISOString() : undefined;

        const monthsAgo =
          lastAssessmentMs ? (Date.now() - lastAssessmentMs) / (1000 * 60 * 60 * 24 * 30) : null;

        const overdue = monthsAgo !== null && monthsAgo > 12;
        const needsReview =
          Object.values(byType).some((x) => x.status === 'needs_review')
          || (monthsAgo !== null && monthsAgo > 10 && monthsAgo <= 12);
        const upToDate = startedCount > 0 && !overdue && !needsReview;

        return {
          ...client,
          assessmentProgress: {
            byType,
            last_assessment_date: lastAssessmentDate,
            completion_percentage: completionPercentage,
            needs_review: needsReview,
            overdue,
            up_to_date: upToDate
          }
        };
      });

      setClients(clientsWithStatus);
      
      // Calculate stats
      const complete = clientsWithStatus.filter((c: ClientWithAssessmentStatus) => c.assessmentProgress?.completion_percentage === 100).length;
      const incomplete = clientsWithStatus.filter((c: ClientWithAssessmentStatus) =>
        c.assessmentProgress && c.assessmentProgress.completion_percentage > 0 && c.assessmentProgress.completion_percentage < 100
      ).length;
      const overdue = clientsWithStatus.filter((c: ClientWithAssessmentStatus) => c.assessmentProgress?.overdue).length;
      
      setStats({
        totalClients: clientsWithStatus.length,
        completeAssessments: complete,
        incompleteAssessments: incomplete,
        overdueAssessments: overdue
      });

    } catch (err) {
      clientLogger.error('Error loading clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Load clients on mount
  useEffect(() => {
    loadClientsWithAssessmentStatus();
  }, [loadClientsWithAssessmentStatus]);

  const handleClientSelect = (client: Client) => {
    router.push(`/assessments/client/${client.id}`);
  };

  const filteredClients = clients.filter((client: ClientWithAssessmentStatus) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
      const email = client.contactInfo?.email?.toLowerCase() || '';
      const ref = client.clientRef?.toLowerCase() || '';
      
      if (!fullName.includes(searchLower) && !email.includes(searchLower) && !ref.includes(searchLower)) {
        return false;
      }
    }

    const progress = client.assessmentProgress;
    if (!progress) return false;

    // Type-specific filter (drilldown)
    if (filters.type !== 'all') {
      const typeProgress = progress.byType?.[filters.type];
      const typeStatus: AssessmentStatus = typeProgress?.status || 'not_started';
      const completedAt = typeProgress?.completed_at ? new Date(typeProgress.completed_at) : null;
      const monthsAgo =
        completedAt && !isNaN(completedAt.getTime())
          ? (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
          : null;

      const typeOverdue = monthsAgo !== null && monthsAgo > 12;
      const typeNeedsReview = typeStatus === 'needs_review' || (monthsAgo !== null && monthsAgo > 10 && monthsAgo <= 12);
      const typeUpToDate = typeStatus === 'completed' && !typeOverdue && !typeNeedsReview;

      if (filters.status === 'all') return true;
      if (filters.status === 'overdue') return typeOverdue;
      if (filters.status === 'up_to_date') return typeUpToDate;
      return typeStatus === filters.status;
    }

    // Overall status filter
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'completed':
          return progress.completion_percentage === 100;
        case 'in_progress':
          return progress.completion_percentage > 0 && progress.completion_percentage < 100;
        case 'not_started':
          return progress.completion_percentage === 0;
        case 'needs_review':
          return progress.needs_review;
        case 'overdue':
          return progress.overdue;
        case 'up_to_date':
          return progress.up_to_date;
        default:
          return true;
      }
    }

    return true;
  });

  const getStatusBadge = (client: ClientWithAssessmentStatus) => {
    const progress = client.assessmentProgress;
    if (!progress) return null;
    
    if (progress.overdue) {
      return <Badge variant="danger">Overdue</Badge>;
    }
    if (progress.needs_review) {
      return <Badge variant="warning">Needs review</Badge>;
    }
    if (progress.completion_percentage === 100) {
      return <Badge variant="success">Complete</Badge>;
    }
    if (progress.completion_percentage > 0) {
      return <Badge variant="warning">{progress.completion_percentage}% Complete</Badge>;
    }
    return <Badge variant="secondary">Not Started</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assessments</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadClientsWithAssessmentStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Assessments</h1>
          <p className="mt-2 text-gray-600">
            Manage risk assessments and compliance for all clients
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Complete</p>
                <p className="text-2xl font-bold text-green-600">{stats.completeAssessments}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.incompleteAssessments}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Review Due</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueAssessments}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or reference..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                icon={<Search className="h-5 w-5 text-gray-400" />}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as FilterOptions['type'] })}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All assessment types</option>
                <option value="suitability">Suitability</option>
                <option value="atr">ATR</option>
                <option value="cfl">CFL</option>
                <option value="persona">Investor Persona</option>
                <option value="monte_carlo">Monte Carlo</option>
                <option value="cashflow">Cash Flow</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In progress</option>
                <option value="not_started">Not started</option>
                <option value="needs_review">Needs review</option>
                <option value="overdue">Overdue</option>
                <option value="up_to_date">Up to date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filters.search || filters.status !== 'all' || filters.type !== 'all' ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-gray-600">
                {filters.search || filters.status !== 'all' || filters.type !== 'all'
                  ? 'Try adjusting your filters' 
                  : 'Create a client to start managing assessments'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                onClick={() => handleClientSelect(client)}
                className="p-6 hover:border-blue-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{client.clientRef}</p>
                  </div>
                  {getStatusBadge(client)}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{client.contactInfo?.email}</span>
                  </div>
                  
                  {client.financialProfile?.netWorth && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>£{client.financialProfile.netWorth.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last assessed: {formatDate(client.assessmentProgress?.last_assessment_date)}</span>
                  </div>
                </div>

                {/* Assessment Progress */}
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {[
                      { key: 'atr' as const, label: 'ATR', Icon: Shield },
                      { key: 'cfl' as const, label: 'CFL', Icon: TrendingUp },
                      { key: 'persona' as const, label: 'Pers', Icon: User },
                      { key: 'suitability' as const, label: 'Suit', Icon: FileText },
                      { key: 'monte_carlo' as const, label: 'MC', Icon: LineChart },
                      { key: 'cashflow' as const, label: 'CF', Icon: Calculator }
                    ].map(({ key, label, Icon }) => {
                      const status = client.assessmentProgress?.byType?.[key]?.status || 'not_started';
                      const isComplete = status === 'completed';
                      const isInProgress = status === 'in_progress';
                      const bg = isComplete ? 'bg-green-100' : isInProgress ? 'bg-yellow-100' : 'bg-gray-100';
                      const fg = isComplete ? 'text-green-600' : isInProgress ? 'text-yellow-600' : 'text-gray-400';

                      return (
                        <div key={key} className="text-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto ${bg}`}>
                            <Icon className={`h-4 w-4 ${fg}`} />
                          </div>
                          <p className="text-xs mt-1">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${client.assessmentProgress?.completion_percentage || 0}%` }}
                      />
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
