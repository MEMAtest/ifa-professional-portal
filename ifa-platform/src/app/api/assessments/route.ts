// src/app/api/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a service role client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AssessmentData {
  client_id: string;
  advisor_id: string;
  assessment_data: any;
  risk_analysis?: any;
  vulnerability_analysis?: any;
  consumer_duty_compliance?: any;
  status: string;
  version: number;
  legacy_form_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the authenticated user from the request headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token' },
        { status: 401 }
      );
    }

    // Verify the user with the token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Build assessment data with proper typing
    const assessmentData: AssessmentData = {
      client_id: body.client_id || body.clientId,
      advisor_id: user.id,
      assessment_data: body.assessment_data || body.assessmentData || {},
      status: body.status || 'draft',
      version: body.version || 1,
    };

    // Add optional fields if provided
    if (body.risk_analysis || body.riskAnalysis) {
      assessmentData.risk_analysis = body.risk_analysis || body.riskAnalysis;
    }
    if (body.vulnerability_analysis || body.vulnerabilityAnalysis) {
      assessmentData.vulnerability_analysis = body.vulnerability_analysis || body.vulnerabilityAnalysis;
    }
    if (body.consumer_duty_compliance || body.consumerDutyCompliance) {
      assessmentData.consumer_duty_compliance = body.consumer_duty_compliance || body.consumerDutyCompliance;
    }
    if (body.legacy_form_id || body.legacyFormId) {
      assessmentData.legacy_form_id = body.legacy_form_id || body.legacyFormId;
    }

    const { data, error } = await supabaseAdmin
      .from('assessments')
      .insert([assessmentData])
      .select()
      .single();

    if (error) {
      console.error('Assessment save error:', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Assessment saved successfully'
    });

  } catch (error) {
    console.error('Assessment route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const assessmentId = searchParams.get('id');

    // Build the query based on parameters
    if (assessmentId) {
      const { data, error } = await supabaseAdmin
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) {
        console.error('Assessment fetch error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        data 
      });
    } else if (clientId) {
      const { data, error } = await supabaseAdmin
        .from('assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Assessment fetch error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        data 
      });
    } else {
      return NextResponse.json(
        { error: 'Either clientId or id parameter required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Assessment GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}