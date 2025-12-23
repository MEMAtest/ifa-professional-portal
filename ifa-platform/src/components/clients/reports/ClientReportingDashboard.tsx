'use client';

// ===================================================================
// REPORTING HUB - Comprehensive Client Analytics & Reports
// ===================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService';
import { getVulnerabilityStatus, formatCurrency } from '@/types/client';
import type { Client, ClientStatistics } from '@/types/client';
import { calculateClientAUM } from '@/lib/financials/aumCalculator';
import { safeUUID } from '@/lib/utils';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Table,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  FileSpreadsheet,
  ArrowUpDown,
  X,
  Save,
  Printer,
  Share2,
  Settings,
  Calendar,
  DollarSign,
  Shield,
  Activity,
  Plus,
  Trash2,
  FolderOpen,
  Copy,
  FileText
} from 'lucide-react';

// ===================================================================
// TYPES & INTERFACES
// ===================================================================

interface ClientReportData {
  clients: Client[];
  statistics: ClientStatistics | null;
  distributions: {
    gender: Record<string, number>;
    status: Record<string, number>;
    vulnerability: Record<string, number>;
    riskLevel: Record<string, number>;
    employmentStatus: Record<string, number>;
    maritalStatus: Record<string, number>;
    ageGroups: Record<string, number>;
    incomeRanges: Record<string, number>;
    netWorthRanges: Record<string, number>;
  };
}

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  filters: Record<string, any>;
  columns: string[];
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'dashboard' | 'table' | 'charts';
type SortField = 'name' | 'status' | 'netWorth' | 'riskLevel' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getAgeGroup = (age: number): string => {
  if (age < 25) return 'Under 25';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
};

const getIncomeRange = (income: number): string => {
  if (income < 25000) return 'Under £25k';
  if (income < 50000) return '£25k-£50k';
  if (income < 75000) return '£50k-£75k';
  if (income < 100000) return '£75k-£100k';
  if (income < 150000) return '£100k-£150k';
  return '£150k+';
};

const getNetWorthRange = (netWorth: number): string => {
  if (netWorth < 50000) return 'Under £50k';
  if (netWorth < 100000) return '£50k-£100k';
  if (netWorth < 250000) return '£100k-£250k';
  if (netWorth < 500000) return '£250k-£500k';
  if (netWorth < 1000000) return '£500k-£1M';
  return '£1M+';
};

const formatGender = (gender: string | undefined): string => {
  if (!gender) return 'Not Specified';
  const genderMap: Record<string, string> = {
    'male': 'Male',
    'female': 'Female',
    'non_binary': 'Non-Binary',
    'prefer_not_to_say': 'Prefer Not to Say',
    'other': 'Other'
  };
  return genderMap[gender] || 'Not Specified';
};

const formatEmploymentStatus = (status: string | undefined): string => {
  if (!status) return 'Unknown';
  const statusMap: Record<string, string> = {
    'employed': 'Employed',
    'self_employed': 'Self-Employed',
    'retired': 'Retired',
    'unemployed': 'Unemployed',
    'student': 'Student',
    'other': 'Other'
  };
  return statusMap[status] || status;
};

const formatMaritalStatus = (status: string | undefined): string => {
  if (!status) return 'Unknown';
  const statusMap: Record<string, string> = {
    'single': 'Single',
    'married': 'Married',
    'divorced': 'Divorced',
    'widowed': 'Widowed',
    'civil_partnership': 'Civil Partnership',
    'other': 'Other'
  };
  return statusMap[status] || status;
};

