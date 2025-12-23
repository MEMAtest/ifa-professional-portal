// ================================================================
// src/app/api/export/powerpoint/route.ts
// API Route for PowerPoint generation (server-side only)
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { PowerPointGenerator } from '@/lib/export/PowerPointGenerator';
import { ClientService } from '@/services/ClientService';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { log } from '@/lib/logging/structured';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, options = {} } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    // Get scenario data
    const scenario = await CashFlowDataService.getScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Get client data
    const clientService = new ClientService();
    const client = await clientService.getClientById(scenario.clientId);

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Generate projections
    const projectionResult = await ProjectionEngine.generateProjections(scenario);
    if (!projectionResult) {
      return NextResponse.json(
        { error: 'Failed to generate projections' },
        { status: 500 }
      );
    }

    // Generate PowerPoint
    const result = await PowerPointGenerator.generateCashFlowReport({
      client,
      scenario,
      projectionResult,
      options: {
        includeCharts: options.includeCharts ?? true,
        includeAssumptions: options.includeAssumptions ?? true,
        includeRiskAnalysis: options.includeRiskAnalysis ?? true,
        includeDetailedProjections: options.includeProjectionTable ?? true,
        theme: options.theme || 'professional',
        locale: options.locale || 'en-GB',
      },
    });

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'PowerPoint generation failed' },
        { status: 500 }
      );
    }

    // Return the file as a download
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error) {
    log.error('PowerPoint export error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
