// src/components/monte-carlo/MonteCarloReport.tsx
// FIXED VERSION - Null safety and type integrity

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Type definitions with strict typing
interface MonteCarloScenario {
  id: string;
  scenario_name: string;
  created_at: string | null;
  initial_wealth?: number | null;
  time_horizon?: number | null;
  withdrawal_amount?: number | null;
  risk_score?: number | null;
  inflation_rate?: number | null;
}

interface MonteCarloResult {
  id: string;
  success_probability?: number;
  simulation_count?: number;
  average_final_wealth?: number;
  median_final_wealth?: number;
  confidence_intervals?: {
    p10?: number;
    p25?: number;
    p50?: number;
    p75?: number;
    p90?: number;
  };
  shortfall_risk?: number;
  wealth_volatility?: number;
  maximum_drawdown?: number;
}

interface Client {
  id: string;
  personalDetails?: {
    firstName?: string;
    lastName?: string;
  };
}

interface MonteCarloReportButtonProps {
  scenario: MonteCarloScenario;
  result?: MonteCarloResult;
  client: Client;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export const MonteCarloReportButton: React.FC<MonteCarloReportButtonProps> = ({
  scenario,
  result,
  client,
  variant = 'outline',
  className = ''
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      // Null safety checks
      if (!scenario || !client) {
        console.error('Missing required data for report generation');
        toast({ title: 'Error', description: 'Missing scenario or client data', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      // Safely format date
      const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return 'Unknown date';
        try {
          // Remove any .replace() calls that could fail on null
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return 'Invalid date';
          
          return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        } catch {
          return 'Invalid date';
        }
      };

      // Safely get client name
      const clientName = [
        client.personalDetails?.firstName || '',
        client.personalDetails?.lastName || ''
      ].filter(Boolean).join(' ') || 'Unknown Client';

      // Prepare report data with null safety
      const reportData = {
        clientName,
        scenarioName: scenario.scenario_name || 'Unnamed Scenario',
        date: formatDate(scenario.created_at),
        parameters: {
          initialWealth: scenario.initial_wealth || 0,
          timeHorizon: scenario.time_horizon || 0,
          withdrawalAmount: scenario.withdrawal_amount || 0,
          riskScore: scenario.risk_score || 0,
          inflationRate: scenario.inflation_rate || 0
        },
        results: result ? {
          successProbability: result.success_probability || 0,
          simulationCount: result.simulation_count || 0,
          averageFinalWealth: result.average_final_wealth || 0,
          medianFinalWealth: result.median_final_wealth || 0,
          confidenceIntervals: {
            p10: result.confidence_intervals?.p10 || 0,
            p25: result.confidence_intervals?.p25 || 0,
            p50: result.confidence_intervals?.p50 || 0,
            p75: result.confidence_intervals?.p75 || 0,
            p90: result.confidence_intervals?.p90 || 0
          },
          shortfallRisk: result.shortfall_risk || 0,
          volatility: result.wealth_volatility || 0,
          maxDrawdown: result.maximum_drawdown || 0
        } : null
      };

      const response = await fetch('/api/documents/generate-monte-carlo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          clientId: client.id,
          resultId: result?.id
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate report');
      }

      const payload = await response.json();
      console.log('Generated report with data:', reportData);

      if (payload.signedUrl) {
        window.open(payload.signedUrl, '_blank');
        toast({ title: 'Report ready', description: 'Opened Monte Carlo PDF in a new tab.' });
      } else if (payload.inlinePdf) {
        const blob = b64ToBlob(payload.inlinePdf, 'application/pdf');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast({ title: 'Report ready', description: 'Opened inline Monte Carlo PDF.' });
      } else {
        toast({ title: 'Report saved', description: 'Report stored; download from Documents.' });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Report failed',
        description: error instanceof Error ? error.message : 'Could not generate Monte Carlo report.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleGenerateReport();
      }}
      className={className}
      disabled={isGenerating}
    >
      <FileText className="h-4 w-4 mr-1" />
      {isGenerating ? 'Generating…' : 'Report'}
    </Button>
  );
};

function b64ToBlob(base64: string, contentType: string) {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
}

// Export a default report viewer component as well
export default function MonteCarloReportViewer({ 
  scenario, 
  result,
  client 
}: MonteCarloReportButtonProps) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Monte Carlo Analysis Report</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Client Information</h3>
          <p>{client.personalDetails?.firstName} {client.personalDetails?.lastName}</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Scenario Details</h3>
          <p>{scenario.scenario_name}</p>
          <p>Date: {scenario.created_at ? new Date(scenario.created_at).toLocaleDateString() : 'Unknown'}</p>
        </div>
        
        {result && (
          <div>
            <h3 className="font-semibold">Results</h3>
            <p>Success Rate: {(result.success_probability || 0).toFixed(1)}%</p>
            <p>Simulations: {result.simulation_count || 0}</p>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <MonteCarloReportButton
          scenario={scenario}
          result={result}
          client={client}
          variant="default"
          className="w-full"
        />
      </div>
    </div>
  );
}