// Chart colors
const CHART_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500'
];
const CHART_COLORS_HEX = [
  '#2563EB', '#22C55E', '#F59E0B', '#A855F7', '#EF4444',
  '#6366F1', '#EC4899', '#14B8A6', '#FB923C', '#06B6D4'
];

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function ClientReportingDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [statistics, setStatistics] = useState<ClientStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [selectedVulnerability, setSelectedVulnerability] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [editingReport, setEditingReport] = useState<ReportConfig | null>(null);
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showSavedReports, setShowSavedReports] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [clientsResponse, statsResponse] = await Promise.all([
        clientService.getAllClients({}, 1, 1000),
        clientService.getClientStatistics()
      ]);

      setClients(clientsResponse.clients);
      setStatistics(statsResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Calculate distributions
  const distributions = useMemo(() => {
    const gender: Record<string, number> = {};
    const status: Record<string, number> = {};
    const vulnerability: Record<string, number> = { 'Vulnerable': 0, 'Not Vulnerable': 0 };
    const riskLevel: Record<string, number> = {};
    const employmentStatus: Record<string, number> = {};
    const maritalStatus: Record<string, number> = {};
    const ageGroups: Record<string, number> = {};
    const incomeRanges: Record<string, number> = {};
    const netWorthRanges: Record<string, number> = {};

    clients.forEach(client => {
      // Gender
      const genderValue = formatGender(client.personalDetails?.gender);
      gender[genderValue] = (gender[genderValue] || 0) + 1;

      // Status
      const statusValue = client.status || 'unknown';
      status[statusValue] = (status[statusValue] || 0) + 1;

      // Vulnerability
      const isVulnerable = getVulnerabilityStatus(client.vulnerabilityAssessment);
      vulnerability[isVulnerable ? 'Vulnerable' : 'Not Vulnerable']++;

      // Risk Level
      const risk = client.riskProfile?.riskTolerance || 'Unknown';
      riskLevel[risk] = (riskLevel[risk] || 0) + 1;

      // Employment Status
      const employment = formatEmploymentStatus(client.personalDetails?.employmentStatus);
      employmentStatus[employment] = (employmentStatus[employment] || 0) + 1;

      // Marital Status
      const marital = formatMaritalStatus(client.personalDetails?.maritalStatus);
      maritalStatus[marital] = (maritalStatus[marital] || 0) + 1;

      // Age Groups
      const age = calculateAge(client.personalDetails?.dateOfBirth || '');
      if (age > 0) {
        const ageGroup = getAgeGroup(age);
        ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
      }

      // Income Ranges
      const income = client.financialProfile?.annualIncome || 0;
      const incomeRange = getIncomeRange(income);
      incomeRanges[incomeRange] = (incomeRanges[incomeRange] || 0) + 1;

      // Net Worth Ranges
      const netWorth = client.financialProfile?.netWorth || 0;
      const netWorthRange = getNetWorthRange(netWorth);
      netWorthRanges[netWorthRange] = (netWorthRanges[netWorthRange] || 0) + 1;
    });

    return { gender, status, vulnerability, riskLevel, employmentStatus, maritalStatus, ageGroups, incomeRanges, netWorthRanges };
  }, [clients]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => {
        const name = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
        const email = (client.contactInfo?.email || '').toLowerCase();
        const ref = (client.clientRef || '').toLowerCase();
        return name.includes(query) || email.includes(query) || ref.includes(query);
      });
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(client => client.status === selectedStatus);
    }

    // Risk level filter
    if (selectedRiskLevel !== 'all') {
      filtered = filtered.filter(client => client.riskProfile?.riskTolerance === selectedRiskLevel);
    }

    // Vulnerability filter
    if (selectedVulnerability !== 'all') {
      const isVulnerableFilter = selectedVulnerability === 'vulnerable';
      filtered = filtered.filter(client => getVulnerabilityStatus(client.vulnerabilityAssessment) === isVulnerableFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          const nameA = `${a.personalDetails?.firstName || ''} ${a.personalDetails?.lastName || ''}`;
          const nameB = `${b.personalDetails?.firstName || ''} ${b.personalDetails?.lastName || ''}`;
          comparison = nameA.localeCompare(nameB);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'netWorth':
          comparison = (a.financialProfile?.netWorth || 0) - (b.financialProfile?.netWorth || 0);
          break;
        case 'riskLevel':
          comparison = (a.riskProfile?.riskTolerance || '').localeCompare(b.riskProfile?.riskTolerance || '');
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [clients, searchQuery, selectedStatus, selectedRiskLevel, selectedVulnerability, sortField, sortOrder]);

  // Calculate financial totals using proper AUM calculation
  const financialTotals = useMemo(() => {
    return filteredClients.reduce((acc, client) => {
      const clientAUM = calculateClientAUM(client)
      return {
        totalAUM: acc.totalAUM + clientAUM.totalAUM,
        totalIncome: acc.totalIncome + (client.financialProfile?.annualIncome || 0),
        avgNetWorth: 0,
        avgIncome: 0
      }
    }, { totalAUM: 0, totalIncome: 0, avgNetWorth: 0, avgIncome: 0 });
  }, [filteredClients]);

  financialTotals.avgNetWorth = filteredClients.length > 0 ? financialTotals.totalAUM / filteredClients.length : 0;
  financialTotals.avgIncome = filteredClients.length > 0 ? financialTotals.totalIncome / filteredClients.length : 0;

  // AUM breakdowns for richer charts - using proper AUM calculation
  const aumBreakdowns = useMemo(() => {
    const aumByRisk: Record<string, number> = {};
    const aumByStatus: Record<string, number> = {};

    filteredClients.forEach(client => {
      const clientAUM = calculateClientAUM(client).totalAUM;
      const risk = client.riskProfile?.riskTolerance || 'Unknown';
      const status = client.status || 'unknown';

      aumByRisk[risk] = (aumByRisk[risk] || 0) + clientAUM;
      aumByStatus[status] = (aumByStatus[status] || 0) + clientAUM;
    });

    return { aumByRisk, aumByStatus };
  }, [filteredClients]);

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const headers = [
        'Client Ref', 'First Name', 'Last Name', 'Email', 'Phone', 'Gender',
        'Date of Birth', 'Age', 'Marital Status', 'Employment Status', 'Occupation',
        'Status', 'Risk Tolerance', 'Vulnerable', 'Annual Income', 'Net Worth',
        'Liquid Assets', 'Monthly Expenses', 'Created At', 'Updated At'
      ];

      const rows = filteredClients.map(client => [
        client.clientRef || '',
        client.personalDetails?.firstName || '',
        client.personalDetails?.lastName || '',
        client.contactInfo?.email || '',
        client.contactInfo?.phone || '',
        formatGender(client.personalDetails?.gender),
        client.personalDetails?.dateOfBirth || '',
        calculateAge(client.personalDetails?.dateOfBirth || ''),
        formatMaritalStatus(client.personalDetails?.maritalStatus),
        formatEmploymentStatus(client.personalDetails?.employmentStatus),
        client.personalDetails?.occupation || '',
        client.status || '',
        client.riskProfile?.riskTolerance || '',
        getVulnerabilityStatus(client.vulnerabilityAssessment) ? 'Yes' : 'No',
        client.financialProfile?.annualIncome || 0,
        client.financialProfile?.netWorth || 0,
        client.financialProfile?.liquidAssets || 0,
        client.financialProfile?.monthlyExpenses || 0,
        client.createdAt || '',
        client.updatedAt || ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Add summary section
      const summary = [
        '',
        'SUMMARY',
        `Total Clients,${filteredClients.length}`,
        `Total AUM,${formatCurrency(financialTotals.totalAUM)}`,
        `Average Net Worth,${formatCurrency(financialTotals.avgNetWorth)}`,
        `Vulnerable Clients,${distributions.vulnerability['Vulnerable'] || 0}`,
        `Report Generated,${new Date().toISOString()}`
      ].join('\n');

      const fullContent = csvContent + '\n\n' + summary;

      // Download
      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `client-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Success', description: 'Report exported successfully' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }, [filteredClients, financialTotals, distributions, toast]);

  // Load saved reports from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('plannetic_client_reports');
    if (stored) {
      try {
        setSavedReports(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load saved reports:', e);
      }
    }
  }, []);

  // Save report configuration
  const saveReport = useCallback(() => {
    if (!reportName.trim()) {
      toast({ title: 'Error', description: 'Please enter a report name', variant: 'destructive' });
      return;
    }

    const newReport: ReportConfig = {
      id: editingReport?.id || safeUUID(),
      name: reportName,
      description: reportDescription,
      filters: {
        searchQuery,
        selectedStatus,
        selectedRiskLevel,
        selectedVulnerability,
        sortField,
        sortOrder
      },
      columns: ['name', 'email', 'status', 'riskLevel', 'vulnerable', 'netWorth'],
      createdAt: editingReport?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedReports = editingReport
      ? savedReports.map(r => r.id === editingReport.id ? newReport : r)
      : [...savedReports, newReport];

    setSavedReports(updatedReports);
    localStorage.setItem('plannetic_client_reports', JSON.stringify(updatedReports));

    toast({ title: 'Success', description: editingReport ? 'Report updated' : 'Report saved' });
    setShowReportModal(false);
    setReportName('');
    setReportDescription('');
    setEditingReport(null);
  }, [reportName, reportDescription, searchQuery, selectedStatus, selectedRiskLevel, selectedVulnerability, sortField, sortOrder, editingReport, savedReports, toast]);

  // Load report configuration
  const loadReport = useCallback((report: ReportConfig) => {
    setSearchQuery(report.filters.searchQuery || '');
    setSelectedStatus(report.filters.selectedStatus || 'all');
    setSelectedRiskLevel(report.filters.selectedRiskLevel || 'all');
    setSelectedVulnerability(report.filters.selectedVulnerability || 'all');
    setSortField(report.filters.sortField || 'updatedAt');
    setSortOrder(report.filters.sortOrder || 'desc');
    setShowSavedReports(false);
    toast({ title: 'Loaded', description: `Report "${report.name}" loaded successfully` });
  }, [toast]);

  // Delete report
  const deleteReport = useCallback((reportId: string) => {
    const updatedReports = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updatedReports);
    localStorage.setItem('plannetic_client_reports', JSON.stringify(updatedReports));
    toast({ title: 'Deleted', description: 'Report deleted successfully' });
  }, [savedReports, toast]);

  // Edit report
  const startEditReport = useCallback((report: ReportConfig) => {
    setEditingReport(report);
    setReportName(report.name);
    setReportDescription(report.description);
    setShowReportModal(true);
  }, []);

  // Duplicate report
  const duplicateReport = useCallback((report: ReportConfig) => {
    const newReport: ReportConfig = {
      ...report,
      id: safeUUID(),
      name: `${report.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedReports = [...savedReports, newReport];
    setSavedReports(updatedReports);
    localStorage.setItem('plannetic_client_reports', JSON.stringify(updatedReports));
    toast({ title: 'Success', description: 'Report duplicated' });
  }, [savedReports, toast]);

  // Render distribution chart with real Recharts visualization + textual breakdown
  const renderDistributionChart = (
    title: string,
    data: Record<string, number>,
    icon: React.ReactNode,
    chartId: string,
    options?: { forceBar?: boolean; valueFormatter?: (value: number) => string }
  ) => {
    const entries = Object.entries(data || {}).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const isExpanded = expandedChart === chartId;
    const chartData = entries.map(([name, value]) => ({ name, value }));
    const useBarChart = options?.forceBar || entries.length > 6;
    const formatValue = options?.valueFormatter || ((value: number) => value.toString());

    return (
      <Card className={`${isExpanded ? 'col-span-2' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon}
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedChart(isExpanded ? null : chartId)}
                aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-sm text-gray-500">No data available yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {useBarChart ? (
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatValue(value), 'Value']}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${chartId}-${index}`} fill={CHART_COLORS_HEX[index % CHART_COLORS_HEX.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${chartId}-${index}`} fill={CHART_COLORS_HEX[index % CHART_COLORS_HEX.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatValue(value), 'Value']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </RechartsPieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2 mt-4">
            {entries.slice(0, isExpanded ? entries.length : 5).map(([label, count], index) => {
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <div className={`w-3 h-3 rounded-full ${CHART_COLORS[index % CHART_COLORS.length]}`} />
                    <span className="text-sm text-gray-700 truncate">{label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${CHART_COLORS[index % CHART_COLORS.length]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-20 text-right">
                      {formatValue(count)}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
            {!isExpanded && entries.length > 5 && (
              <button
                onClick={() => setExpandedChart(chartId)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                +{entries.length - 5} more categories
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading client reports...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error && clients.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Reports</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting Hub</h1>
            <p className="text-gray-600">Comprehensive analytics and insights for your client base</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1">
              <Button
                variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('dashboard')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
              <Button
                variant={viewMode === 'charts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('charts')}
              >
                <PieChart className="h-4 w-4 mr-1" />
                Charts
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>

            {/* Actions */}
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSavedReports(!showSavedReports)}>
              <FolderOpen className="h-4 w-4 mr-1" />
              Saved Reports {savedReports.length > 0 && `(${savedReports.length})`}
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setEditingReport(null);
              setReportName('');
              setReportDescription('');
              setShowReportModal(true);
            }}>
              <Save className="h-4 w-4 mr-1" />
              Save Report
            </Button>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button onClick={exportToExcel} disabled={isExporting}>
              <Download className="h-4 w-4 mr-1" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>

        {/* Saved Reports Panel */}
        {showSavedReports && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Saved Reports</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSavedReports(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {savedReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No saved reports yet</p>
                <p className="text-sm mt-1">Configure filters and save a report to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedReports.map(report => (
                  <div key={report.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        {report.description && (
                          <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                        )}
                      </div>
                      <Badge className="bg-gray-100 text-gray-600 text-xs">
                        {new Date(report.updatedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1 mt-3">
                      <Button variant="outline" size="sm" onClick={() => loadReport(report)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEditReport(report)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicateReport(report)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteReport(report.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="review_due">Review Due</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>

              {/* Risk Level Filter */}
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="Conservative">Conservative</option>
                <option value="Moderate">Moderate</option>
                <option value="Balanced">Balanced</option>
                <option value="Growth">Growth</option>
                <option value="Aggressive">Aggressive</option>
              </select>

              {/* Vulnerability Filter */}
              <select
                value={selectedVulnerability}
                onChange={(e) => setSelectedVulnerability(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Clients</option>
                <option value="vulnerable">Vulnerable Only</option>
                <option value="not_vulnerable">Not Vulnerable</option>
              </select>

              {/* Clear Filters */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  setSelectedRiskLevel('all');
                  setSelectedVulnerability('all');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Active Filters Summary */}
            {(searchQuery || selectedStatus !== 'all' || selectedRiskLevel !== 'all' || selectedVulnerability !== 'all') && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredClients.length}</span> of <span className="font-semibold">{clients.length}</span> clients
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Clients</p>
                <p className="text-xl font-bold text-gray-900">{filteredClients.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-xl font-bold text-green-600">{distributions.status['active'] || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Reviews Due</p>
                <p className="text-xl font-bold text-orange-600">{distributions.status['review_due'] || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vulnerable</p>
                <p className="text-xl font-bold text-red-600">{distributions.vulnerability['Vulnerable'] || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total AUM</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(financialTotals.totalAUM)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Net Worth</p>
                <p className="text-lg font-bold text-teal-600">{formatCurrency(financialTotals.avgNetWorth)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderDistributionChart('Gender Distribution', distributions.gender, <Users className="h-4 w-4 text-blue-500" />, 'gender')}
            {renderDistributionChart('Client Status', distributions.status, <Activity className="h-4 w-4 text-green-500" />, 'status')}
            {renderDistributionChart('Vulnerability Status', distributions.vulnerability, <AlertTriangle className="h-4 w-4 text-red-500" />, 'vulnerability')}
            {renderDistributionChart('Risk Tolerance', distributions.riskLevel, <Shield className="h-4 w-4 text-purple-500" />, 'riskLevel')}
            {renderDistributionChart('Age Groups', distributions.ageGroups, <Calendar className="h-4 w-4 text-orange-500" />, 'ageGroups', { forceBar: true })}
            {renderDistributionChart('Employment Status', distributions.employmentStatus, <UserCheck className="h-4 w-4 text-teal-500" />, 'employmentStatus')}
            {renderDistributionChart('Marital Status', distributions.maritalStatus, <Users className="h-4 w-4 text-pink-500" />, 'maritalStatus')}
            {renderDistributionChart('Income Ranges', distributions.incomeRanges, <DollarSign className="h-4 w-4 text-green-500" />, 'incomeRanges', { forceBar: true })}
            {renderDistributionChart('Net Worth Ranges', distributions.netWorthRanges, <TrendingUp className="h-4 w-4 text-indigo-500" />, 'netWorthRanges', { forceBar: true })}
          </div>
        )}

        {/* Charts View */}
        {viewMode === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderDistributionChart('Gender Distribution', distributions.gender, <Users className="h-5 w-5 text-blue-500" />, 'gender-lg')}
            {renderDistributionChart('Client Status', distributions.status, <Activity className="h-5 w-5 text-green-500" />, 'status-lg')}
            {renderDistributionChart('Vulnerability Status', distributions.vulnerability, <AlertTriangle className="h-5 w-5 text-red-500" />, 'vulnerability-lg')}
            {renderDistributionChart('Risk Tolerance', distributions.riskLevel, <Shield className="h-5 w-5 text-purple-500" />, 'riskLevel-lg')}
            {renderDistributionChart('Age Groups', distributions.ageGroups, <Calendar className="h-5 w-5 text-orange-500" />, 'ageGroups-lg', { forceBar: true })}
            {renderDistributionChart('Income Ranges', distributions.incomeRanges, <DollarSign className="h-5 w-5 text-green-500" />, 'incomeRanges-lg', { forceBar: true })}
            {renderDistributionChart('Net Worth Ranges', distributions.netWorthRanges, <TrendingUp className="h-5 w-5 text-indigo-500" />, 'netWorthRanges-lg', { forceBar: true })}
            {renderDistributionChart('AUM by Risk Level', aumBreakdowns.aumByRisk, <TrendingUp className="h-5 w-5 text-purple-500" />, 'aumRisk', { forceBar: true, valueFormatter: formatCurrency })}
            {renderDistributionChart('AUM by Client Status', aumBreakdowns.aumByStatus, <Activity className="h-5 w-5 text-green-600" />, 'aumStatus', { forceBar: true, valueFormatter: formatCurrency })}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients(new Set(filteredClients.map(c => c.id)));
                            } else {
                              setSelectedClients(new Set());
                            }
                          }}
                          checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                        />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortField === 'name') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('name');
                            setSortOrder('asc');
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Client</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortField === 'status') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('status');
                            setSortOrder('asc');
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vulnerable</th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortField === 'netWorth') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('netWorth');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Net Worth</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => {
                      const isVulnerable = getVulnerabilityStatus(client.vulnerabilityAssessment);
                      return (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedClients.has(client.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedClients);
                                if (e.target.checked) {
                                  newSelected.add(client.id);
                                } else {
                                  newSelected.delete(client.id);
                                }
                                setSelectedClients(newSelected);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{client.contactInfo?.email}</div>
                              <div className="text-xs text-gray-400">{client.clientRef}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatGender(client.personalDetails?.gender)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                client.status === 'active' ? 'bg-green-100 text-green-800' :
                                client.status === 'review_due' ? 'bg-orange-100 text-orange-800' :
                                client.status === 'prospect' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {client.status?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                client.riskProfile?.riskTolerance === 'Conservative' ? 'bg-green-100 text-green-800' :
                                client.riskProfile?.riskTolerance === 'Aggressive' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {client.riskProfile?.riskTolerance || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {isVulnerable ? (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-gray-500 text-sm">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {formatCurrency(client.financialProfile?.netWorth || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/clients?id=${client.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/clients/${client.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedClients.size > 0 && (
                      <span className="mr-4">{selectedClients.size} selected</span>
                    )}
                    Showing {filteredClients.length} clients
                  </p>
                  {selectedClients.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={exportToExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        Export Selected
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Most Common Risk Level</p>
                <p className="text-lg font-bold text-gray-900">
                  {Object.entries(distributions.riskLevel).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Largest Age Group</p>
                <p className="text-lg font-bold text-gray-900">
                  {Object.entries(distributions.ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Vulnerability Rate</p>
                <p className="text-lg font-bold text-gray-900">
                  {clients.length > 0
                    ? `${Math.round((distributions.vulnerability['Vulnerable'] / clients.length) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Client Rate</p>
                <p className="text-lg font-bold text-gray-900">
                  {clients.length > 0
                    ? `${Math.round(((distributions.status['active'] || 0) / clients.length) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingReport ? 'Edit Report' : 'Save Report Configuration'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setShowReportModal(false);
                    setEditingReport(null);
                    setReportName('');
                    setReportDescription('');
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Name *
                    </label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="e.g., High Net Worth Clients"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Add a description for this report..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Current Filters</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {searchQuery && <p>Search: "{searchQuery}"</p>}
                      {selectedStatus !== 'all' && <p>Status: {selectedStatus}</p>}
                      {selectedRiskLevel !== 'all' && <p>Risk Level: {selectedRiskLevel}</p>}
                      {selectedVulnerability !== 'all' && <p>Vulnerability: {selectedVulnerability}</p>}
                      {!searchQuery && selectedStatus === 'all' && selectedRiskLevel === 'all' && selectedVulnerability === 'all' && (
                        <p className="text-gray-400">No filters applied - showing all clients</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => {
                    setShowReportModal(false);
                    setEditingReport(null);
                    setReportName('');
                    setReportDescription('');
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={saveReport}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingReport ? 'Update Report' : 'Save Report'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
