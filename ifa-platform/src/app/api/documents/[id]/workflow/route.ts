// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/documents/[id]/workflow/route.ts
// Update workflow steps for file review documents.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const firmId = getValidatedFirmId(auth.context)
    if (!firmId) {
      return NextResponse.json({ success: false, error: 'Firm ID required' }, { status: 403 })
    }

    const documentId = context?.params?.id
    if (!documentId) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 })
    }

    const { stepId, done } = await request.json()
    if (!stepId || typeof done !== 'boolean') {
      return NextResponse.json({ success: false, error: 'stepId and done are required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data: document, error } = await supabase
      .from('documents')
      .select('id, metadata, firm_id')
      .eq('id', documentId)
      .eq('firm_id', firmId)
      .maybeSingle()

    if (error || !document) {
      logger.warn('Workflow update - document not found', { documentId, error })
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    const metadata = (document.metadata || {}) as Record<string, any>
    if (metadata.type !== 'file_review') {
      return NextResponse.json({ success: false, error: 'Document is not a file review' }, { status: 400 })
    }

    const workflow = (metadata.workflow || {}) as { steps?: Array<any> }
    const steps = Array.isArray(workflow.steps) ? workflow.steps : []
    const stepIndex = steps.findIndex((step) => step?.id === stepId)
    if (stepIndex === -1) {
      return NextResponse.json({ success: false, error: 'Workflow step not found' }, { status: 404 })
    }

    const updatedSteps = steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            done,
            completedAt: done ? new Date().toISOString() : null,
          }
        : step
    )

    const updatedMetadata = {
      ...metadata,
      workflow: {
        ...workflow,
        steps: updatedSteps,
      },
    }

    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('firm_id', firmId)
      .select()
      .single()

    if (updateError) {
      logger.error('Workflow update failed', updateError, { documentId })
      return NextResponse.json({ success: false, error: 'Failed to update workflow' }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: updatedDocument })
  } catch (error) {
    logger.error('Workflow update error', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update workflow' },
      { status: 500 }
    )
  }
}
