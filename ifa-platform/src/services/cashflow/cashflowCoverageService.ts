import type { SupabaseClient } from '@supabase/supabase-js';
import clientLogger from '@/lib/logging/clientLogger'

export interface CashflowCoverageClientIds {
  assessed: string[];
  scenarios: string[];
  reports: string[];
}

export interface CashflowCoverageResult {
  coverageClientIds: CashflowCoverageClientIds;
  scenarioRetirementAges: Record<string, number>;
}

const normalizeToken = (value?: string | null) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchDocumentsForClients = async (
  supabase: SupabaseClient,
  table: 'documents' | 'generated_documents',
  selectFields: string,
  ids: string[]
) => {
  if (ids.length === 0) return [];
  const chunks = chunkArray(ids, 50);
  const responses = await Promise.all(
    chunks.map((chunk) => supabase.from(table).select(selectFields).in('client_id', chunk))
  );

  const data: Record<string, any>[] = [];
  responses.forEach((response) => {
    if (response.error) {
      clientLogger.error(`Error fetching ${table}:`, response.error);
      return;
    }
    if (response.data) {
      data.push(...response.data);
    }
  });

  return data;
};

const isCashflowDocument = (record: Record<string, any>) => {
  const fields = [
    record.document_type,
    record.type,
    record.category,
    record.name,
    record.file_name,
    record.title,
    record.template_id,
    record.description
  ];
  return fields.some((field) => normalizeToken(field).includes('cashflow'));
};

export async function fetchCashflowCoverageData(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<CashflowCoverageResult> {
  if (clientIds.length === 0) {
    return {
      coverageClientIds: { assessed: [], scenarios: [], reports: [] },
      scenarioRetirementAges: {}
    };
  }

  const [assessmentResult, scenarioResult] = await Promise.all([
    supabase
      .from('assessment_progress')
      .select('client_id, assessment_type, status')
      .eq('status', 'completed')
      .in('client_id', clientIds),
    supabase
      .from('cash_flow_scenarios')
      .select('client_id, retirement_age, updated_at, created_at, is_active')
      .in('client_id', clientIds)
  ]);

  const assessmentTypes = new Set(['atr', 'cfl', 'suitability']);
  const assessedIds = new Set<string>();
  const scenarioIds = new Set<string>();
  const reportIds = new Set<string>();
  const retirementAgeMap = new Map<string, { age: number; timestamp: number; isActive: boolean }>();

  if (!assessmentResult.error) {
    (assessmentResult.data || []).forEach((row: any) => {
      const type = String(row.assessment_type || '').toLowerCase();
      if (assessmentTypes.has(type)) {
        assessedIds.add(row.client_id);
      }
    });
  } else if (assessmentResult.error?.code !== '42P01') {
    console.warn('Assessment progress lookup failed:', assessmentResult.error);
  }

  if (!scenarioResult.error) {
    (scenarioResult.data || []).forEach((row: any) => {
      if (row.client_id) {
        scenarioIds.add(row.client_id);
      }

      const age = row.retirement_age;
      if (!row.client_id || !Number.isFinite(age)) return;

      const timestamp = new Date(row.updated_at || row.created_at || 0).getTime();
      const isActive = row.is_active === true;
      const existing = retirementAgeMap.get(row.client_id);

      if (!existing) {
        retirementAgeMap.set(row.client_id, { age: Number(age), timestamp, isActive });
        return;
      }

      if (isActive && !existing.isActive) {
        retirementAgeMap.set(row.client_id, { age: Number(age), timestamp, isActive });
        return;
      }

      if (isActive === existing.isActive && timestamp > existing.timestamp) {
        retirementAgeMap.set(row.client_id, { age: Number(age), timestamp, isActive });
      }
    });
  } else if (scenarioResult.error?.code !== '42P01') {
    console.warn('Cashflow scenario lookup failed:', scenarioResult.error);
  }

  const documents = await fetchDocumentsForClients(
    supabase,
    'documents',
    'client_id, document_type, type, category, name, file_name, description',
    clientIds
  );

  documents.forEach((row: any) => {
    if (row.client_id && isCashflowDocument(row)) {
      reportIds.add(row.client_id);
    }
  });

  const generatedDocs = await fetchDocumentsForClients(
    supabase,
    'generated_documents',
    'client_id, file_name, title, template_id',
    clientIds
  );

  generatedDocs.forEach((row: any) => {
    if (row.client_id && isCashflowDocument(row)) {
      reportIds.add(row.client_id);
    }
  });

  return {
    coverageClientIds: {
      assessed: Array.from(assessedIds),
      scenarios: Array.from(scenarioIds),
      reports: Array.from(reportIds)
    },
    scenarioRetirementAges: Object.fromEntries(
      Array.from(retirementAgeMap.entries()).map(([clientId, value]) => [clientId, value.age])
    )
  };
}
