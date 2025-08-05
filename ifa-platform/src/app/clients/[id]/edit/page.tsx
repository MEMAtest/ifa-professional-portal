// src/app/clients/[id]/edit/page.tsx
// ✅ FIXED: Prevents auto-submission and ensures Step 5 works properly

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { clientService } from '@/services/ClientService';
import ClientForm from '@/components/clients/ClientForm';
import type { Client, ClientFormData } from '@/types/client';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate and extract client ID
  const clientId = params?.id as string;

  // Load client data
  useEffect(() => {
    if (!clientId) {
      setError('Invalid client ID');
      setLoading(false);
      return;
    }

    const loadClient = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const clientData = await clientService.getClientById(clientId);
        setClient(clientData);
      } catch (err) {
        console.error('Error loading client:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load client';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [clientId, toast]);

  // ✅ FIXED: Handle form submission without auto-redirect
  const handleSubmit = async (updatedClient: Client) => {
    if (!client) return;

    try {
      setSaving(true);
      setError(null);

      // Convert Client to ClientFormData for the update
      const formData: ClientFormData = {
        personalDetails: updatedClient.personalDetails,
        contactInfo: updatedClient.contactInfo,
        financialProfile: updatedClient.financialProfile,
        vulnerabilityAssessment: updatedClient.vulnerabilityAssessment,
        riskProfile: updatedClient.riskProfile,
        status: updatedClient.status
      };

      await clientService.updateClient(client.id, formData);
      
      toast({
        title: 'Success',
        description: 'Client updated successfully',
        variant: 'default'
      });

      // ✅ FIXED: Add delay before redirect to ensure user sees success message
      setTimeout(() => {
        router.push(`/clients/${client.id}?success=true`);
      }, 1000);
      
    } catch (err) {
      console.error('Error updating client:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client';
      
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setSaving(false);
    }
  };

  // ✅ FIXED: Handle save for ClientFormData without auto-redirect
  const handleSave = async (formData: ClientFormData) => {
    if (!client) return;

    try {
      setSaving(true);
      setError(null);
      
      // ✅ FIXED: Only update, don't redirect automatically
      await clientService.updateClient(client.id, formData);
      
      toast({
        title: 'Success',
        description: 'Client updated successfully',
        variant: 'default'
      });

      // ✅ FIXED: Add delay before redirect
      setTimeout(() => {
        router.push(`/clients/${client.id}?success=true`);
      }, 1000);
      
    } catch (err) {
      console.error('Error updating client:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setSaving(false);
    }
  };

  // Safe cancel handler
  const handleCancel = () => {
    try {
      // Try to navigate to the client details page
      if (clientId) {
        router.push(`/clients/${clientId}`);
      } else {
        // Fallback to clients list
        router.push('/clients');
      }
    } catch (err) {
      console.error('Navigation error:', err);
      // Ultimate fallback - use window.location
      window.location.href = clientId ? `/clients/${clientId}` : '/clients';
    }
  };

  // Loading state
  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? 'Error Loading Client' : 'Client Not Found'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || 'The requested client could not be found.'}
          </p>
          <button
            onClick={() => router.push('/clients')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Edit Client: {client.personalDetails.firstName} {client.personalDetails.lastName}
        </h1>
        <p className="text-lg text-gray-600 mt-1">
          Update client information and settings
        </p>
      </div>

      {/* ✅ FIXED: Pass correct props to prevent auto-submission */}
      <div className="relative">
        <ClientForm
          client={client}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={saving}
          isSubmitting={saving}
        />
      </div>
    </div>
  );
}