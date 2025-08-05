// src/components/clients/ClientDetails.tsx
// ✅ COMPLETE VERSION - With All Calendar Integration Fixes

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VulnerabilityBadge } from './VulnerabilityBadge';
import { LogCommunicationModal } from '@/components/communications/LogCommunicationModal';
import { ScheduleReviewModal } from '@/components/reviews/ScheduleReviewModal';
import { EditReviewModal } from '@/components/reviews/EditReviewModal';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  DollarSign, 
  Shield, 
  TrendingUp,
  MessageSquare,
  FileText,
  Activity,
  Calculator,
  Clock,
  AlertCircle,
  PieChart,
  TrendingDown,
  Target,
  Briefcase,
  CheckCircle,
  ArrowLeft,
  Edit
} from 'lucide-react';
import type { Client } from '@/types/client';
import { getVulnerabilityStatus } from '@/types/client';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getRiskLevelName,
  getRiskLevelColor,
  calculateAge
} from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useClientDetailsData, createCommunication, scheduleReview } from '@/hooks/useClientDetailsData';

// Import the Cash Flow Dashboard component
import CashFlowDashboard from '@/components/cashflow/CashFlowDashboard';

export interface ClientDetailsProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onAddCommunication: () => void;  // Keep for backwards compatibility
  onScheduleReview: () => void;
}

// Define tab types
type TabType = 'overview' | 'financial' | 'risk' | 'cashflow' | 'communications' | 'reviews' | 'activity';

// Assessment type interfaces
interface AtrAssessment {
  id: string;
  client_id: string;
  risk_level: number;
  risk_category: string;
  total_score: number;
  assessment_date: string;
  is_current: boolean;
}

interface CflAssessment {
  id: string;
  client_id: string;
  capacity_level: number;
  capacity_category: string;
  total_score: number;
  max_loss_percentage: number;
  assessment_date: string;
  is_current: boolean;
}

interface RiskProfileData {
  final_risk_level: number;
  final_risk_category: string;
}

