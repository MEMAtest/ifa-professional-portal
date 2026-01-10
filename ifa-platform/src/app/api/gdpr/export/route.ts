/**
 * GDPR Data Export API
 * GET /api/gdpr/export?clientId=xxx - Export all client data for GDPR compliance
 *
 * Only accessible by admins within the same firm as the client.
 * Returns a comprehensive JSON export of all client-related data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

interface GdprExportData {
  exportMetadata: {
    exportedAt: string
    exportedBy: string
    firmId: string
    firmName: string
    clientId: string
    dataCategories: string[]
  }
  client: {
    id: string
    personalDetails: Record<string, unknown> | null
    contactInfo: Record<string, unknown> | null
    financialProfile: Record<string, unknown> | null
    vulnerabilityAssessment: Record<string, unknown> | null
    riskProfile: Record<string, unknown> | null
    status: string | null
    createdAt: string
    updatedAt: string
  } | null
  assessments: {
    suitability: Array<Record<string, unknown>>
    atr: Array<Record<string, unknown>>
    cfl: Array<Record<string, unknown>>
  }
  documents: Array<{
    id: string
    filename: string
    category: string | null
    createdAt: string
    // File content not included - just metadata
  }>
  activityLog: Array<{
    id: string
    action: string
    type: string
    date: string
    userName: string | null
    metadata: Record<string, unknown> | null
  }>
  communications: Array<{
    id: string
    type: string
    subject: string | null
    sentAt: string | null
    status: string | null
  }>
  notifications: Array<{
    id: string
    type: string
    title: string
    message: string | null
    createdAt: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can export GDPR data
    if (authResult.context.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can export GDPR data' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required', message: 'Provide clientId query parameter' },
        { status: 400 }
      )
    }

    if (!isValidUUID(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseService = getSupabaseServiceClient()

    // ========================================
    // VERIFY CLIENT BELONGS TO FIRM
    // ========================================
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('firm_id', firmIdResult.firmId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found', message: 'Client does not exist or does not belong to your firm' },
        { status: 404 }
      )
    }

    // ========================================
    // GET FIRM NAME FOR EXPORT METADATA
    // ========================================
    const { data: firm } = await supabase
      .from('firms')
      .select('name')
      .eq('id', firmIdResult.firmId)
      .single()

    // ========================================
    // GET EXPORTER INFO
    // ========================================
    const { data: exporterProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', authResult.context.userId)
      .single()

    const exporterName = exporterProfile
      ? `${exporterProfile.first_name || ''} ${exporterProfile.last_name || ''}`.trim() || 'Admin'
      : 'Admin'

    // ========================================
    // FETCH ALL CLIENT-RELATED DATA
    // ========================================

    // Suitability Assessments
    const { data: suitabilityAssessments } = await supabase
      .from('suitability_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // ATR Assessments
    const { data: atrAssessments } = await supabase
      .from('atr_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // CFL Assessments
    const { data: cflAssessments } = await supabase
      .from('cfl_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // Documents (metadata only, not file content)
    const { data: documents } = await supabase
      .from('documents')
      .select('id, filename, category, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // Activity Log - uses service client so must explicitly filter by firm_id
    const { data: activityLog } = await supabaseService
      .from('activity_log')
      .select('id, action, type, date, user_name, metadata')
      .eq('client_id', clientId)
      .eq('firm_id', firmIdResult.firmId)
      .order('date', { ascending: false })

    // Communications
    const { data: communications } = await supabase
      .from('communications')
      .select('id, type, subject, sent_at, status')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // Client-specific Notifications (if any)
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id, type, title, message, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // ========================================
    // BUILD EXPORT OBJECT
    // ========================================
    const exportData: GdprExportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: exporterName,
        firmId: firmIdResult.firmId,
        firmName: firm?.name || 'Unknown Firm',
        clientId,
        dataCategories: [
          'personal_details',
          'contact_info',
          'financial_profile',
          'vulnerability_assessment',
          'risk_profile',
          'assessments',
          'documents_metadata',
          'activity_log',
          'communications',
          'notifications'
        ]
      },
      client: {
        id: client.id,
        personalDetails: client.personal_details,
        contactInfo: client.contact_info,
        financialProfile: client.financial_profile,
        vulnerabilityAssessment: client.vulnerability_assessment,
        riskProfile: client.risk_profile,
        status: client.status,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      },
      assessments: {
        suitability: (suitabilityAssessments || []).map((a: Record<string, unknown>) => ({
          id: a.id,
          status: a.status,
          completionPercentage: a.completion_percentage,
          formData: a.form_data,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          finalizedAt: a.finalized_at
        })),
        atr: (atrAssessments || []).map((a: Record<string, unknown>) => ({
          id: a.id,
          status: a.status,
          riskScore: a.risk_score,
          formData: a.form_data,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        })),
        cfl: (cflAssessments || []).map((a: Record<string, unknown>) => ({
          id: a.id,
          status: a.status,
          capacity: a.capacity,
          formData: a.form_data,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }))
      },
      documents: (documents || []).map((d: { id: string; filename: string; category: string | null; created_at: string }) => ({
        id: d.id,
        filename: d.filename,
        category: d.category,
        createdAt: d.created_at
      })),
      activityLog: (activityLog || []).map((a: { id: string; action: string | null; type: string | null; date: string | null; user_name: string | null; metadata: unknown }) => ({
        id: a.id,
        action: a.action || '',
        type: a.type || '',
        date: a.date || '',
        userName: a.user_name,
        metadata: a.metadata as Record<string, unknown> | null
      })),
      communications: (communications || []).map((c: { id: string; type: string; subject: string | null; sent_at: string | null; status: string | null }) => ({
        id: c.id,
        type: c.type,
        subject: c.subject,
        sentAt: c.sent_at,
        status: c.status
      })),
      notifications: (notifications || []).map((n: { id: string; type: string; title: string; message: string | null; created_at: string }) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.created_at
      }))
    }

    // ========================================
    // LOG THE EXPORT FOR AUDIT TRAIL
    // ========================================
    await supabaseService
      .from('activity_log')
      .insert({
        id: crypto.randomUUID(),
        client_id: clientId,
        firm_id: firmIdResult.firmId, // Required for RLS policy
        action: `GDPR data export requested for client`,
        type: 'gdpr_export',
        date: new Date().toISOString(),
        user_name: exporterName,
        metadata: {
          exported_by: authResult.context.userId,
          data_categories: exportData.exportMetadata.dataCategories
        }
      })

    // Return as JSON with appropriate headers
    const filename = `gdpr-export-${clientId}-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-GDPR-Export': 'true'
      }
    })

  } catch (error) {
    console.error('[GDPR Export] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to export data' },
      { status: 500 }
    )
  }
}
