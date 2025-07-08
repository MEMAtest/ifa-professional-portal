'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientForm from '@/components/clients/ClientForm';
import type { Client } from '@/types/client';

export default function NewClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (client: Client) => {
    setIsSubmitting(true);
    try {
      // Navigate to the new client's detail page
      router.push(`/clients/${client.id}`);
    } catch (error) {
      console.error('Error after client creation:', error);
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}