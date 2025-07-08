// =====================================================
// CLIENT DETAILS - CASH FLOW INTEGRATION
// Phase 1: Integration with existing client management
// File: src/components/clients/ClientDetails.tsx (UPDATED)
// =====================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VulnerabilityBadge } from './VulnerabilityBadge';
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
  Calculator  // ADD: Cash Flow icon
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

// Import new cash flow component
// import { CashFlowDashboard } from '../cashflow/CashFlowDashboard';

// =====================================================
// PROPS INTERFACE (KEEPING YOUR EXISTING INTERFACE)
// =====================================================

export interface ClientDetailsProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onAddCommunication: () => void;
  onScheduleReview: () => void;
}

// =====================================================
// UPDATED CLIENT DETAILS COMPONENT
// =====================================================

export function ClientDetails({ 
  client, 
  onEdit, 
  onDelete, 
  onAddCommunication, 
  onScheduleReview 
}: ClientDetailsProps) {
  // ADD: State for cash flow analysis tracking
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'risk' | 'communications' | 'reviews' | 'activity' | 'cashflow'>('overview');
  const [hasCashFlowAnalysis, setHasCashFlowAnalysis] = useState(false);
  const [cashFlowCount, setCashFlowCount] = useState(0);

  // ADD: Check for existing cash flow scenarios
  React.useEffect(() => {
    checkCashFlowData();
  }, [client.id]);

  const checkCashFlowData = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('id')
        .eq('clientId', client.id)
        .eq('isActive', true);

      if (!error && data) {
        setHasCashFlowAnalysis(data.length > 0);
        setCashFlowCount(data.length);
      }
    } catch (error) {
      console.error('Error checking cash flow data:', error);
    }
  };

  // KEEP: All your existing data extraction logic
  const fullName = [
    client.personalDetails?.firstName || '',
    client.personalDetails?.lastName || ''
  ].filter(Boolean).join(' ') || 'Unnamed Client';

  const age = client.personalDetails?.dateOfBirth ? calculateAge(client.personalDetails.dateOfBirth) : null;
  const riskTolerance = client.riskProfile?.riskTolerance || 'Unknown';
  const riskToleranceName = typeof riskTolerance === 'string' ? riskTolerance : getRiskLevelName(riskTolerance);
  const clientStatus = typeof client.status === 'string' ? client.status : 'inactive';
  const isVulnerable = getVulnerabilityStatus(client.vulnerabilityAssessment);
  
  const getInvestmentObjectives = () => {
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
      {/* KEEP: Your existing header exactly as is */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-gray-600">Client Reference: {client.clientRef || 'No Reference'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`${getStatusColor(clientStatus)} border`}>
            {clientStatus.replace('_', ' ').toUpperCase()}
          </Badge>
          {isVulnerable === true && <VulnerabilityBadge />}
          <Button onClick={onEdit} variant="outline">
            Edit Client
          </Button>
          <Button onClick={onScheduleReview} variant="outline">
            Schedule Review
          </Button>
          <Button onClick={onAddCommunication} variant="outline">
            Log Communication
          </Button>
          <Button onClick={onDelete} variant="destructive">
            Delete
          </Button>
        </div>
      </div>

      {/* UPDATED: Add Cash Flow tab to your existing tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'financial', label: 'Financial', icon: DollarSign },
            { id: 'risk', label: 'Risk Profile', icon: TrendingUp },
            { id: 'cashflow', label: 'Cash Flow', icon: Calculator }, // ADD: New Cash Flow tab
            { id: 'communications', label: 'Communications', icon: MessageSquare },
            { id: 'reviews', label: 'Reviews', icon: FileText },
            { id: 'activity', label: 'Activity', icon: Activity }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {/* ADD: Show badge for cash flow tab if scenarios exist */}
              {id === 'cashflow' && hasCashFlowAnalysis && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {cashFlowCount}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* KEEP: All your existing tab content exactly as is */}
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
                  {age && <p className="text-xs text-gray-500">{age} years old</p>}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nationality</p>
                  <p className="font-medium">{client.personalDetails?.nationality || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marital Status</p>
                  <p className="font-medium capitalize">{client.personalDetails?.maritalStatus || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dependents</p>
                  <p className="font-medium">{client.personalDetails?.dependents || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Employment</p>
                  <p className="font-medium capitalize">{client.personalDetails?.employmentStatus || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Occupation</p>
                  <p className="font-medium">{client.personalDetails?.occupation || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{client.contactInfo?.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.contactInfo?.phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    {client.contactInfo?.address ? (
                      <div className="text-sm">
                        {client.contactInfo.address.line1 && <p>{client.contactInfo.address.line1}</p>}
                        {client.contactInfo.address.city && <p>{client.contactInfo.address.city}</p>}
                        {client.contactInfo.address.county && <p>{client.contactInfo.address.county}</p>}
                        {client.contactInfo.address.postcode && <p>{client.contactInfo.address.postcode}</p>}
                        {client.contactInfo.address.country && <p>{client.contactInfo.address.country}</p>}
                      </div>
                    ) : (
                      <span>No address provided</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Financial Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Annual Income</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(client.financialProfile?.annualIncome || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Net Worth</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(client.financialProfile?.netWorth || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Liquid Assets</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(client.financialProfile?.liquidAssets || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Monthly Expenses</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(client.financialProfile?.monthlyExpenses || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Risk Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Tolerance</span>
                <Badge className={`${getRiskLevelColor(riskTolerance)} border`}>
                  {riskToleranceName}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Capacity</span>
                <span className="font-medium">{client.riskProfile?.riskCapacity || 'Not assessed'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Knowledge & Experience</span>
                <span className="font-medium">{client.riskProfile?.knowledgeExperience || 'Not assessed'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Investment Objectives */}
          {investmentObjectives.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Investment Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {investmentObjectives.map((objective, index) => (
                    <Badge key={index} variant="outline">
                      {objective}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vulnerability Assessment */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vulnerability Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isVulnerable === true ? (
                    <div className="flex items-center space-x-2 text-red-600">
                      <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                      <span className="font-medium">Considered Vulnerable</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Not Considered Vulnerable</span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  Last assessed: {
                    client.vulnerabilityAssessment?.lastAssessed 
                      ? formatDate(client.vulnerabilityAssessment.lastAssessed)
                      : 'Never'
                  }
                </span>
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

      {/* KEEP: All your other existing tabs exactly as they are */}
      {activeTab === 'financial' && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Details</h3>
            <p className="text-gray-600">Detailed financial information and portfolio analysis will be displayed here.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'risk' && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Risk Analysis</h3>
            <p className="text-gray-600">Comprehensive risk assessment and tolerance analysis will be displayed here.</p>
          </CardContent>
        </Card>
      )}

      {/* ADD: New Cash Flow tab content */}
      {activeTab === 'cashflow' && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cash Flow Analysis</h3>
            <p className="text-gray-600">Cash flow scenarios and analysis will be displayed here.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'communications' && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Communications</h3>
            <p className="text-gray-600">Client communication history and logs will be displayed here.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reviews' && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reviews</h3>
            <p className="text-gray-600">Annual reviews and assessment history will be displayed here.</p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Activity Log</h3>
            <p className="text-gray-600">Client activity and interaction timeline will be displayed here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}