// src/app/api/assessments/persona/route.ts
// COMPLETE PERSONA ASSESSMENT API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Fetch latest persona assessment
    const { data, error } = await supabase
      .from('persona_assessments')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching persona assessment:', error);
      throw new Error('Failed to fetch persona assessment');
    }

    return NextResponse.json({
      success: true,
      data,
      hasAssessment: !!data
    });

  } catch (error) {
    console.error('Persona GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const {
      clientId,
      personaLevel,
      personaType,
      scores,
      confidence,
      answers,
      motivations,
      fears,
      psychologicalProfile,
      communicationNeeds,
      consumerDutyAlignment
    } = body;

    // Validate required fields
    if (!clientId || !personaLevel || !personaType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get version number for this client
    const { data: existingAssessments } = await supabase
      .from('persona_assessments')
      .select('version')
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingAssessments && existingAssessments.length > 0 
      ? (existingAssessments[0].version || 0) + 1 
      : 1;

    // Mark previous assessments as not current
    await supabase
      .from('persona_assessments')
      .update({ is_current: false })
      .eq('client_id', clientId);

    // Create new persona assessment
    const { data, error } = await supabase
      .from('persona_assessments')
      .insert({
        client_id: clientId,
        persona_level: personaLevel,
        persona_type: personaType,
        scores: scores,
        confidence: confidence,
        answers: answers,
        motivations: motivations,
        fears: fears,
        psychological_profile: psychologicalProfile,
        communication_needs: communicationNeeds,
        consumer_duty_alignment: consumerDutyAlignment,
        version: nextVersion,
        is_current: true,
        assessment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating persona assessment:', error);
      throw new Error('Failed to create persona assessment');
    }

    // Update assessment progress
    await supabase
      .from('assessment_progress')
      .upsert({
        client_id: clientId,
        assessment_type: 'persona',
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        metadata: {
          assessmentId: data.id,
          personaLevel,
          personaType,
          confidence,
          version: nextVersion
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'client_id,assessment_type'
      });

    return NextResponse.json({
      success: true,
      data,
      version: nextVersion
    });

  } catch (error) {
    console.error('Persona POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}