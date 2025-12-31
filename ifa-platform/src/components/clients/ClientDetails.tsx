// src/components/clients/ClientDetails.tsx
// ✅ COMPLETE VERSION - With All Calendar Integration Fixes

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VulnerabilityBadge } from './VulnerabilityBadge';
import { LogCommunicationModal } from '@/components/communications/LogCommunicationModal';
import { ScheduleReviewModal } from '@/components/reviews/ScheduleReviewModal';
import { EditReviewModal } from '@/components/reviews/EditReviewModal';
import { 
  Activity,
  ArrowLeft,
  Calculator,
  DollarSign,
  FileText,
  MessageSquare,
  TrendingUp,
  User
} from 'lucide-react';
import type { Client } from '@/types/client';
import { getVulnerabilityStatus } from '@/types/client';
import {
  calculateAge,
  getStatusColor
} from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useClientDetailsData } from '@/hooks/useClientDetailsData';
import { useClientCashFlowStatus } from '@/components/clients/detail/hooks/useClientCashFlowStatus';
import { useClientDetailsTabs } from '@/components/clients/detail/hooks/useClientDetailsTabs';
import { ActivityTab } from '@/components/clients/details/tabs/ActivityTab';
import { CashflowTab } from '@/components/clients/details/tabs/CashflowTab';
import { CommunicationsTab } from '@/components/clients/details/tabs/CommunicationsTab';
import { FinancialTab } from '@/components/clients/details/tabs/FinancialTab';
import { OverviewTab } from '@/components/clients/details/tabs/OverviewTab';
import { ReviewsTab } from '@/components/clients/details/tabs/ReviewsTab';
import { RiskProfileTab } from '@/components/clients/details/tabs/RiskProfileTab';

export interface ClientDetailsProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onAddCommunication: () => void;  // Keep for backwards compatibility
  onScheduleReview: () => void;
}

// Define tab types
type TabType = 'overview' | 'financial' | 'risk' | 'cashflow' | 'communications' | 'reviews' | 'activity';

export function ClientDetails({ 
  client, 
  onEdit, 
  onDelete, 
  onAddCommunication, 
  onScheduleReview 
}: ClientDetailsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient(); // ✅ ADD THIS LINE
  const { activeTab, setActiveTab } = useClientDetailsTabs();
  
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

  const { hasCashFlowAnalysis, cashFlowCount } = useClientCashFlowStatus(supabase, client.id);

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

  // Extract client details with proper type safety
  const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unnamed Client';
  const age = client.personalDetails?.dateOfBirth ? 
    calculateAge(client.personalDetails.dateOfBirth) : null;

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
        <OverviewTab client={client} age={age} isVulnerable={isVulnerable} />
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <FinancialTab client={client} investmentObjectives={investmentObjectives} />
      )}

      {/* Risk Profile Tab */}
      {activeTab === 'risk' && (
        <RiskProfileTab clientId={client.id} client={client} />
      )}

      {/* Cash Flow Tab */}
      {activeTab === 'cashflow' && <CashflowTab clientId={client.id} />}

      {/* ✅ UPDATED: Communications Tab with Real Data */}
      {activeTab === 'communications' && (
        <CommunicationsTab
          communications={communications}
          dataLoading={dataLoading}
          dataError={dataError}
          onAddCommunication={handleAddCommunication}
        />
      )}

      {/* ✅ UPDATED: Reviews Tab with Real Data and Click to Edit */}
      {activeTab === 'reviews' && (
        <ReviewsTab
          reviews={reviews}
          dataLoading={dataLoading}
          onEditReview={handleEditReview}
          onScheduleReview={handleScheduleReview}
        />
      )}

      {/* ✅ UPDATED: Activity Tab with Real Data */}
      {activeTab === 'activity' && (
        <ActivityTab activities={activities} dataLoading={dataLoading} />
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
