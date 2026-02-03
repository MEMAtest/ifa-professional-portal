// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/reviews/route.ts
// ===================================================================
// API ROUTE FOR CLIENT REVIEWS - UPDATED FOR EXISTING TABLE
// ===================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@/lib/logging/structured';
import { notifyReviewDue, notifyReviewOverdue, notifyReviewCompleted } from '@/lib/notifications/notificationService';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

const reviewSchema = z.object({
  clientId: z.string().uuid(),
  reviewType: z.string().min(1),
  dueDate: z.string().min(1),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'overdue']).optional(),
  reviewSummary: z.string().optional(),
  recommendations: z.unknown().optional(),
  nextReviewDate: z.string().optional()
})

const reviewUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'overdue']).optional(),
  completed_date: z.string().optional()
}).passthrough()

// Initialize Supabase client
async function getSupabaseClient() {
  return getSupabaseServiceClient();
}

// GET - Fetch reviews for a client
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) return firmIdResult

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    const { data: clientRecord } = await supabase
      .from('clients').select('id').eq('id', clientId).eq('firm_id', firmIdResult.firmId).single()
    if (!clientRecord) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('client_reviews')
      .select('*')
      .eq('client_id', clientId)
      .order('due_date', { ascending: false });

    if (error) {
      log.error('Error fetching reviews', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Check for overdue reviews and update their status
    const now = new Date();
    const updatedData = await Promise.all(
      (data || []).map(async (review: any) => {
        if (
          review.status === 'scheduled' &&
          review.due_date &&
          new Date(review.due_date) < now
        ) {
          // Update status to overdue
          const { data: updated } = await supabase
            .from('client_reviews')
            .update({ status: 'overdue' })
            .eq('id', review.id)
            .select()
            .single();

          // Send overdue notification
          try {
            const { data: clientData } = await supabase
              .from('clients')
              .select('personal_details, advisor_id')
              .eq('id', clientId)
              .single();

            if (clientData?.advisor_id) {
              const personal = (clientData as any)?.personal_details || {};
              const clientName = `${personal.firstName || personal.first_name || ''} ${personal.lastName || personal.last_name || ''}`.trim() || 'Client';
              await notifyReviewOverdue(
                clientData.advisor_id,
                clientId!,
                clientName,
                review.id
              );
            }
          } catch (notifyError) {
            log.warn('Could not send overdue notification', { error: notifyError instanceof Error ? notifyError.message : 'Unknown' });
          }

          return updated || review;
        }
        return review;
      })
    );

    return NextResponse.json({ data: updatedData });
  } catch (error) {
    log.error('Error in GET /api/reviews', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new review
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    if (!authResult.context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await parseRequestBody(request, reviewSchema);
    const { 
      clientId, 
      reviewType, 
      dueDate,
      status, 
      reviewSummary,
      recommendations,
      nextReviewDate 
    } = body;

    // Validate required fields
    if (!clientId || !reviewType || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (clientError || !clientRecord) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const allowedStatuses = new Set(['scheduled', 'in_progress', 'completed', 'overdue'])
    const normalizedStatus = status && allowedStatuses.has(status) ? status : 'scheduled'

    // Create the review
    const { data, error } = await (supabase
      .from('client_reviews') as any)
      .insert({
        client_id: clientId,
        review_type: reviewType,
        due_date: dueDate,
        status: normalizedStatus,
        review_summary: reviewSummary || '',
        recommendations: recommendations || {},
        next_review_date: nextReviewDate,
        created_at: new Date().toISOString(),
        created_by: authResult.context.userId
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating review', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    // Log to activity log (id auto-generated by DB)
    try {
      await (supabase
        .from('activity_log') as any)
        .insert({
          client_id: clientId,
          action: 'review_scheduled',
          type: 'review',
          date: new Date().toISOString()
        });
    } catch (logError) {
      log.warn('Could not create activity log for review', { error: logError instanceof Error ? logError.message : 'Unknown' });
    }

    // Send notification for review scheduled
    try {
      // Fetch client name for the notification
      const { data: clientData } = await supabase
        .from('clients')
        .select('personal_details, advisor_id')
        .eq('id', clientId)
        .single();

      if (clientData?.advisor_id) {
        const personal = (clientData as any)?.personal_details || {};
        const clientName = `${personal.firstName || personal.first_name || ''} ${personal.lastName || personal.last_name || ''}`.trim() || 'Client';
        await notifyReviewDue(
          clientData.advisor_id,
          clientId,
          clientName,
          data.id,
          dueDate
        );
      }
    } catch (notifyError) {
      log.warn('Could not send review notification', { error: notifyError instanceof Error ? notifyError.message : 'Unknown' });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    log.error('Error in POST /api/reviews', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update review
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) return firmIdResult

    const body = await parseRequestBody(request, reviewUpdateSchema);
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    // Verify review belongs to firm's client
    const { data: reviewRecord } = await supabase
      .from('client_reviews').select('id, client_id').eq('id', id).single()
    if (!reviewRecord || !reviewRecord.client_id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    const { data: clientRecord } = await supabase
      .from('clients').select('id').eq('id', reviewRecord.client_id).eq('firm_id', firmIdResult.firmId).single()
    if (!clientRecord) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If completing a review, set completed_date
    if (updates.status === 'completed' && !updates.completed_date) {
      updates.completed_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('client_reviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Error updating review', error);
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      );
    }

    // Log completion to activity log and send notification
    if (updates.status === 'completed') {
      try {
        await (supabase
          .from('activity_log') as any)
          .insert({
            client_id: data.client_id,
            action: 'review_completed',
            type: 'review',
            date: new Date().toISOString()
          });
      } catch (logError) {
        log.warn('Could not create activity log for review completion', { error: logError instanceof Error ? logError.message : 'Unknown' });
      }

      // Send notification for review completion
      try {
        if (!data.client_id) throw new Error('No client_id on review')
        const { data: clientData } = await supabase
          .from('clients')
          .select('personal_details, advisor_id')
          .eq('id', data.client_id)
          .single();

        if (clientData?.advisor_id) {
          const pd = (clientData.personal_details || {}) as Record<string, unknown>;
          const clientName = `${pd.firstName || pd.first_name || ''} ${pd.lastName || pd.last_name || ''}`.trim() || 'Client';
          await notifyReviewCompleted(
            clientData.advisor_id,
            data.client_id,
            clientName,
            id
          );
        }
      } catch (notifyError) {
        log.warn('Could not send review completion notification', { error: notifyError instanceof Error ? notifyError.message : 'Unknown' });
      }
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    log.error('Error in PATCH /api/reviews', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete review
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) return firmIdResult

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    // Verify review belongs to firm's client
    const { data: reviewRecord } = await supabase
      .from('client_reviews').select('id, client_id').eq('id', id).single()
    if (!reviewRecord || !reviewRecord.client_id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    const { data: clientRecord } = await supabase
      .from('clients').select('id').eq('id', reviewRecord.client_id).eq('firm_id', firmIdResult.firmId).single()
    if (!clientRecord) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('client_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      log.error('Error deleting review', error);
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    log.error('Error in DELETE /api/reviews', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
