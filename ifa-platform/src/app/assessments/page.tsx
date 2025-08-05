'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Loader2
} from 'lucide-react';
import { clientService } from '@/services/ClientService';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types/client';

// Types
interface ClientWithAssessmentStatus extends Client {
  assessmentProgress?: {
    atr_completed: boolean;
    cfl_completed: boolean;
    persona_completed: boolean;
    suitability_completed: boolean;
    last_assessment_date?: string;
    completion_percentage: number;
  };
}

interface FilterOptions {
  status: 'all' | 'complete' | 'incomplete' | 'overdue';
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
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithAssessmentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    search: ''
  });

  // Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    completeAssessments: 0,
    incompleteAssessments: 0,
    overdueAssessments: 0
  });

  useEffect(() => {
    loadClientsWithAssessmentStatus();
  }, []);

  const loadClientsWithAssessmentStatus = async () => {
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

      // Combine client data with assessment progress
      const clientsWithStatus = clientsResponse.clients.map(client => {
        const clientProgress = progressData?.filter(p => p.client_id === client.id) || [];
        
        const atrCompleted = clientProgress.some(p => p.assessment_type === 'atr' && p.status === 'completed');
        const cflCompleted = clientProgress.some(p => p.assessment_type === 'cfl' && p.status === 'completed');
        const personaCompleted = clientProgress.some(p => p.assessment_type === 'persona' && p.status === 'completed');
        const suitabilityCompleted = clientProgress.some(p => p.assessment_type === 'suitability' && p.status === 'completed');
        
        const completedCount = [atrCompleted, cflCompleted, personaCompleted, suitabilityCompleted].filter(Boolean).length;
        const completionPercentage = Math.round((completedCount / 4) * 100);
        
        // Get most recent assessment date
        const dates = clientProgress
          .filter(p => p.status === 'completed' && p.completed_at)
          .map(p => new Date(p.completed_at));
        const lastAssessmentDate = dates.length > 0 ? Math.max(...dates.map(d => d.getTime())) : null;
        
        return {
          ...client,
          assessmentProgress: {
            atr_completed: atrCompleted,
            cfl_completed: cflCompleted,
            persona_completed: personaCompleted,
            suitability_completed: suitabilityCompleted,
            last_assessment_date: lastAssessmentDate ? new Date(lastAssessmentDate).toISOString() : undefined,
            completion_percentage: completionPercentage
          }
        };
      });

      setClients(clientsWithStatus);
      
      // Calculate stats
      const complete = clientsWithStatus.filter(c => c.assessmentProgress?.completion_percentage === 100).length;
      const incomplete = clientsWithStatus.filter(c => 
        c.assessmentProgress && c.assessmentProgress.completion_percentage > 0 && c.assessmentProgress.completion_percentage < 100
      ).length;
      const overdue = clientsWithStatus.filter(c => {
        if (!c.assessmentProgress?.last_assessment_date) return false;
        const lastDate = new Date(c.assessmentProgress.last_assessment_date);
        const monthsAgo = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAgo > 12; // Overdue if more than 12 months
      }).length;
      
      setStats({
        totalClients: clientsWithStatus.length,
        completeAssessments: complete,
        incompleteAssessments: incomplete,
        overdueAssessments: overdue
      });

    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    router.push(`/assessments/client/${client.id}`);
  };

  const filteredClients = clients.filter(client => {
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

    // Status filter
    if (filters.status !== 'all') {
      const progress = client.assessmentProgress;
      if (!progress) return false;
      
      switch (filters.status) {
        case 'complete':
          return progress.completion_percentage === 100;
        case 'incomplete':
          return progress.completion_percentage > 0 && progress.completion_percentage < 100;
        case 'overdue':
          if (!progress.last_assessment_date) return false;
          const monthsAgo = (Date.now() - new Date(progress.last_assessment_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
          return monthsAgo > 12;
        default:
          return true;
      }
    }

    return true;
  });

  const getStatusBadge = (client: ClientWithAssessmentStatus) => {
    const progress = client.assessmentProgress;
    if (!progress) return null;
    
    if (progress.completion_percentage === 100) {
      // Check if overdue
      if (progress.last_assessment_date) {
        const monthsAgo = (Date.now() - new Date(progress.last_assessment_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo > 12) {
          return <Badge variant="warning">Review Due</Badge>;
        }
      }
      return <Badge variant="success">Complete</Badge>;
    } else if (progress.completion_percentage > 0) {
      return <Badge variant="warning">{progress.completion_percentage}% Complete</Badge>;
    } else {
      return <Badge variant="secondary">Not Started</Badge>;
    }
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
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, status: 'all' })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filters.status === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilters({ ...filters, status: 'complete' })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filters.status === 'complete' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Complete
              </button>
              <button
                onClick={() => setFilters({ ...filters, status: 'incomplete' })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filters.status === 'incomplete' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilters({ ...filters, status: 'overdue' })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filters.status === 'overdue' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Review Due
              </button>
            </div>
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filters.search || filters.status !== 'all' ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-gray-600">
                {filters.search || filters.status !== 'all' 
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
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="text-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto ${
                        client.assessmentProgress?.atr_completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Shield className={`h-4 w-4 ${
                          client.assessmentProgress?.atr_completed ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <p className="text-xs mt-1">ATR</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto ${
                        client.assessmentProgress?.cfl_completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <TrendingUp className={`h-4 w-4 ${
                          client.assessmentProgress?.cfl_completed ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <p className="text-xs mt-1">CFL</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto ${
                        client.assessmentProgress?.persona_completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <User className={`h-4 w-4 ${
                          client.assessmentProgress?.persona_completed ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <p className="text-xs mt-1">Persona</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mx-auto ${
                        client.assessmentProgress?.suitability_completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <FileText className={`h-4 w-4 ${
                          client.assessmentProgress?.suitability_completed ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <p className="text-xs mt-1">Suit.</p>
                    </div>
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