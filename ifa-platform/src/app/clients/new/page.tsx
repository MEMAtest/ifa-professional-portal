// src/app/clients/new/page.tsx
// ✅ FIXED: Uses onSave with ClientService

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import ClientForm from '@/components/clients/ClientForm';
import { clientService } from '@/services/ClientService';
import type { ClientFormData } from '@/types/client';

export default function NewClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ FIXED: Use onSave with ClientService
  const handleSave = async (formData: ClientFormData) => {
    setIsSubmitting(true);
    try {
      // Create client using the service
      const newClient = await clientService.createClient(formData);

// Add delay
await new Promise(resolve => setTimeout(resolve, 500));

// Show toast FIRST
toast({
  title: 'Success',
  description: 'Client created successfully',
  variant: 'default'
});

// Then redirect
router.replace(`/clients/${newClient.id}`);

      // Navigate to the new client's detail page
      router.push(`/clients/${newClient.id}`);
    } catch (error) {
      console.error('Error creating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create client';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      throw error; // Re-throw to let form handle loading state
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
        <p className="text-gray-600 mt-2">
          Create a new client profile with complete information
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <ClientForm
          onSave={handleSave}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}