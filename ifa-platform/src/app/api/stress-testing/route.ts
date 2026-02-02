// ================================================================
// src/app/api/stress-testing/route.ts
// API routes for Stress Testing functionality
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/apiAuth';
import { createRequestLogger } from '@/lib/logging/structured';
import { StressTestingEngine } from '@/services/StressTestingEngine';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { notifyStressTestCompleted } from '@/lib/notifications/notificationService';
import { normalizeIsoCountryCode } from '@/lib/isoCountries';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const normalizeScenarioForEngine = (scenario: Record<string, any>) => {
  if (!scenario || typeof scenario !== 'object') return scenario as any;
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(scenario)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    normalized[camelKey] = value;
  }
  return normalized as any;
};

/**
 * GET /api/stress-testing
 * List available stress scenarios and retrieve saved stress test results for a client
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.success) {
    return auth.response!;
  }

  const supabase = getSupabaseServiceClient();
  const supabaseService = getSupabaseServiceClient();
  const logger = createRequestLogger(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const action = searchParams.get('action') || 'scenarios';

    // Return available scenarios
    if (action === 'scenarios') {
      const scenarios = StressTestingEngine.getAvailableScenarios();
      const scenariosByCategory = StressTestingEngine.getScenariosByCategory();

      return NextResponse.json({
        success: true,
        scenarios,
        scenariosByCategory,
        totalScenarios: scenarios.length
      });
    }

    // Return stress test results for a specific client
    if (action === 'results' && clientId) {
      logger.info('GET /api/stress-testing - Fetching results for client', { clientId });

      // Get client's cash flow scenarios for context
      const { data: cashFlowScenarios, error: cfError } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (cfError) {
        logger.error('Error fetching cash flow scenarios', cfError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch cash flow data',
          details: cfError.message
        }, { status: 500 });
      }

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, personal_details, financial_profile, risk_profile')
        .eq('id', clientId)
        .single();

      if (clientError) {
        logger.error('Error fetching client', clientError);
        return NextResponse.json({
          success: false,
          error: 'Client not found',
          details: clientError.message
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        client,
        cashFlowScenarios: cashFlowScenarios || [],
        availableScenarios: StressTestingEngine.getAvailableScenarios()
      });
    }

    // Return all scenarios by default
    return NextResponse.json({
      success: true,
      scenarios: StressTestingEngine.getAvailableScenarios(),
      scenariosByCategory: StressTestingEngine.getScenariosByCategory()
    });

  } catch (error) {
    logger.error('GET /api/stress-testing error', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/stress-testing
 * Run stress tests on a client's cash flow scenario
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.success) {
    return auth.response!;
  }

  const supabase = getSupabaseServiceClient();
  const supabaseService = getSupabaseServiceClient();
  const logger = createRequestLogger(request);
  const authContext = auth.context;

  try {
    const body = await request.json();
    const { clientId, scenarioIds, cashFlowScenarioId, customParameters, severity, duration } = body;

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required'
      }, { status: 400 });
    }

    if (!scenarioIds || scenarioIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one stress scenario must be selected'
      }, { status: 400 });
    }

    logger.info('POST /api/stress-testing - Running stress tests', {
      clientId,
      scenarioCount: scenarioIds.length
    });

    // Get client's cash flow scenario
    let cashFlowScenario;

    if (cashFlowScenarioId) {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('id', cashFlowScenarioId)
        .single();

      if (error || !data) {
        return NextResponse.json({
          success: false,
          error: 'Cash flow scenario not found'
        }, { status: 404 });
      }
      cashFlowScenario = data;
    } else {
      // Get latest cash flow scenario for client
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Create a default scenario from client data when none exists
        try {
          const { data: clientRow, error: clientError } = await supabaseService
            .from('clients')
            .select(
              'id, client_ref, personal_details, financial_profile, vulnerability_assessment, risk_profile, contact_info, status, created_at, updated_at, advisor_id, firm_id'
            )
            .eq('id', clientId)
            .single();

          if (clientError || !clientRow) {
            logger.error('Client not found while creating default scenario', clientError);
            return NextResponse.json({
              success: false,
              error: 'Client not found'
            }, { status: 404 });
          }

          const personalDetails = (clientRow.personal_details || {}) as Record<string, any>;
          const contactInfo = (clientRow.contact_info || {}) as Record<string, any>;

          const clientForScenario: any = {
            id: clientRow.id,
            clientRef: clientRow.client_ref || `CLI${clientRow.id.slice(-4)}`,
            personalDetails: {
              title: personalDetails.title || '',
              firstName: personalDetails.firstName || personalDetails.first_name || '',
              lastName: personalDetails.lastName || personalDetails.last_name || '',
              dateOfBirth: personalDetails.dateOfBirth || personalDetails.date_of_birth || '',
              gender: personalDetails.gender || '',
              nationality: normalizeIsoCountryCode(personalDetails.nationality),
              maritalStatus: personalDetails.maritalStatus || personalDetails.marital_status || 'single',
              dependents: personalDetails.dependents || 0,
              employmentStatus: personalDetails.employmentStatus || personalDetails.employment_status || 'employed',
              occupation: personalDetails.occupation || '',
              retirementAge:
                personalDetails.retirementAge ??
                personalDetails.retirement_age ??
                personalDetails.target_retirement_age ??
                undefined
            },
            contactInfo: {
              email: contactInfo.email || '',
              phone: contactInfo.phone || '',
              mobile: contactInfo.mobile || '',
              address: contactInfo.address || {},
              preferredContact: contactInfo.preferredContact || 'email',
              communicationPreferences: contactInfo.communicationPreferences || {}
            },
            financialProfile: clientRow.financial_profile || {},
            vulnerabilityAssessment: clientRow.vulnerability_assessment || { is_vulnerable: false },
            riskProfile: clientRow.risk_profile || { attitudeToRisk: 5 },
            status: clientRow.status || 'prospect',
            createdAt: clientRow.created_at,
            updatedAt: clientRow.updated_at,
            advisorId: clientRow.advisor_id,
            firmId: clientRow.firm_id
          };

          const scenarioPayload = CashFlowDataService.buildScenarioPayload(
            clientForScenario,
            null,
            'base',
            authContext?.userId ?? null
          );

          if (authContext?.firmId || clientRow.firm_id) {
            (scenarioPayload as any).firm_id = authContext?.firmId || clientRow.firm_id;
          }

          const { data: createdScenario, error: insertError } = await supabaseService
            .from('cash_flow_scenarios')
            .insert(scenarioPayload as any)
            .select('*')
            .single();

          if (insertError || !createdScenario) {
            logger.error('Failed to create default cash flow scenario', insertError);
            return NextResponse.json({
              success: false,
              error: 'Failed to create cash flow scenario'
            }, { status: 500 });
          }

          cashFlowScenario = createdScenario;
        } catch (createError) {
          logger.error('Failed to create default cash flow scenario', createError);
          return NextResponse.json({
            success: false,
            error: 'Failed to prepare cash flow scenario'
          }, { status: 500 });
        }
      } else {
        cashFlowScenario = data;
      }
    }

    // Apply custom parameters to the scenario if provided
    const scenarioForEngine = normalizeScenarioForEngine(cashFlowScenario as Record<string, any>);
    let modifiedScenario = { ...scenarioForEngine };
    if (customParameters) {
      // Apply custom parameter overrides
      if (customParameters.equityDecline !== undefined) {
        modifiedScenario.realEquityReturn = (modifiedScenario.realEquityReturn || 0.05) * (1 + customParameters.equityDecline / 100);
      }
      if (customParameters.inflationIncrease !== undefined) {
        modifiedScenario.inflationRate = (modifiedScenario.inflationRate || 2.5) + customParameters.inflationIncrease;
      }
      if (customParameters.incomeReduction !== undefined) {
        modifiedScenario.currentIncome = (modifiedScenario.currentIncome || 0) * (1 + customParameters.incomeReduction / 100);
      }
    }

    // Run stress tests using the engine
    const results = await StressTestingEngine.runStressTests(
      modifiedScenario,
      scenarioIds
    );

    // Calculate aggregate stats
    const avgResilience = results.length > 0
      ? results.reduce((sum, r) => sum + r.resilience_score, 0) / results.length
      : 0;

    const criticalScenarios = results.filter(r => r.resilience_score < 50);
    const passedScenarios = results.filter(r => r.resilience_score >= 70);

    // Persist results for dashboard visibility
    if (cashFlowScenario?.id && results.length > 0) {
      try {
        const avgSurvival = results.reduce((sum, r) => sum + r.survival_probability, 0) / results.length;
        const maxShortfall = Math.max(...results.map((r) => r.shortfall_risk));
        const worstCase = results.reduce((worst, current) =>
          current.resilience_score < worst.resilience_score ? current : worst
        );

        const { error: insertError } = await supabaseService
          .from('stress_test_results')
          .insert({
            client_id: clientId,
            scenario_id: cashFlowScenario.id,
            executed_by: authContext?.userId ?? null,
            results_json: results as any,
            scenarios_selected: scenarioIds,
            average_survival_probability: avgSurvival,
            overall_resilience_score: avgResilience,
            max_shortfall_risk: maxShortfall,
            worst_case_scenario_id: worstCase?.scenario_id,
            severity_level: severity || 'moderate',
            duration_years: duration || null,
            test_date: new Date().toISOString(),
            status: 'completed'
          });

        if (insertError) {
          logger.error('Failed to store stress test results', insertError);
        }

        const activityId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `activity_${Date.now()}`;

        await supabaseService
          .from('activity_log')
          .insert({
            id: activityId,
            client_id: clientId,
            action: `Stress test completed: ${scenarioIds.length} scenarios`,
            type: 'stress_test',
            user_name: null,
            date: new Date().toISOString()
          });

        // Send bell notification
        if (authContext?.userId) {
          try {
            const { data: clientData } = await supabaseService
              .from('clients')
              .select('personal_details')
              .eq('id', clientId)
              .single();
            const personalDetails = clientData?.personal_details as Record<string, unknown> | null;
            const clientName = (personalDetails?.firstName || personalDetails?.first_name || 'Client') as string;
            await notifyStressTestCompleted(authContext.userId, clientId, clientName, activityId);
          } catch (notifyError) {
            logger.warn('Failed to send stress test notification', { error: notifyError instanceof Error ? notifyError.message : String(notifyError) });
          }
        }
      } catch (persistError) {
        logger.error('Failed to persist stress test results', persistError);
      }
    }

    logger.info('Stress tests completed', {
      resultsCount: results.length,
      avgResilience,
      criticalCount: criticalScenarios.length
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalScenarios: results.length,
        averageResilience: Math.round(avgResilience),
        criticalScenarios: criticalScenarios.length,
        passedScenarios: passedScenarios.length,
        overallStatus: avgResilience >= 70 ? 'healthy' : avgResilience >= 50 ? 'moderate' : 'critical'
      },
      cashFlowScenario: {
        id: cashFlowScenario.id,
        name: cashFlowScenario.scenario_name || (cashFlowScenario as any).name
      }
    });

  } catch (error) {
    logger.error('POST /api/stress-testing error', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run stress tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
