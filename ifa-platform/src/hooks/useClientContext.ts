// src/hooks/useClientContext.ts
// ===================================================================
// UNIFIED CLIENT CONTEXT HOOK - URL-Based State Management
// FIXED: Better error handling for missing clients
// ===================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import type { Client } from '@/types/client';
import { clientService } from '@/services/ClientService';

interface UseClientContextReturn {
  client: Client | null;
  clientId: string | null;
  isLoading: boolean;
  error: string | null;
  isProspect: boolean;
  prospectId: string | null;
  refresh: () => Promise<void>;
}

export function useClientContext(): UseClientContextReturn {
  const searchParams = useSearchParams();
  const params = useParams();
  
  // Get clientId from multiple sources (URL param, query param)
  const clientIdFromParams = params?.id as string;
  const clientIdFromQuery = searchParams?.get('clientId');
  const prospectIdFromQuery = searchParams?.get('prospectId');
  const isProspect = searchParams?.get('isProspect') === 'true';
  
  const clientId = clientIdFromParams || clientIdFromQuery || null;
  const prospectId = prospectIdFromQuery || null;
  
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch client data with improved error handling
  const fetchClient = async () => {
    if (!clientId || isProspect) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const clientData = await clientService.getClientById(clientId);
      setClient(clientData);
    } catch (err) {
      // Determine error type and handle appropriately
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Check if it's a "not found" error (expected case)
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        // Use console.warn for expected cases
        console.warn(`Client lookup: Client with ID ${clientId} does not exist in database`);
        setError(`Client with ID ${clientId} does not exist`);
      } 
      // Check for network errors
      else if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('NetworkError')) {
        console.error('Network error while fetching client:', errorMessage);
        setError('Network error: Unable to connect to the server. Please check your connection.');
      }
      // Check for database/Supabase errors
      else if (errorMessage.includes('database') || errorMessage.includes('supabase') || errorMessage.includes('PGRST')) {
        console.error('Database error while fetching client:', errorMessage);
        setError(`Database error: ${errorMessage}`);
      }
      // Check for authentication errors
      else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        console.error('Authentication error while fetching client:', errorMessage);
        setError('Authentication error: Please log in again.');
      }
      // Generic error handling
      else {
        console.error('Unexpected error while fetching client:', err);
        setError(`Error loading client: ${errorMessage}`);
      }
      
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load prospect data from localStorage
  const loadProspect = () => {
    if (!prospectId || !isProspect) return;
    
    try {
      const prospectData = localStorage.getItem(`prospect_${prospectId}`);
      if (prospectData) {
        const parsed = JSON.parse(prospectData);
        // Convert prospect data to Client format
        setClient({
          id: prospectId,
          advisorId: '',
          firmId: '',
          clientRef: `PROSPECT-${prospectId.substring(0, 8)}`,
          personalDetails: parsed.clientData.personalDetails || {
            firstName: '',
            lastName: '',
            middleName: '',
            title: '',
            dateOfBirth: '',
            gender: '',
            maritalStatus: '',
            nationality: '',
            residency: '',
            employment_status: '',
            occupation: '',
            niNumber: ''
          },
          contactInfo: parsed.clientData.contactInfo || {
            email: '',
            phone: '',
            alternativePhone: '',
            address: {
              line1: '',
              line2: '',
              city: '',
              county: '',
              postcode: '',
              country: 'UK'
            },
            preferredContactMethod: 'email'
          },
          financialProfile: parsed.clientData.financialProfile || {
            annualIncome: 0,
            netWorth: 0,
            liquidAssets: 0,
            monthlyExpenses: 0,
            existingInvestments: 0,
            investmentExperience: '',
            investmentHorizon: '',
            pensionValue: 0,
            propertyValue: 0,
            mortgageBalance: 0,
            otherDebts: 0,
            emergencyFund: 0,
            taxBracket: ''
          },
          vulnerabilityAssessment: parsed.clientData.vulnerabilityAssessment || {
            is_vulnerable: false,
            vulnerabilityFactors: [],
            notes: '',
            reviewDate: ''
          },
          riskProfile: parsed.clientData.riskProfile || {
            attitudeToRisk: 3,
            riskCapacity: 'Medium',
            riskTolerance: 'Medium',
            experienceLevel: 'Intermediate',
            investmentObjectives: [],
            timeHorizon: '5-10 years',
            overall: 'Balanced'
          },
          status: 'prospect',
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt || parsed.createdAt
        } as Client);
        
        // Clear any previous errors when prospect loads successfully
        setError(null);
      } else {
        console.warn(`Prospect data not found in localStorage for ID: ${prospectId}`);
        setError(`Prospect with ID ${prospectId} not found in local storage`);
      }
    } catch (err) {
      console.error('Error loading prospect from localStorage:', err);
      setError('Failed to load prospect data from local storage');
    }
  };
  
  useEffect(() => {
    if (clientId && !isProspect) {
      fetchClient();
    } else if (prospectId && isProspect) {
      loadProspect();
    } else {
      // Clear client if no ID
      setClient(null);
      setError(null);
    }
  }, [clientId, prospectId, isProspect]);
  
  const refresh = async () => {
    if (clientId && !isProspect) {
      await fetchClient();
    } else if (prospectId && isProspect) {
      loadProspect();
    }
  };
  
  return {
    client,
    clientId,
    isLoading,
    error,
    isProspect,
    prospectId,
    refresh
  };
}