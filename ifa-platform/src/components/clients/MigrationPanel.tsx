// ===================================================================
// src/components/clients/MigrationPanel.tsx - PRODUCTION READY
// ===================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ui/use-toast';
import { clientService } from '@/services/ClientService';
import type { MigrationResult, LegacyClientData } from '@/types/client';

interface MigrationPanelProps {
  onMigrationComplete?: (result: MigrationResult) => void;
}

export default function MigrationPanel({ onMigrationComplete }: MigrationPanelProps) {
  const { toast } = useToast();
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // ✅ FIXED: Define legacyData array - you should populate this from your data source
  const legacyData: LegacyClientData[] = [
    // Example legacy client data - replace with your actual data
    // {
    //   id: '1',
    //   first_name: 'John',
    //   last_name: 'Doe',
    //   email: 'john@example.com',
    //   phone: '555-1234',
    //   date_of_birth: '1980-01-01',
    //   annual_income: 50000,
    //   net_worth: 100000,
    //   risk_tolerance: 'moderate'
    // }
  ];

  const handleMigration = async () => {
    try {
      setMigrating(true);
      setProgress(0);
      setProgressMessage('Starting migration...');

      // ✅ FIXED: Correct parameter order - clients array first, then callback
      const result = await clientService.migrateLegacyClients(
        legacyData, // ✅ FIXED: Add the data array first
        (progressPercent: number, message: string) => {
          setProgress(progressPercent);
          setProgressMessage(message);
        }
      );

      setMigrationResult(result);
      onMigrationComplete?.(result);

      toast({
        title: 'Migration Complete',
        description: `Successfully migrated ${result.clientsMigrated} clients`,
        variant: 'default'
      });

    } catch (error) {
      console.error('Migration failed:', error);
      
      // ✅ FIXED: Create proper MigrationResult object with all required properties
      const failedResult: MigrationResult = {
        success: false,
        clientsProcessed: legacyData.length,
        clientsMigrated: 0,
        errors: [{ 
          clientId: 'unknown', 
          status: 'error' as const, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        }],
        summary: {
          total: legacyData.length,
          successful: 0,
          failed: legacyData.length,
          skipped: 0
        },
        migratedCount: 0,
        skippedCount: 0,
        details: []
      };
      
      setMigrationResult(failedResult);

      toast({
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Data Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Ready to migrate {legacyData.length} legacy client records.</p>
            <p>This process will import client data from your legacy system.</p>
          </div>

          {migrating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{progressMessage}</p>
            </div>
          )}

          <Button
            onClick={handleMigration}
            disabled={migrating || legacyData.length === 0}
            loading={migrating}
            className="w-full"
          >
            {migrating ? 'Migrating...' : `Start Migration (${legacyData.length} records)`}
          </Button>
        </CardContent>
      </Card>

      {migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">Successful</span>
                <span className="ml-2">{migrationResult.summary.successful} clients</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm">Failed</span>
                <span className="ml-2">{migrationResult.summary.failed} records</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm">Skipped</span>
                <span className="ml-2">{migrationResult.summary.skipped} records</span>
              </div>
            </div>

            {migrationResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {migrationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {/* ✅ FIXED: Properly render error message */}
                      Client {error.clientId}: {error.reason || error.message || 'Unknown error'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-600">
                Migration {migrationResult.success ? 'completed successfully' : 'completed with errors'}
              </span>
              <Button
                variant="outline"
                onClick={() => setMigrationResult(null)}
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}