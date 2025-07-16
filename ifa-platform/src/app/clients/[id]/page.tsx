// ===================================================================
// src/app/clients/[id]/page.tsx - PRODUCTION READY - Complete File
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService';
import { getVulnerabilityStatus } from '@/types/client';
import RiskProfileTab from '@/components/clients/RiskProfileTab';
import type { Client } from '@/types/client';

// Page Params Interface
interface PageParams {
  id: string;
}

// Utility Functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default function ClientDetailsPage() {
  const router = useRouter();
  const rawParams = useParams();
  
  // Safe params handling
  const params: PageParams | null = rawParams && typeof rawParams.id === 'string' 
    ? { id: rawParams.id }
    : null;

  if (!params) {
    notFound();
    return null;
  }

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // State
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load client data
  useEffect(() => {
    const loadClient = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        const clientData = await clientService.getClientById(params.id);
        setClient(clientData);
      } catch (err) {
        console.error('Error loading client:', err);
        setError(err instanceof Error ? err.message : 'Failed to load client');
        toast({
          title: 'Error',
          description: 'Failed to load client details',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [params.id, toast]);

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/clients/${params.id}/edit`);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!client || !confirm('Are you sure you want to delete this client?')) return;

    try {
      await clientService.deleteClient(client.id);
      toast({
        title: 'Success',
        description: 'Client deleted successfully',
        variant: 'default'
      });
      router.push('/clients');
    } catch (err) {
      console.error('Error deleting client:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive'
      });
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested client could not be found.'}</p>
          <Button onClick={() => router.push('/clients')}>
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  // Extract data for easier access
  const { personalDetails, contactInfo, financialProfile, vulnerabilityAssessment, riskProfile } = client;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {personalDetails.firstName} {personalDetails.lastName}
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            {personalDetails.title} • {capitalizeFirstLetter(client.status)}
          </p>
          {client.clientRef && (
            <p className="text-sm text-gray-500 mt-1">
              Client Reference: {client.clientRef}
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleEdit}>
            Edit Client
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete Client
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
          {capitalizeFirstLetter(client.status)}
        </Badge>
        {vulnerabilityAssessment?.is_vulnerable && (
          <Badge variant="destructive">
            Vulnerable Client
          </Badge>
        )}
        {riskProfile?.riskTolerance && (
          <Badge variant="outline">
            Risk: {capitalizeFirstLetter(riskProfile.riskTolerance)}
          </Badge>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                <p className="text-sm text-gray-900">{formatDate(personalDetails.dateOfBirth)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nationality</label>
                <p className="text-sm text-gray-900">{personalDetails.nationality}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Marital Status</label>
                <p className="text-sm text-gray-900">{capitalizeFirstLetter(personalDetails.maritalStatus.replace('_', ' '))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Dependents</label>
                <p className="text-sm text-gray-900">{personalDetails.dependents}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Employment</label>
                <p className="text-sm text-gray-900">{capitalizeFirstLetter(personalDetails.employmentStatus.replace('_', ' '))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Occupation</label>
                <p className="text-sm text-gray-900">{personalDetails.occupation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm text-gray-900">{contactInfo.email}</p>
            </div>
            {contactInfo.phone && (
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-sm text-gray-900">{contactInfo.phone}</p>
              </div>
            )}
            {contactInfo.mobile && (
              <div>
                <label className="text-sm font-medium text-gray-500">Mobile</label>
                <p className="text-sm text-gray-900">{contactInfo.mobile}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <div className="text-sm text-gray-900">
                <p>{contactInfo.address.line1}</p>
                {contactInfo.address.line2 && <p>{contactInfo.address.line2}</p>}
                <p>{contactInfo.address.city}, {contactInfo.address.county}</p>
                <p>{contactInfo.address.postcode}</p>
                <p>{contactInfo.address.country}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Preferred Contact</label>
              <p className="text-sm text-gray-900">{capitalizeFirstLetter(contactInfo.preferredContact)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Annual Income</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.annualIncome || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Net Worth</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.netWorth || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Liquid Assets</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.liquidAssets || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Monthly Expenses</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.monthlyExpenses || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Risk Tolerance</label>
              <p className="text-2xl font-bold text-gray-900">{riskProfile?.riskTolerance || 'Not assessed'}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Investment Timeframe</label>
                <p className="text-sm text-gray-900">
                  {financialProfile?.investmentTimeframe ? 
                    capitalizeFirstLetter(financialProfile.investmentTimeframe.replace('_', ' ')) : 
                    'Not specified'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Annual Income</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.annualIncome || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Net Worth</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.netWorth || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Liquid Assets</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.liquidAssets || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Monthly Expenses</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(financialProfile?.monthlyExpenses || 0)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Investment Timeframe</label>
              <p className="text-sm text-gray-900">
                {(financialProfile?.investmentTimeframe || 'not_specified').replace('_', ' ')}
              </p>
            </div>

          {financialProfile?.investmentObjectives && financialProfile.investmentObjectives.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Investment Objectives</label>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {financialProfile?.investmentObjectives?.map((objective: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {capitalizeFirstLetter(objective.replace('_', ' '))}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Risk Assessment Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Risk Tolerance</label>
                <p className="text-xl font-semibold text-gray-900">{riskProfile?.riskTolerance || 'Not assessed'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Risk Capacity</label>
                <p className="text-xl font-semibold text-gray-900">{riskProfile?.riskCapacity || 'Not assessed'}</p>
              </div>
              <div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Attitude to Risk</label>
                    <p className="text-xl font-semibold text-gray-900">{riskProfile?.attitudeToRisk || 0}/10</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${((riskProfile?.attitudeToRisk || 0) / 10) * 100}%` }}
                        ></div>
                    </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Capacity for Loss</label>
                <p className="text-xl font-semibold text-gray-900">{riskProfile?.capacityForLoss || 'Not assessed'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Knowledge & Experience</label>
                <p className="text-xl font-semibold text-gray-900">{riskProfile?.knowledgeExperience || 'Not assessed'}</p>
              </div>
              {riskProfile?.lastAssessment && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Assessment</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(riskProfile?.lastAssessment)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vulnerability Assessment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vulnerability Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Vulnerability Status</label>
              <div className="mt-2">
                {vulnerabilityAssessment?.is_vulnerable ? (
                  <Badge variant="destructive">Vulnerable Client</Badge>
                ) : (
                  <Badge variant="default">Not Vulnerable</Badge>
                )}
              </div>
            </div>
            
              {vulnerabilityAssessment?.vulnerabilityFactors && vulnerabilityAssessment.vulnerabilityFactors.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Vulnerability Factors</label>
                  <div className="mt-2 space-y-1">
                    {vulnerabilityAssessment?.vulnerabilityFactors?.map((factor: string, index: number) => (
                      <Badge key={index} variant="outline" className="mr-2 mb-2">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {vulnerabilityAssessment?.supportNeeds && vulnerabilityAssessment.supportNeeds.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Support Needs</label>
                  <div className="mt-2 space-y-1">
                    {vulnerabilityAssessment?.supportNeeds?.map((need: string, index: number) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">
                        {need}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {vulnerabilityAssessment?.assessmentNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assessment Notes</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {vulnerabilityAssessment?.assessmentNotes}
                  </p>
                </div>
              )}
          </CardContent>
        </Card>

      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end space-x-4">
        <Button variant="outline" onClick={() => router.push('/clients')}>
          Back to Clients
        </Button>
        <Button onClick={handleEdit}>
          Edit Client
        </Button>
      </div>
    </div>
  );
}