export function ClientDetails({ 
  client, 
  onEdit, 
  onDelete, 
  onAddCommunication, 
  onScheduleReview 
}: ClientDetailsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasCashFlowAnalysis, setHasCashFlowAnalysis] = useState(false);
  const [cashFlowCount, setCashFlowCount] = useState(0);
  
  // ✅ ADD: Modal states
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  
  // ✅ UPDATED: Use the real data hook instead of mock data
  const { 
    communications, 
    reviews, 
    activities, 
    loading: dataLoading, 
    error: dataError,
    refresh 
  } = useClientDetailsData(client);

  // ✅ ADD: Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      const validTabs: TabType[] = ['overview', 'financial', 'risk', 'cashflow', 'communications', 'reviews', 'activity'];
      if (validTabs.includes(tabParam as TabType)) {
        setActiveTab(tabParam as TabType);
      }
    }
  }, [searchParams]);

  // Check for existing cash flow scenarios
  useEffect(() => {
    checkCashFlowData();
  }, [client.id]);

  const checkCashFlowData = async (): Promise<void> => {
    try {
      const { data, error, count } = await supabase
        .from('cash_flow_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('is_active', true);

      if (error) {
        throw error;
      }
      
      if (count !== null) {
        setHasCashFlowAnalysis(count > 0);
        setCashFlowCount(count);
      }
    } catch (error) {
      console.error('Error checking cash flow data:', error);
      setHasCashFlowAnalysis(false);
      setCashFlowCount(0);
    }
  };

  // ✅ ADD: Handler for adding communication
  const handleAddCommunication = () => {
    setShowCommunicationModal(true);
  };

  // ✅ UPDATED: Handler for scheduling review
  const handleScheduleReview = () => {
    setShowReviewModal(true);
  };

  // ✅ ADD: Handler for editing review
  const handleEditReview = (review: any) => {
    setSelectedReview(review);
    setShowEditReviewModal(true);
  };

  // ✅ ADD: Handler for back navigation
  const handleBackNavigation = () => {
    const fromParam = searchParams?.get('from');
    if (fromParam === 'calendar') {
      router.push('/calendar');
    } else {
      router.push('/clients');
    }
  };

  // Risk Profile Tab Component (internal to ClientDetails)
  const RiskProfileTabContent = ({ clientId, client }: { clientId: string; client: Client }) => {
    const router = useRouter();
    const [atrAssessment, setAtrAssessment] = useState<AtrAssessment | null>(null);
    const [cflAssessment, setCflAssessment] = useState<CflAssessment | null>(null);
    const [riskProfile, setRiskProfile] = useState<RiskProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadAssessments();
    }, [clientId]);

    const loadAssessments = async (): Promise<void> => {
      try {
        // Fetch ATR assessment
        const { data: atrArray, error: atrError } = await supabase
          .from('atr_assessments')
          .select('*')
          .match({ 
            client_id: clientId,
            is_current: true 
          });
        
        const atr = atrArray?.[0] || null;
        
        if (atrError && atrError.code !== 'PGRST116') {
          console.error('ATR fetch error:', atrError);
        }

        // Fetch CFL assessment
        const { data: cflArray, error: cflError } = await supabase
          .from('cfl_assessments')
          .select('*')
          .match({ 
            client_id: clientId,
            is_current: true 
          });
        
        const cfl = cflArray?.[0] || null;
        
        if (cflError && cflError.code !== 'PGRST116') {
          console.error('CFL fetch error:', cflError);
        }

        // Fetch client risk profile
        const { data: clientData } = await supabase
          .from('clients')
          .select('risk_profile')
          .eq('id', clientId)
          .single();

        const profile = clientData?.risk_profile || null;

        setAtrAssessment(atr);
        setCflAssessment(cfl);
        setRiskProfile(profile);
      } catch (error) {
        console.error('Error loading assessments:', error);
      } finally {
        setLoading(false);
      }
    };

    // Use new assessment data if available, fall back to old client.riskProfile data
    const hasNewAssessments = atrAssessment || cflAssessment || riskProfile;
    const displayRiskLevel = riskProfile?.final_risk_level || client.riskProfile?.attitudeToRisk || 5;
    const displayRiskCategory = riskProfile?.final_risk_category || getRiskLevelName(displayRiskLevel);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Assessment Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : hasNewAssessments ? (
              // New assessment system display
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {atrAssessment?.risk_level || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">ATR Level</p>
                    <Badge className="mt-2">
                      {atrAssessment?.risk_category || 'Not Assessed'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {cflAssessment?.capacity_level || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">CFL Level</p>
                    <Badge className="mt-2" variant="secondary">
                      {cflAssessment?.capacity_category || 'Not Assessed'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {riskProfile?.final_risk_level || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Final Risk Level</p>
                    <Badge className="mt-2" variant="default">
                      {riskProfile?.final_risk_category || 'Not Calculated'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {cflAssessment?.max_loss_percentage || 0}%
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Max Loss Tolerance</p>
                  </div>
                </div>

                {/* Assessment Actions */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ATR Assessment Status */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="font-medium">Attitude to Risk (ATR)</h4>
                        </div>
                        {atrAssessment ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {atrAssessment 
                          ? `Assessed on ${formatDate(atrAssessment.assessment_date)}`
                          : 'No assessment completed'}
                      </p>
                      <Button 
                        size="sm"
                        variant={atrAssessment ? "outline" : "default"}
                        onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
                      >
                        {atrAssessment ? 'Update Assessment' : 'Complete Assessment'}
                      </Button>
                    </div>

                    {/* CFL Assessment Status */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Calculator className="h-5 w-5 text-green-600 mr-2" />
                          <h4 className="font-medium">Capacity for Loss (CFL)</h4>
                        </div>
                        {cflAssessment ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {cflAssessment 
                          ? `Assessed on ${formatDate(cflAssessment.assessment_date)}`
                          : 'No assessment completed'}
                      </p>
                      <Button 
                        size="sm"
                        variant={cflAssessment ? "outline" : "default"}
                        onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
                      >
                        {cflAssessment ? 'Update Assessment' : 'Complete Assessment'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Fallback to old system display
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {client.riskProfile?.attitudeToRisk || 5}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Attitude to Risk Score</p>
                    <Badge className="mt-2">{getRiskLevelName(client.riskProfile?.attitudeToRisk || 5)}</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {client.riskProfile?.riskCapacity || 'Not Set'}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Risk Capacity</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {client.riskProfile?.capacityForLoss || 'Not Set'}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Capacity for Loss</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {client.riskProfile?.assessmentScore || 0}%
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Assessment Score</p>
                  </div>
                </div>

                {/* Upgrade prompt */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">New Assessment System Available</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Complete the new ATR and CFL assessments for more comprehensive risk profiling.
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          size="sm"
                          onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}
                        >
                          Start ATR Assessment
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}
                        >
                          Start CFL Assessment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Risk Details */}
        {(atrAssessment || cflAssessment) && (
          <>
            {/* ATR Details */}
            {atrAssessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    ATR Assessment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Score</p>
                      <p className="text-xl font-bold">{atrAssessment.total_score.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Risk Category</p>
                      <Badge className="mt-1">{atrAssessment.risk_category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Assessment Date</p>
                      <p className="font-medium">{formatDate(atrAssessment.assessment_date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CFL Details */}
            {cflAssessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    CFL Assessment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Capacity Score</p>
                      <p className="text-xl font-bold">{cflAssessment.total_score.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Capacity Category</p>
                      <Badge className="mt-1" variant="secondary">{cflAssessment.capacity_category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Max Loss Tolerance</p>
                      <p className="font-medium">{cflAssessment.max_loss_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Assessment Date</p>
                      <p className="font-medium">{formatDate(cflAssessment.assessment_date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Legacy Risk Profile Card */}
        {!hasNewAssessments && client.riskProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Risk Profile (Legacy)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Risk Tolerance</span>
                  <Badge className={getRiskLevelColor(displayRiskCategory)}>
                    {displayRiskCategory}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Risk Capacity</span>
                  <span className="font-medium">
                    {client.riskProfile?.riskCapacity || 'Not assessed'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Knowledge & Experience</span>
                  <span className="font-medium">
                    {client.riskProfile?.knowledgeExperience || 'Not assessed'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Last Assessment</span>
                  <span className="font-medium">
                    {client.riskProfile?.lastAssessment 
                      ? formatDate(client.riskProfile.lastAssessment)
                      : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Extract client details with proper type safety
  const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unnamed Client';
  const age = client.personalDetails?.dateOfBirth ? 
    calculateAge(client.personalDetails.dateOfBirth) : null;

  const riskTolerance = client.riskProfile?.riskTolerance || 'Not assessed';
  const riskToleranceName = typeof riskTolerance === 'number' ? 
    getRiskLevelName(riskTolerance) : riskTolerance;
  const clientStatus = typeof client.status === 'string' ? client.status : 'inactive';
  const isVulnerable = getVulnerabilityStatus(client.vulnerabilityAssessment);

  const getInvestmentObjectives = (): string[] => {
    if (!client.financialProfile?.investmentObjectives) return [];
    
    return client.financialProfile.investmentObjectives.map((objective, index) => {
      if (typeof objective === 'string') {
        return objective;
      } else if (typeof objective === 'object' && objective !== null) {
        const obj = objective as any;
        return obj.description || obj.type || obj.name || `Investment Goal ${index + 1}`;
      }
      return `Investment Goal ${index + 1}`;
    });
  };

  const investmentObjectives = getInvestmentObjectives();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {/* ✅ ADD: Back Button */}
          <button
            onClick={handleBackNavigation}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {searchParams?.get('from') === 'calendar' ? 'Back to Calendar' : 'Back to Clients'}
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            <p className="text-gray-600">Client Reference: {client.clientRef || 'No Reference'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`${getStatusColor(clientStatus)} border`}>
            {clientStatus.replace('_', ' ').toUpperCase()}
          </Badge>
          {isVulnerable === true && <VulnerabilityBadge />}
          <Button onClick={onEdit} variant="outline">
            Edit Client
          </Button>
          <Button onClick={handleScheduleReview} variant="outline">
            Schedule Review
          </Button>
          {/* ✅ UPDATED: Use local handler */}
          <Button onClick={handleAddCommunication} variant="outline">
            Log Communication
          </Button>
          <Button onClick={onDelete} variant="destructive">
            Delete
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'financial', label: 'Financial', icon: DollarSign },
            { id: 'risk', label: 'Risk Profile', icon: TrendingUp },
            { id: 'cashflow', label: 'Cash Flow', icon: Calculator },
            { id: 'communications', label: 'Communications', icon: MessageSquare },
            { id: 'reviews', label: 'Reviews', icon: FileText },
            { id: 'activity', label: 'Activity', icon: Activity }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {id === 'cashflow' && hasCashFlowAnalysis && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {cashFlowCount}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB CONTENT */}
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">
                    {client.personalDetails?.dateOfBirth 
                      ? formatDate(client.personalDetails.dateOfBirth)
                      : 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{age ? `${age} years` : 'Not available'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Occupation</p>
                <p className="font-medium">{client.personalDetails?.occupation || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Marital Status</p>
                <p className="font-medium">{client.personalDetails?.maritalStatus || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Dependents</p>
                <p className="font-medium">{client.personalDetails?.dependents || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {client.contactInfo?.email || 'No email provided'}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {client.contactInfo?.phone || 'No phone provided'}
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm">
                  {typeof client.contactInfo?.address === 'string'
                    ? client.contactInfo.address
                    : client.contactInfo?.address && typeof client.contactInfo.address === 'object'
                      ? [
                          client.contactInfo.address.line1,
                          client.contactInfo.address.line2,
                          client.contactInfo.address.city,
                          client.contactInfo.address.postcode,
                          client.contactInfo.address.country
                        ]
                          .filter(Boolean)
                          .join(', ')
                      : 'No address provided'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Risk Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Risk Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Risk Tolerance</span>
                  <Badge className={getRiskLevelColor(riskToleranceName)}>
                    {riskToleranceName}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Risk Capacity</span>
                  <span className="font-medium">
                    {client.riskProfile?.riskCapacity || 'Not assessed'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Knowledge & Experience</span>
                  <span className="font-medium">
                    {client.riskProfile?.knowledgeExperience || 'Not assessed'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Last Assessment</span>
                  <span className="font-medium">
                    {client.riskProfile?.lastAssessment 
                      ? formatDate(client.riskProfile.lastAssessment)
                      : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vulnerability Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Vulnerability Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge 
                    variant={isVulnerable ? 'destructive' : 'default'}
                    className={isVulnerable ? '' : 'bg-green-100 text-green-800'}
                  >
                    {isVulnerable ? 'Vulnerable' : 'Not Vulnerable'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Last Assessed</span>
                  <span className="font-medium">
                    {client.vulnerabilityAssessment?.lastAssessed 
                      ? formatDate(client.vulnerabilityAssessment.lastAssessed)
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
              {client.vulnerabilityAssessment?.assessmentNotes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{client.vulnerabilityAssessment.assessmentNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income & Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Income & Assets</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Annual Income</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(client.financialProfile?.annualIncome || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Net Worth</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(client.financialProfile?.netWorth || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Liquid Assets</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(client.financialProfile?.liquidAssets || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{width: '40%'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses & Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5" />
                <span>Expenses & Liabilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Monthly Expenses</span>
                  <span className="font-medium">
                    {formatCurrency(client.financialProfile?.monthlyExpenses || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Debt</span>
                  <span className="font-medium">
                    {formatCurrency((client.financialProfile as any)?.totalDebt || 0)}
                  </span>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Savings Rate</span>
                    <span className="text-lg font-bold text-blue-600">
                      {client.financialProfile?.annualIncome && client.financialProfile?.monthlyExpenses
                        ? Math.round(((client.financialProfile.annualIncome - (client.financialProfile.monthlyExpenses * 12)) / client.financialProfile.annualIncome) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Objectives */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Investment Objectives</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Primary Objectives</p>
                  {investmentObjectives.length > 0 ? (
                    <ul className="space-y-2">
                      {investmentObjectives.map((objective, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                          <span className="text-sm">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No objectives set</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Investment Timeframe</p>
                  <p className="text-lg font-medium">
                    {client.financialProfile?.investmentTimeframe || 'Not specified'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Profile Tab */}
      {activeTab === 'risk' && (
        <RiskProfileTabContent clientId={client.id} client={client} />
      )}

      {/* Cash Flow Tab */}
      {activeTab === 'cashflow' && (
        <div className="relative">
          <CashFlowDashboard clientId={client.id} />
        </div>
      )}

      {/* ✅ UPDATED: Communications Tab with Real Data */}
      {activeTab === 'communications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Communication History</CardTitle>
                <Button onClick={handleAddCommunication} size="sm">
                  Add Communication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : dataError ? (
                <div className="text-center text-red-600 py-8">{dataError}</div>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          comm.type === 'email' ? 'bg-blue-100' : 
                          comm.type === 'call' ? 'bg-green-100' : 
                          comm.type === 'meeting' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {comm.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                          {comm.type === 'call' && <Phone className="h-5 w-5 text-green-600" />}
                          {comm.type === 'meeting' && <Calendar className="h-5 w-5 text-purple-600" />}
                          {comm.type === 'note' && <FileText className="h-5 w-5 text-gray-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{comm.subject}</p>
                          <p className="text-sm text-gray-500">{formatDate(comm.date)}</p>
                          {comm.content && (
                            <p className="text-sm text-gray-600 mt-1">{comm.content}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={comm.status === 'completed' ? 'default' : 'secondary'}>
                        {comm.status}
                      </Badge>
                    </div>
                  ))}
                  {communications.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No communications recorded</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ UPDATED: Reviews Tab with Real Data and Click to Edit */}
      {activeTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Review History</CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleEditReview(review)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{review.review_type}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              review.status === 'completed' ? 'default' : 
                              review.status === 'overdue' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {review.status}
                          </Badge>
                          <Edit className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {review.status === 'completed' && review.completed_date
                          ? `Completed on ${formatDate(review.completed_date)}`
                          : `Due on ${formatDate(review.due_date)}`
                        }
                      </p>
                      {review.review_summary && (
                        <p className="text-sm">{review.review_summary}</p>
                      )}
                      {review.next_review_date && (
                        <p className="text-sm text-blue-600 mt-2">
                          Next review: {formatDate(review.next_review_date)}
                        </p>
                      )}
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No reviews recorded</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Review</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const upcomingReview = reviews.find(r => r.status === 'pending' || r.status === 'overdue');
                
                if (upcomingReview) {
                  return (
                    <div className="space-y-4">
                      <div className="text-center">
                        <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <h4 className="font-medium text-lg">{upcomingReview.review_type}</h4>
                        <p className="text-gray-600 mt-2">
                          Due on {formatDate(upcomingReview.due_date)}
                        </p>
                        {upcomingReview.status === 'overdue' && (
                          <Badge variant="destructive" className="mt-2">Overdue</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReview(upcomingReview);
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button size="sm">
                          Complete Review
                        </Button>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No review scheduled</p>
                    <Button onClick={handleScheduleReview}>
                      Schedule Review
                    </Button>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ UPDATED: Activity Tab with Real Data */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Activity className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {activity.type && (
                            <p className="text-sm text-gray-600">
                              Type: {activity.type}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(activity.date)}</span>
                      </div>
                      {activity.user_name && (
                        <p className="text-sm text-gray-500 mt-1">
                          by {activity.user_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No activity recorded</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ ADD: Communication Modal */}
      <LogCommunicationModal
        isOpen={showCommunicationModal}
        onClose={() => setShowCommunicationModal(false)}
        clientId={client.id}
        clientName={`${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()}
        onSuccess={() => {
          refresh?.();
          setShowCommunicationModal(false);
        }}
      />

      {/* ✅ ADD: Review Scheduling Modal */}
      <ScheduleReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        clientId={client.id}
        clientName={`${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()}
        onSuccess={() => {
          refresh?.();
          setShowReviewModal(false);
        }}
        existingReviews={reviews.map(r => ({
          id: r.id,
          due_date: r.due_date,
          status: r.status as 'scheduled' | 'in_progress' | 'completed' | 'overdue',
          review_type: r.review_type
        }))}
      />

      {/* ✅ ADD: Edit Review Modal */}
      {showEditReviewModal && selectedReview && (
        <EditReviewModal
          isOpen={showEditReviewModal}
          onClose={() => {
            setShowEditReviewModal(false);
            setSelectedReview(null);
          }}
          review={selectedReview}
          clientName={fullName}
          onSuccess={() => {
            refresh?.();
            setShowEditReviewModal(false);
            setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
}