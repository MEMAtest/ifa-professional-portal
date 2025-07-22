// src/app/risk/page.tsx
// Risk Management Dashboard - Overview of all client risk profiles

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { clientService } from '@/services/ClientService';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Users, 
  Search,
  Filter,
  FileText,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import type { Client } from '@/types/client';

interface RiskStatistics {
  totalClients: number;
  byRiskScore: Record<number, number>;
  highRiskClients: number;
  lowRiskClients: number;
  assessmentsDue: number;
  recentAssessments: number;
}

interface RiskClient extends Client {
  lastAssessmentDate?: string;
  daysSinceAssessment?: number;
}

export default function RiskManagementPage() {
  const router = useRouter();
  const [clients, setClients] = useState<RiskClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<RiskClient[]>([]);
  const [statistics, setStatistics] = useState<RiskStatistics>({
    totalClients: 0,
    byRiskScore: {},
    highRiskClients: 0,
    lowRiskClients: 0,
    assessmentsDue: 0,
    recentAssessments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'recent'>('all');

  useEffect(() => {
    loadRiskData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, filterRiskLevel, filterStatus]);

  const loadRiskData = async () => {
    try {
      setIsLoading(true);

      // Load all clients with risk profiles
      const response = await clientService.getAllClients({ status: ['active'] }, 1, 1000);
      
      // Load risk assessments from database
      const { data: assessments } = await supabase
        .from('risk_profiles')
        .select('client_id, updated_at, attitude_to_risk')
        .order('updated_at', { ascending: false });

      // Combine data
      const enrichedClients = response.clients.map(client => {
        const assessment = assessments?.find(a => a.client_id === client.id);
        const lastAssessmentDate = assessment?.updated_at || client.createdAt;
        const daysSinceAssessment = Math.floor(
          (new Date().getTime() - new Date(lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...client,
          lastAssessmentDate,
          daysSinceAssessment
        };
      });

      setClients(enrichedClients);
      calculateStatistics(enrichedClients);

    } catch (error) {
      console.error('Error loading risk data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStatistics = (clientList: RiskClient[]) => {
    const stats: RiskStatistics = {
      totalClients: clientList.length,
      byRiskScore: {},
      highRiskClients: 0,
      lowRiskClients: 0,
      assessmentsDue: 0,
      recentAssessments: 0
    };

    clientList.forEach(client => {
      const riskScore = client.riskProfile?.attitudeToRisk || 5;
      
      // Count by risk score
      stats.byRiskScore[riskScore] = (stats.byRiskScore[riskScore] || 0) + 1;
      
      // Count high/low risk
      if (riskScore >= 8) stats.highRiskClients++;
      if (riskScore <= 3) stats.lowRiskClients++;
      
      // Count assessments due (>365 days)
      if (client.daysSinceAssessment && client.daysSinceAssessment > 365) {
        stats.assessmentsDue++;
      }
      
      // Count recent assessments (<30 days)
      if (client.daysSinceAssessment && client.daysSinceAssessment < 30) {
        stats.recentAssessments++;
      }
    });

    setStatistics(stats);
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client => {
        const name = `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase()) ||
               client.clientRef?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Risk level filter
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(client => {
        const riskScore = client.riskProfile?.attitudeToRisk || 5;
        if (filterRiskLevel === 'high') return riskScore >= 7;
        if (filterRiskLevel === 'medium') return riskScore >= 4 && riskScore <= 6;
        if (filterRiskLevel === 'low') return riskScore <= 3;
        return true;
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => {
        if (filterStatus === 'due') return client.daysSinceAssessment! > 365;
        if (filterStatus === 'recent') return client.daysSinceAssessment! < 30;
        return true;
      });
    }

    // Sort by days since assessment (oldest first)
    filtered.sort((a, b) => (b.daysSinceAssessment || 0) - (a.daysSinceAssessment || 0));

    setFilteredClients(filtered);
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 7) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 8) return 'High Risk';
    if (score >= 7) return 'Medium-High';
    if (score >= 4) return 'Medium';
    if (score >= 2) return 'Low-Medium';
    return 'Low Risk';
  };

  const getAssessmentStatus = (days: number) => {
    if (days > 365) return { label: 'Overdue', color: 'destructive' };
    if (days > 300) return { label: 'Due Soon', color: 'warning' };
    if (days < 30) return { label: 'Recent', color: 'success' };
    return { label: 'Current', color: 'default' };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading risk data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Management</h1>
        <p className="text-gray-600">
          Monitor and manage client risk profiles and assessments
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold">{statistics.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">High Risk Clients</p>
                <p className="text-2xl font-bold text-red-600">{statistics.highRiskClients}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assessments Due</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.assessmentsDue}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recent Assessments</p>
                <p className="text-2xl font-bold text-green-600">{statistics.recentAssessments}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Risk Score Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
              const count = statistics.byRiskScore[score] || 0;
              const percentage = statistics.totalClients > 0 
                ? (count / statistics.totalClients) * 100 
                : 0;
              
              return (
                <div key={score} className="text-center">
                  <div 
                    className={`w-full bg-gray-200 rounded-t-lg relative`}
                    style={{ height: '100px' }}
                  >
                    <div 
                      className={`absolute bottom-0 w-full rounded-t-lg ${
                        score >= 8 ? 'bg-red-500' :
                        score >= 7 ? 'bg-orange-500' :
                        score >= 4 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ height: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs font-semibold mt-1">{score}</p>
                  <p className="text-xs text-gray-500">{count}</p>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>← Lower Risk</span>
            <span>Higher Risk →</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterRiskLevel === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('all')}
              >
                All
              </Button>
              <Button
                variant={filterRiskLevel === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('high')}
              >
                High Risk
              </Button>
              <Button
                variant={filterRiskLevel === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('medium')}
              >
                Medium
              </Button>
              <Button
                variant={filterRiskLevel === 'low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('low')}
              >
                Low Risk
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'due' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(filterStatus === 'due' ? 'all' : 'due')}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Due
              </Button>
              <Button
                variant={filterStatus === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(filterStatus === 'recent' ? 'all' : 'recent')}
              >
                <Shield className="h-4 w-4 mr-1" />
                Recent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Risk List */}
      <Card>
        <CardHeader>
          <CardTitle>Client Risk Profiles ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Risk Score</th>
                  <th className="text-left py-3 px-4">Risk Level</th>
                  <th className="text-left py-3 px-4">Last Assessment</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const riskScore = client.riskProfile?.attitudeToRisk || 5;
                  const assessmentStatus = getAssessmentStatus(client.daysSinceAssessment || 0);
                  
                  return (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{client.clientRef}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
                            {riskScore}
                          </span>
                          <span className="text-gray-500 ml-1">/10</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={riskScore >= 7 ? 'destructive' : riskScore >= 4 ? 'warning' : 'success'}>
                          {getRiskLabel(riskScore)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm">
                            {client.daysSinceAssessment} days ago
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(client.lastAssessmentDate!).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={assessmentStatus.color as any}>
                          {assessmentStatus.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/clients/${client.id}?tab=risk`)}
                          >
                            View Profile
                          </Button>
                          {client.daysSinceAssessment! > 300 && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/assessments/atr?clientId=${client.id}`)}
                            >
                              Update Assessment
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}