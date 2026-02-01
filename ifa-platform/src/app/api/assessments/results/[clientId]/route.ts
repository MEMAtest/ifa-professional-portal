// src/app/api/assessments/results/[clientId]/route.ts
// FETCH LATEST RESULTS FOR ALL ASSESSMENTS

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = getSupabaseServiceClient();
    const clientId = params.clientId;

    // Fetch latest results for each assessment type
    const [atrResult, cflResult, personaResult] = await Promise.all([
      // ATR
      supabase
        .from('atr_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // CFL
      supabase
        .from('cfl_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // Persona
      supabase
        .from('persona_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    // Format results for display
    const results = {
      atr: atrResult.data ? {
        id: atrResult.data.id,
        score: atrResult.data.total_score,
        level: atrResult.data.risk_level,
        category: atrResult.data.risk_category,
        date: atrResult.data.assessment_date,
        version: atrResult.data.version || 1,
        summary: `Level ${atrResult.data.risk_level}/5 - ${atrResult.data.risk_category}`
      } : null,
      
      cfl: cflResult.data ? {
        id: cflResult.data.id,
        score: cflResult.data.total_score,
        level: cflResult.data.capacity_level,
        category: cflResult.data.capacity_category,
        maxLoss: cflResult.data.max_loss_percentage,
        date: cflResult.data.assessment_date,
        version: cflResult.data.version || 1,
        summary: `${cflResult.data.capacity_category} (${cflResult.data.max_loss_percentage}% max loss)`
      } : null,
      
      persona: personaResult.data ? {
        id: personaResult.data.id,
        level: personaResult.data.persona_level,
        type: personaResult.data.persona_type,
        confidence: personaResult.data.confidence,
        date: personaResult.data.assessment_date,
        version: personaResult.data.version || 1,
        summary: `${personaResult.data.persona_type} (${personaResult.data.confidence}% match)`
      } : null
    };

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    log.error('Error fetching assessment results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment results' },
      { status: 500 }
    );
  }
}