// ================================================================
// File: ifa-platform/src/app/api/assessments/cfl/route.ts
// Complete CFL Route with updateClientRiskProfile Function
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ADD THIS FUNCTION - IT WAS MISSING!
async function updateClientRiskProfile(clientId: string) {
  // Fetch current ATR and CFL assessments
  const { data: atr } = await supabase
    .from('atr_assessments')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .single();

  const { data: cfl } = await supabase
    .from('cfl_assessments')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .single();

  if (atr || cfl) {
    // Calculate final risk profile (conservative approach)
    const atrLevel = atr?.risk_level || 5;
    const cflLevel = cfl?.capacity_level || 5;
    const finalLevel = Math.min(atrLevel, cflLevel);

    // Create or update risk profile
    await supabase
      .from('risk_profiles')
      .upsert({
        client_id: clientId,
        atr_assessment_id: atr?.id,
        cfl_assessment_id: cfl?.id,
        atr_score: atr?.total_score,
        cfl_score: cfl?.total_score,
        final_risk_level: finalLevel,
        final_risk_category: getRiskCategory(finalLevel),
        reconciliation_notes: `ATR: ${atrLevel}, CFL: ${cflLevel}, Final: ${finalLevel} (conservative)`,
        is_current: true
      });
  }
}

// ADD THIS HELPER FUNCTION TOO
function getRiskCategory(level: number): string {
  const categories = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  return categories[level - 1] || 'Medium';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId, 
      answers, 
      score, 
      category, 
      level,
      maxLossPercentage,
      confidenceLevel,
      recommendations,
      financialData 
    } = body;

    const { data, error } = await supabase
      .from('cfl_assessments')
      .insert({
        client_id: clientId,
        answers,
        total_score: score,
        capacity_category: category,
        capacity_level: level,
        max_loss_percentage: maxLossPercentage,
        confidence_level: confidenceLevel,
        recommendations,
        monthly_income: financialData?.monthlyIncome,
        monthly_expenses: financialData?.monthlyExpenses,
        emergency_fund: financialData?.emergencyFund,
        other_investments: financialData?.otherInvestments,
        is_current: true
      })
      .select()
      .single();

    if (error) throw error;

    // Update client's risk profile
    await updateClientRiskProfile(clientId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving CFL assessment:', error);
    return NextResponse.json(
      { error: 'Failed to save CFL assessment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json(
      { error: 'Client ID required' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('cfl_assessments')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching CFL assessment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CFL assessment' },
      { status: 500 }
    );
  }
}