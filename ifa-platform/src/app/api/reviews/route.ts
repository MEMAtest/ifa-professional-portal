// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/reviews/route.ts
// ===================================================================
// API ROUTE FOR CLIENT REVIEWS - UPDATED FOR EXISTING TABLE
// ===================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { notifyReviewDue, notifyReviewOverdue, notifyReviewCompleted } from '@/lib/notifications/notificationService';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Initialize Supabase client
async function getSupabaseClient() {
  return getSupabaseServiceClient();
}

// GET - Fetch reviews for a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

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
          review.status === 'pending' &&
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
              .select('first_name, last_name, advisor_id')
              .eq('id', clientId)
              .single();

            if (clientData?.advisor_id) {
              const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
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
    const body = await request.json();
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

    // Create the review
    const { data, error } = await supabase
      .from('client_reviews')
      .insert({
        client_id: clientId,
        review_type: reviewType,
        due_date: dueDate,
        status: status || 'pending',
        review_summary: reviewSummary || '',
        recommendations: recommendations || {},
        next_review_date: nextReviewDate,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating review', error);
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    // Log to activity log
    try {
      await supabase
        .from('activity_log')
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
        .select('first_name, last_name, advisor_id')
        .eq('id', clientId)
        .single();

      if (clientData?.advisor_id) {
        const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
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
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

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
        await supabase
          .from('activity_log')
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
        const { data: clientData } = await supabase
          .from('clients')
          .select('first_name, last_name, advisor_id')
          .eq('id', data.client_id)
          .single();

        if (clientData?.advisor_id) {
          const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client';
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

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