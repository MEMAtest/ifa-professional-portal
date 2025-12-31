'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export const useClientCashFlowStatus = (supabase: SupabaseClient, clientId: string) => {
  const [hasCashFlowAnalysis, setHasCashFlowAnalysis] = useState(false);
  const [cashFlowCount, setCashFlowCount] = useState(0);

  const refreshCashFlowStatus = useCallback(async () => {
    try {
      const { error, count } = await supabase
        .from('cash_flow_scenarios')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      if (count !== null) {
        setHasCashFlowAnalysis(count > 0);
        setCashFlowCount(count);
      }
    } catch (refreshError) {
      console.error('Error checking cash flow data:', refreshError);
      setHasCashFlowAnalysis(false);
      setCashFlowCount(0);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    refreshCashFlowStatus();
  }, [refreshCashFlowStatus]);

  return {
    hasCashFlowAnalysis,
    cashFlowCount,
    refreshCashFlowStatus
  };
};
