// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
// ChartJSNodeCanvas removed - requires native 'canvas' module
// Charts are generated client-side or omitted from server PDFs
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { advisorContextService } from '@/services/AdvisorContextService'
import { mapSuitabilityAssessmentRowToFormData } from '@/lib/suitability/mappers'
import type { PulledPlatformData } from '@/types/suitability'
import { buildSuitabilityReportModel } from '@/lib/suitability/reporting/buildSuitabilityReportModel'
import { log } from '@/lib/logging/structured'
import { notifyDocumentGenerated } from '@/lib/notifications/notificationService'
import { generateSuitabilityReportAIContent } from '@/services/reportAIService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'

import type { GenerateAssessmentReportRequest } from './types'
import { normalizeSuitabilityReportVariant } from './types'
import { fetchATRCFLAtOrBefore, fetchPersonaAtOrBefore } from './platformData'
import { generateCharts, generatePdfWithJsPDF } from './jspdf'
import { parseRequestBody } from '@/app/api/utils'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (multi-firm safety)
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return (
        auth.response ||
        NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
      )
    }

    const ctx = auth.context
    const firmResult = requireFirmId(ctx)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const body: GenerateAssessmentReportRequest = await parseRequestBody(request)
    const { assessmentType, assessmentId, clientId, reportType } = body

    if (!assessmentType || !assessmentId || !clientId) {
      return NextResponse.json(
        { error: 'assessmentType, assessmentId, and clientId are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()
    const safeReportType = normalizeSuitabilityReportVariant(reportType)
    const requiresSignature =
      assessmentType === 'suitability'
        ? safeReportType === 'fullReport'
        : ['atr', 'cfl'].includes(assessmentType)

    // Fetch client first (and enforce firm/advisor access)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    // Fetch assessment data (suitability handled explicitly)
    let assessment: any = null
    if (assessmentType === 'suitability') {
      const { data, error } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('client_id', clientId)
        .maybeSingle()

      assessment = data

      if (error || !assessment) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
      }
    } else {
      const assessmentTable = `${assessmentType}_assessments`
      const { data, error } = await supabase
        .from(assessmentTable as any)
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle()

      assessment = data

      if (error || !assessment) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
      }
    }

    const generatedAtISO = new Date().toISOString()
    const reportContext = await advisorContextService.getReportContext(ctx.userId, firmId)

    let pdfBuffer: ArrayBuffer | Buffer
    let charts: any = {}
    let reportModeUsed: 'draft' | 'final' | undefined
    let requestedReportMode: 'draft' | 'final' | undefined
    let reportDowngradedToDraft = false
    let reportMissingForFinal: Array<{ key: string; message: string }> = []

    // ✅ Suitability reports use the React-PDF templates
    if (assessmentType === 'suitability') {
      const formData = mapSuitabilityAssessmentRowToFormData(assessment as any)
      const hasExplicitAdviceScope =
        Array.isArray((formData as any)?.objectives?.advice_scope) &&
        ((formData as any).objectives.advice_scope as unknown[]).length > 0

      // Reports should reflect the state of the world at the time the suitability was last updated/completed,
      // not whatever the latest ATR/CFL/Persona is today.
      const cutoffISO =
        (assessment?.completed_at as string | null) ||
        (assessment?.assessment_date as string | null) ||
        (assessment?.updated_at as string | null) ||
        null

      const [pulledAtCutoff, personaAtCutoff] = await Promise.all([
        fetchATRCFLAtOrBefore(supabase, clientId, cutoffISO),
        fetchPersonaAtOrBefore(supabase, clientId, cutoffISO)
      ])

      // Prefer values that were saved inside the suitability assessment snapshot; use ATR/CFL/Persona
      // at-or-before the suitability date only to fill gaps.
      const metaPulled = (formData as any)?._metadata?.pulledData as PulledPlatformData | undefined
      const pulledDataOverride: PulledPlatformData = { ...(metaPulled || {}) }
      if (pulledDataOverride.atrScore == null && pulledAtCutoff.atrScore != null) pulledDataOverride.atrScore = pulledAtCutoff.atrScore
      if (pulledDataOverride.atrCategory == null && pulledAtCutoff.atrCategory) pulledDataOverride.atrCategory = pulledAtCutoff.atrCategory
      if (pulledDataOverride.cflScore == null && pulledAtCutoff.cflScore != null) pulledDataOverride.cflScore = pulledAtCutoff.cflScore
      if (pulledDataOverride.cflCategory == null && pulledAtCutoff.cflCategory) pulledDataOverride.cflCategory = pulledAtCutoff.cflCategory
      pulledDataOverride.lastAssessmentDates = {
        ...(metaPulled?.lastAssessmentDates || {}),
        ...(pulledAtCutoff.lastAssessmentDates || {}),
        ...(personaAtCutoff
          ? { persona: personaAtCutoff.assessment_date ?? personaAtCutoff.created_at ?? undefined }
          : null)
      }

      const assessmentStatus = String(assessment?.status || '').toLowerCase()
      const isFinalAssessment = assessmentStatus === 'submitted' || assessmentStatus === 'completed'
      const requestedMode: 'draft' | 'final' = body.includeWarnings || !isFinalAssessment ? 'draft' : 'final'
      let mode: 'draft' | 'final' = requestedMode
      requestedReportMode = requestedMode

      let reportData = buildSuitabilityReportModel({
        client: client as any,
        formData,
        reportContext,
        reportDateISO: generatedAtISO,
        version: assessment?.version_number ? String(assessment.version_number) : undefined,
        mode,
        pulledDataOverride,
        persona: personaAtCutoff
      })

      const branding = {
        firmName: reportContext.firmName,
        fcaNumber: reportContext.firmFcaNumber || undefined,
        logoUrl: reportContext.firmLogoUrl || undefined,
        primaryColor: reportContext.firmPrimaryColor || undefined,
        accentColor: reportContext.firmAccentColor || undefined,
        footerText: reportContext.firmFooterText || undefined
      }

      // Final reports must be FCA-ready: if required items are missing, block and return a structured list.
      // Draft reports (includeWarnings=true) can be generated any time without faking data.
      const enforceStrictFinalReadiness = true
      const missingForFinal = reportData.dataQuality.missing
      let downgradedToDraft = false
      reportMissingForFinal = requestedMode === 'final' ? missingForFinal : []
      if (mode === 'final' && enforceStrictFinalReadiness && missingForFinal.length > 0) {
        // Legacy/partial assessments must still be exportable: instead of failing with 400,
        // downgrade to a Draft PDF that includes data quality warnings.
        mode = 'draft'
        downgradedToDraft = true
        reportData = buildSuitabilityReportModel({
          client: client as any,
          formData,
          reportContext,
          reportDateISO: generatedAtISO,
          version: assessment?.version_number ? String(assessment.version_number) : undefined,
          mode,
          pulledDataOverride,
          persona: personaAtCutoff
        })
      }
      reportModeUsed = mode
      reportDowngradedToDraft = downgradedToDraft

      try {
        const aiContent = await generateSuitabilityReportAIContent({
          reportData,
          baseUrl: request.url,
          clientId: ctx.userId,
          useAI: body.includeAI
        })
        if (Object.keys(aiContent).length > 0) {
          reportData = { ...reportData, aiGenerated: aiContent }
        }
      } catch (aiError: unknown) {
        const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error'
        log.warn('[generate-assessment-report] AI personalization failed, continuing without AI', {
          error: errorMessage
        })
      }

      try {
        // Dynamic import so a React-PDF failure cannot prevent fallback rendering.
        const { generateSuitabilityReportPDF } = await import('@/lib/pdf-templates/suitability-report')
        pdfBuffer = await generateSuitabilityReportPDF(reportData as any, branding, charts, safeReportType)
      } catch (reactPdfError: unknown) {
        const errorMessage = reactPdfError instanceof Error ? reactPdfError.message : 'Unknown error'
        log.warn('[generate-assessment-report] React-PDF template failed, falling back to jsPDF', { error: errorMessage })
        pdfBuffer = await generatePdfWithJsPDF({
          reportType: safeReportType,
          assessmentType,
          assessment,
          client,
          charts: {},
          reportContext
        })
      }
    } else {
      charts = await generateCharts(assessment)

      // Generate PDF using jsPDF (reliable in Next.js)
      pdfBuffer = await generatePdfWithJsPDF({
        reportType: safeReportType,
        assessmentType,
        assessment,
        client,
        charts,
        reportContext
      })
    }

    const fileName = `${assessmentType}-${safeReportType}-${clientId}-${Date.now()}.pdf`
    const filePath = `reports/${clientId}/${fileName}`

    // Always generate inline PDF for immediate download (even if persistence fails).
    const inlineBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer)
    const inlinePdf = inlineBuffer.toString('base64')

    // Best-effort persistence to storage + documents table (do not hard-fail on firmId gaps).
    let documentId: string | null = null
    let signedUrl: string | null = null
    let saved = false
    let persistWarning: string | null = null

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      if (!firmId) {
        persistWarning = 'Report generated but could not be saved (firm not configured yet).'
      } else {
        // Create document record
        // Note: assessment_id is stored in metadata since the FK references a different table
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            firm_id: firmId,
            client_id: clientId,
            name: fileName,
            document_type: 'Assessment Report',
            type: `${assessmentType}_${safeReportType}`,
            category: assessmentType,
            file_path: filePath,
            storage_path: filePath,
            file_name: fileName,
            file_type: 'pdf',
            mime_type: 'application/pdf',
            compliance_status:
              assessmentType === 'suitability' && reportModeUsed === 'draft' ? 'draft' : 'approved',
            version_number: 1,
            is_template: false,
            is_archived: false,
            requires_signature: requiresSignature,
            created_by: ctx.userId,
            metadata: {
              assessmentId,
              assessmentType,
              reportType: safeReportType,
              ...(assessmentType === 'suitability'
                ? {
                    requestedIncludeWarnings: Boolean(body.includeWarnings),
                    includeWarnings: reportModeUsed === 'draft',
                    requestedMode: requestedReportMode,
                    modeUsed: reportModeUsed,
                    downgradedToDraft: reportDowngradedToDraft,
                    missingForFinal: reportMissingForFinal.length ? reportMissingForFinal : undefined
                  }
                : { includeWarnings: Boolean(body.includeWarnings) }),
              hasCharts: Object.keys(charts || {}).length > 0,
              generatedAt: new Date().toISOString()
            }
          })
          .select('id')
          .maybeSingle()

        if (dbError) throw dbError

        documentId = document?.id ?? null
        saved = true

        // Send notification for document generation
        if (documentId) {
          try {
            const pd = (client.personal_details || {}) as Record<string, string>
            const firstName = pd.firstName ?? pd.first_name ?? ''
            const lastName = pd.lastName ?? pd.last_name ?? ''
            const clientName = `${firstName} ${lastName}`.trim() || client.client_ref || 'Client'
            await notifyDocumentGenerated(
              ctx.userId,
              clientId,
              clientName,
              documentId,
              fileName
            )
          } catch (notifyError) {
            log.warn('Could not send document notification', { error: notifyError instanceof Error ? notifyError.message : 'Unknown' })
          }
        }

        // Generate signed URL for download (1 hour expiry)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 60 * 60)
        if (signedUrlError) {
          log.warn('Signed URL error', { message: signedUrlError.message })
        } else {
          signedUrl = signedUrlData?.signedUrl || null
        }
      }
    } catch (persistError: unknown) {
      const errorMessage = persistError instanceof Error ? persistError.message : 'Unknown error'
      log.warn('[generate-assessment-report] Persistence warning', { error: errorMessage })
      persistWarning = 'Report generated but could not be saved to documents.'
    }

    return NextResponse.json({
      success: true,
      saved,
      warning: persistWarning,
      modeUsed: assessmentType === 'suitability' ? reportModeUsed : undefined,
      downgradedToDraft: assessmentType === 'suitability' ? reportDowngradedToDraft : undefined,
      missingForFinal:
        assessmentType === 'suitability' && reportMissingForFinal.length ? reportMissingForFinal : undefined,
      documentId,
      filePath,
      signedUrl,
      inlinePdf,
      reportType: safeReportType,
      fileName
    })
  } catch (error) {
    log.error('generate-assessment-report error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
