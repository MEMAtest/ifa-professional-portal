'use client';

import React from 'react';
import MigrationPanel from '@/components/clients/MigrationPanel'; // Fixed: default import
import type { MigrationResult } from '@/types/client';

export default function MigratePage() {
  const handleMigrationComplete = (result: MigrationResult) => {
    // Handle successful migration
    if (result.success) {
      // Redirect to clients list or show success message
      window.location.href = '/clients';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Client Data Migration</h1>
        <p className="text-gray-600 mt-2">
          Import legacy client data into the new IFA platform
        </p>
      </div>
      
      <MigrationPanel onMigrationComplete={handleMigrationComplete} />
    </div>
  );
}