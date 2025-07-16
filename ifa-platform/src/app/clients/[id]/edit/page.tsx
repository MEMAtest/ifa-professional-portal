// ===================================================================
// src/app/clients/[id]/edit/page.tsx - FIXED VERSION
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { clientService } from '@/services/ClientService';
import type { Client, ClientFormData } from '@/types/client';

// ✅ FIX: Import the REAL ClientForm component
import ClientForm from '@/components/clients/ClientForm';

// Page Params Interface
interface PageParams {
  id: string;
}

export default function EditClientPage() {
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
  const [saving, setSaving] = useState(false);
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

  // Handle form submission - Updated to match ClientForm expectations
  const handleSubmit = async (updatedClient: Client) => {
    if (!client) return;

    try {
      setSaving(true);

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

      // Redirect to client details page
      router.push(`/clients/${client.id}?success=${encodeURIComponent('Client updated successfully')}`);
    } catch (err) {
      console.error('Error updating client:', err);
      
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive'
        });
      } else {
        setError('Failed to update client');
        toast({
          title: 'Error',
          description: 'Failed to update client',
          variant: 'destructive'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle save (for ClientFormData) - Alternative handler
  const handleSave = async (formData: ClientFormData) => {
    if (!client) return;

    try {
      setSaving(true);
      await clientService.updateClient(client.id, formData);
      
      toast({
        title: 'Success',
        description: 'Client updated successfully',
        variant: 'default'
      });

      router.push(`/clients/${client.id}?success=${encodeURIComponent('Client updated successfully')}`);
    } catch (err) {
      console.error('Error updating client:', err);
      
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update client',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/clients/${params.id}`);
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
          <button
            onClick={() => router.push('/clients')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

      {/* ✅ FIXED: Now using the real ClientForm component */}
      <ClientForm
        client={client}
        onSubmit={handleSubmit}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={saving}
        isSubmitting={saving}
      />
    </div>
  );
}