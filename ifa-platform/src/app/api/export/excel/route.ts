export const dynamic = 'force-dynamic'

// ================================================================
// src/app/api/export/excel/route.ts
// API Route for Excel generation
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { ExcelGenerator } from '@/lib/export/ExcelGenerator';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient';
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth';
import { parseRequestBody } from '@/app/api/utils'

function transformToCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(transformToCamelCase);
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = transformToCamelCase(obj[key]);
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult;
    }
    const { firmId } = firmResult;

    const body = await parseRequestBody(request);
    const { scenarioId, options = {} } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get scenario data (firm-scoped)
    const { data: scenarioRow, error: scenarioError } = await supabase
      .from('cash_flow_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .eq('firm_id', firmId)
      .single();

    if (scenarioError || !scenarioRow) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    if (!scenarioRow.client_id) {
      return NextResponse.json(
        { error: 'Scenario is missing client reference' },
        { status: 400 }
      );
    }

    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', scenarioRow.client_id)
      .eq('firm_id', firmId)
      .single();

    if (clientError || !clientRow) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const scenario = transformToCamelCase(scenarioRow);
    const client = transformToCamelCase(clientRow);

    // Generate projections
    const projectionResult = await ProjectionEngine.generateProjections(scenario);
    if (!projectionResult) {
      return NextResponse.json(
        { error: 'Failed to generate projections' },
        { status: 500 }
      );
    }

    // Generate Excel
    const result = ExcelGenerator.generateCashFlowReport({
      client,
      scenario,
      projectionResult,
      options: {
        includeAssumptions: options.includeAssumptions ?? true,
        includeRiskAnalysis: options.includeRiskAnalysis ?? true,
        locale: options.locale || 'en-GB',
      },
    });

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'Excel generation failed' },
        { status: 500 }
      );
    }

    // Return the file as a download
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error) {
    log.error('Excel export error', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
