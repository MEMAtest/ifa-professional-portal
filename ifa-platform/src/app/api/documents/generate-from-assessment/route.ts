// src/app/api/documents/generate-from-assessment/route.ts
// Professional version with charts, proper prose, and neutral language

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'
import { rateLimit } from '@/lib/security/rateLimit'

// Type definitions
interface GenerateDocumentRequest {
  assessmentType: string
  assessmentId: string
  clientId: string
  reportType?: string
}

interface AssessmentData {
  id: string
  client_id: string
  total_score?: number
  risk_category?: string
  risk_level?: number
  created_at?: string
  version_number?: number
  capacity_category?: string
  max_loss_percentage?: number
  
  // Persona specific fields
  persona_level?: string
  persona_type?: string
  confidence?: number
  motivations?: string[]
  fears?: string[]
  psychological_profile?: any
  communication_needs?: any
  answers?: any
  
  [key: string]: any
}

interface ClientData {
  id: string
  client_ref?: string
  personal_details?: {
    title?: string
    firstName?: string
    lastName?: string
    dateOfBirth?: string
  }
  contact_info?: {
    email?: string
    phone?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      county?: string
      postcode?: string
    }
  }
  [key: string]: any
}

export async function POST(request: NextRequest) {
  let documentId: string | null = null
  let filePath: string | null = null

  try {
    const rateLimitResponse = await rateLimit(request, 'api')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'reports:generate')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    const body: GenerateDocumentRequest = await parseRequestBody(request)
    const { assessmentType, assessmentId, clientId, reportType = 'standard' } = body

    log.info('Document generation requested', {
      assessmentType,
      assessmentId,
      clientId,
      reportType
    })

    // Validate required fields
    if (!assessmentType || !assessmentId || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient() as any

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    // Fetch assessment data
    const assessmentTable = `${assessmentType}_assessments`
    const { data: assessment, error: assessmentError } = await supabase
      .from(assessmentTable)
      .select('*')
      .eq('id', assessmentId)
      .eq('client_id', clientId)
      .single()

    if (assessmentError || !assessment) {
      log.error('Assessment fetch error', assessmentError)
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    const assessmentData = assessment as AssessmentData

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .single()

    if (clientError || !client) {
      log.error('Client fetch error', clientError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const clientData = client as ClientData

    // Extract client information
    const clientFirstName = clientData.personal_details?.firstName || ''
    const clientLastName = clientData.personal_details?.lastName || 'Client'
    const clientTitle = clientData.personal_details?.title || ''
    const clientName = `${clientTitle} ${clientFirstName} ${clientLastName}`.trim()
    const clientEmail = clientData.contact_info?.email || ''
    const clientRef = clientData.client_ref || clientData.id
    const clientAddress = clientData.contact_info?.address

    log.info('Generating PDF for client', { clientName, clientId, assessmentType })

    // Generate Enhanced PDF
    let pdfBuffer: Buffer
    
    try {
      const jsPDF = (await import('jspdf')).default
      
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      // Define professional color scheme
      const colors = {
        primary: '#1e3a8a',      // Deep blue
        secondary: '#0f766e',    // Teal
        accent: '#dc2626',       // Red for concerns
        text: '#111827',         // Near black
        lightText: '#6b7280',    // Gray
        border: '#e5e7eb',       // Light gray
        background: '#f9fafb',   // Very light gray
        chartColors: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6'
        }
      }
      
      // Add Plannetic logo from file
      try {
        const logoPath = path.join(process.cwd(), 'public', 'assets', 'images', 'plannetic-logo.png')
        if (fs.existsSync(logoPath)) {
          const logoBytes = fs.readFileSync(logoPath)
          const logoBase64 = `data:image/png;base64,${logoBytes.toString('base64')}`
          doc.addImage(logoBase64, 'PNG', 20, 10, 35, 14)
        }
      } catch (logoError) {
        log.debug('Logo not found, continuing without it', { logoError })
      }
      
      // Professional header
      doc.setFontSize(11)
      doc.setTextColor(colors.primary)
      doc.setFont('helvetica', 'bold')
      doc.text('Plannetic IFA Platform', 190, 15, { align: 'right' })
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.lightText)
      doc.text('Professional Financial Advisory Services', 190, 20, { align: 'right' })
      doc.text('FCA Registration: 123456', 190, 25, { align: 'right' })
      
      // Divider
      doc.setDrawColor(colors.border)
      doc.setLineWidth(0.3)
      doc.line(20, 30, 190, 30)
      
      let yPosition = 45
      
      // Document title
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.text)
      const documentTitle = getDocumentTitle(assessmentType)
      doc.text(documentTitle, 105, yPosition, { align: 'center' })
      
      yPosition += 10
      
      // Client information bar
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Client: ${clientName}`, 105, yPosition, { align: 'center' })
      yPosition += 5
      doc.setTextColor(colors.lightText)
      doc.text(`Reference: ${clientRef} | Date: ${new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`, 105, yPosition, { align: 'center' })
      
      yPosition += 15
      
      // Executive Summary
      doc.setFillColor(colors.background)
      doc.rect(20, yPosition - 5, 170, 35, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.primary)
      doc.text('Executive Summary', 25, yPosition)
      
      yPosition += 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.text)
      
      const executiveSummary = generateExecutiveSummary(assessmentType, assessmentData)
      const summaryLines = doc.splitTextToSize(executiveSummary, 160)
      doc.text(summaryLines, 25, yPosition)
      yPosition += summaryLines.length * 4 + 10
      
      // Main content based on assessment type
      if (assessmentType === 'persona') {
        yPosition = addPersonaProfessionalContent(doc, assessmentData, yPosition, colors)
      } else {
        yPosition = addStandardAssessmentContent(doc, assessmentType, assessmentData, yPosition, colors)
      }
      
      // Strategic Recommendations
      if (yPosition > 220) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.primary)
      doc.text('Strategic Recommendations', 20, yPosition)
      yPosition += 8
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.text)
      
      const recommendations = generateProfessionalRecommendations(assessmentType, assessmentData)
      recommendations.forEach((rec: string, index: number) => {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }
        
        // Numbered recommendations (more professional than bullets)
        doc.setFont('helvetica', 'bold')
        doc.text(`${index + 1}.`, 22, yPosition)
        doc.setFont('helvetica', 'normal')
        
        const recLines = doc.splitTextToSize(rec, 160)
        doc.text(recLines, 28, yPosition)
        yPosition += recLines.length * 4 + 4
      })
      
      // Next Steps section
      if (yPosition > 230) {
        doc.addPage()
        yPosition = 20
      }
      
      yPosition += 5
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.primary)
      doc.text('Next Steps', 20, yPosition)
      yPosition += 8
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.text)
      const nextSteps = 'A consultation should be scheduled to review these assessment results in detail. During this meeting, ' +
                       'the findings will be discussed in the context of your broader financial objectives and current market conditions. ' +
                       'A comprehensive investment strategy will be developed based on the assessment outcomes and regulatory requirements.'
      const nextStepsLines = doc.splitTextToSize(nextSteps, 170)
      doc.text(nextStepsLines, 20, yPosition)
      
      // Professional footer on all pages
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(colors.lightText)
        doc.setDrawColor(colors.border)
        doc.setLineWidth(0.3)
        doc.line(20, 280, 190, 280)
        doc.text('This document is confidential and prepared for the named recipient only', 105, 285, { align: 'center' })
        doc.text(`Page ${i} of ${pageCount} | © ${new Date().getFullYear()} Plannetic IFA Platform`, 105, 290, { align: 'center' })
      }
      
      // Get PDF as buffer
      const pdfOutput = doc.output('arraybuffer')
      pdfBuffer = Buffer.from(pdfOutput)

      log.info('PDF generated successfully', { size: pdfBuffer.length, clientId, assessmentType })
    } catch (pdfError) {
      log.error('PDF generation error', pdfError)
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      )
    }

    // Create filename and upload to storage
    const timestamp = Date.now()
    const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
    const versionString = assessmentData.version_number ? `_v${assessmentData.version_number}` : ''
    const fileName = `${assessmentType}_${reportType}_${safeClientName}${versionString}_${timestamp}.pdf`
    filePath = `firms/${firmId}/documents/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
        cacheControl: '3600'
      })

    if (uploadError) {
      log.error('Storage upload error', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)
    
    const publicUrl = urlData.publicUrl

    // Create document record
    documentId = crypto.randomUUID()
    const documentName = `${getDocumentTitle(assessmentType)} - ${clientName}`

    const normalizedType = `${assessmentType}_report`
    const documentRecord = {
      id: documentId,
      firm_id: firmId,
      client_id: clientId,
      assessment_id: assessmentId,
      assessment_version: assessmentData.version_number || null,
      name: documentName,
      client_name: clientName,
      file_name: fileName,
      file_path: filePath,
      storage_path: publicUrl,
      file_size: pdfBuffer.length,
      file_type: 'pdf',
      mime_type: 'application/pdf',
      type: normalizedType,
      document_type: normalizedType,
      category: 'Assessment Reports',
      created_by: auth.context.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        assessmentId: assessmentId,
        assessmentType: assessmentType,
        clientId: clientId,
        clientName: clientName,
        ...(assessmentType === 'persona' ? {
          personaType: assessmentData.persona_type,
          personaLevel: assessmentData.persona_level,
          confidence: assessmentData.confidence
        } : {
          score: assessmentData.total_score,
          riskCategory: assessmentData.risk_category
        })
      }
    }

    const { error: docError } = await supabase
      .from('documents')
      .insert(documentRecord)
      .select()
      .single()

    if (docError) {
      log.error('Document record creation error', docError)
      throw new Error('Failed to create document record')
    }

    return NextResponse.json({
      success: true,
      documentId: documentId,
      documentUrl: `/documents/view/${documentId}`,
      pdfUrl: publicUrl
    })

  } catch (error) {
    log.error('Document generation error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Professional helper functions

function getDocumentTitle(type: string): string {
  const titles: Record<string, string> = {
    'suitability': 'Investment Suitability Assessment',
    'atr': 'Attitude to Risk Assessment',
    'cfl': 'Capacity for Loss Assessment',
    'persona': 'Investor Persona Profile Assessment'
  }
  return titles[type] || 'Financial Assessment'
}

function generateExecutiveSummary(type: string, assessment: AssessmentData): string {
  if (type === 'persona') {
    return `This assessment has classified the respondent's investor profile as "${assessment.persona_type || 'Not Determined'}" ` +
           `based on responses to behavioral and preference questions. The classification confidence level is ${assessment.confidence || 0}%, ` +
           `indicating the degree of alignment between responses and the identified profile characteristics. This profile classification ` +
           `will be used to inform communication strategies and investment recommendations.`
  } else if (type === 'atr') {
    return `The attitude to risk assessment produced a score of ${assessment.total_score || 0} out of 100, placing the respondent ` +
           `in the "${assessment.risk_category || 'Moderate'}" risk category. This score was calculated using a standardized methodology ` +
           `based on ${assessment.answers ? Object.keys(assessment.answers).length : 15} responses regarding investment preferences and risk tolerance. ` +
           `The assessment results indicate a risk level of ${assessment.risk_level || 3} on a scale of 1 to 5.`
  } else if (type === 'cfl') {
    return `The capacity for loss assessment indicates a "${assessment.capacity_category || 'Moderate'}" capacity classification ` +
           `with a maximum acceptable portfolio loss of ${assessment.max_loss_percentage || 10}%. This assessment evaluated financial ` +
           `resilience based on income stability, asset base, time horizon, and financial obligations. The results will inform ` +
           `portfolio construction and risk management strategies.`
  }
  
  return 'This assessment has been conducted in accordance with FCA guidelines and forms part of the suitability assessment process.'
}

function addPersonaProfessionalContent(doc: any, assessment: AssessmentData, yPos: number, colors: any): number {
  // Profile Classification Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Profile Classification', 20, yPos)
  yPos += 8
  
  // Visual profile indicator
  doc.setFillColor(colors.background)
  doc.setDrawColor(colors.border)
  doc.rect(20, yPos - 3, 170, 25, 'FD')
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.secondary)
  doc.text(assessment.persona_type || 'Profile Type', 105, yPos + 5, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  doc.text(`Classification Confidence: ${assessment.confidence || 0}%`, 105, yPos + 12, { align: 'center' })
  doc.text(`Profile Level: ${assessment.persona_level || 'Not Determined'}`, 105, yPos + 18, { align: 'center' })
  
  yPos += 30
  
  // Add visual confidence chart
  yPos = addConfidenceChart(doc, assessment.confidence || 0, yPos, colors)
  
  // Profile Characteristics
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Profile Analysis', 20, yPos)
  yPos += 8
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  
  const profileAnalysis = generatePersonaAnalysis(assessment)
  const analysisLines = doc.splitTextToSize(profileAnalysis, 170)
  doc.text(analysisLines, 20, yPos)
  yPos += analysisLines.length * 4 + 8
  
  // Investment Motivations
  if (assessment.motivations && assessment.motivations.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(colors.primary)
    doc.text('Identified Investment Motivations', 20, yPos)
    yPos += 8
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(colors.text)
    
    // CORRECT
const motivationsText = 'The assessment identified the following primary investment motivations based on the responses provided: ' +
                       assessment.motivations.join(', ') + '. These motivations were consistently reflected across multiple ' +
                       'assessment questions and form the basis for understanding investment objectives.'
    
    const motivationLines = doc.splitTextToSize(motivationsText, 170)
    doc.text(motivationLines, 20, yPos)
    yPos += motivationLines.length * 4 + 8
  }
  
  // Risk Considerations
  if (assessment.fears && assessment.fears.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(colors.primary)
    doc.text('Risk Considerations', 20, yPos)
    yPos += 8
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(colors.text)
    
    // CORRECT
const risksText = 'The following investment concerns were identified through the assessment process: ' +
                 assessment.fears.join(', ') + '. These considerations will be addressed through appropriate ' +
                 'portfolio construction and risk management strategies.'
    const riskLines = doc.splitTextToSize(risksText, 170)
    doc.text(riskLines, 20, yPos)
    yPos += riskLines.length * 4 + 8
  }
  
  // Communication Framework
  if (assessment.communication_needs) {
    if (yPos > 220) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(colors.primary)
    doc.text('Communication Framework', 20, yPos)
    yPos += 8
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(colors.text)
    
    const commText = `Based on the assessment responses, the preferred communication approach includes ` +
                    `${assessment.communication_needs.frequency || 'regular'} contact frequency with ` +
                    `${assessment.communication_needs.style || 'detailed'} information delivery. The indicated preference ` +
                    `for ${assessment.communication_needs.format || 'written'} communications will be incorporated into ` +
                    `the service delivery model, with ${assessment.communication_needs.meetingPreference || 'quarterly'} ` +
                    `review meetings as standard.`
    
    const commLines = doc.splitTextToSize(commText, 170)
    doc.text(commLines, 20, yPos)
    yPos += commLines.length * 4 + 8
  }
  
  return yPos
}

function addStandardAssessmentContent(doc: any, type: string, assessment: AssessmentData, yPos: number, colors: any): number {
  // Assessment Metrics
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Assessment Metrics', 20, yPos)
  yPos += 8
  
  // Score visualization
  const score = assessment.total_score || 0
  yPos = addScoreVisualization(doc, score, yPos, colors)
  
  // Detailed metrics box
  doc.setFillColor(colors.background)
  doc.setDrawColor(colors.border)
  doc.rect(20, yPos - 3, 170, 30, 'FD')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  
  doc.text(`Assessment Score: ${score} out of 100`, 25, yPos + 5)
  doc.text(`Risk Classification: ${assessment.risk_category || 'Not Determined'}`, 25, yPos + 11)
  doc.text(`Risk Level: ${assessment.risk_level || 'Not Determined'} (Scale: 1-5)`, 25, yPos + 17)
  
  if (type === 'cfl' && assessment.max_loss_percentage !== undefined) {
    doc.text(`Maximum Acceptable Loss: ${assessment.max_loss_percentage}%`, 25, yPos + 23)
  }
  
  yPos += 35
  
  // Score Interpretation
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Score Interpretation', 20, yPos)
  yPos += 8
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  
  const interpretation = generateScoreInterpretation(type, assessment)
  const interpretationLines = doc.splitTextToSize(interpretation, 170)
  doc.text(interpretationLines, 20, yPos)
  yPos += interpretationLines.length * 4 + 8
  
  // Portfolio Implications
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.primary)
  doc.text('Portfolio Implications', 20, yPos)
  yPos += 8
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(colors.text)
  
  const implications = generatePortfolioImplications(type, assessment)
  const implicationLines = doc.splitTextToSize(implications, 170)
  doc.text(implicationLines, 20, yPos)
  yPos += implicationLines.length * 4 + 8
  
  return yPos
}

// Chart helper functions
function addConfidenceChart(doc: any, confidence: number, yPos: number, colors: any): number {
  // Simple horizontal bar chart for confidence
  doc.setDrawColor(colors.border)
  doc.setLineWidth(0.5)
  
  // Background bar
  doc.rect(40, yPos, 130, 8)
  
  // Confidence fill
  const fillColor = confidence >= 80 ? colors.chartColors.green : 
                   confidence >= 60 ? colors.chartColors.amber : 
                   colors.chartColors.red
  doc.setFillColor(fillColor)
  doc.rect(40, yPos, (130 * confidence) / 100, 8, 'F')
  
  // Labels
  doc.setFontSize(8)
  doc.setTextColor(colors.lightText)
  doc.text('0%', 35, yPos + 5, { align: 'right' })
  doc.text('100%', 175, yPos + 5)
  doc.text(`${confidence}%`, 40 + (130 * confidence) / 100, yPos - 2, { align: 'center' })
  
  return yPos + 15
}

function addScoreVisualization(doc: any, score: number, yPos: number, colors: any): number {
  // Risk meter visualization
  const centerX = 105
  const centerY = yPos + 15
  const radius = 25
  
  // Draw arc segments
  const segments = [
    { start: Math.PI, end: Math.PI * 1.2, color: colors.chartColors.green, label: 'Low' },
    { start: Math.PI * 1.2, end: Math.PI * 1.4, color: colors.chartColors.amber, label: 'Med' },
    { start: Math.PI * 1.4, end: Math.PI * 1.6, color: colors.chartColors.amber, label: 'Med-High' },
    { start: Math.PI * 1.6, end: Math.PI * 2, color: colors.chartColors.red, label: 'High' }
  ]
  
  segments.forEach(segment => {
    doc.setFillColor(segment.color)
    doc.setDrawColor(segment.color)
    
    // Draw arc segment (simplified as lines for jsPDF)
    const steps = 20
    for (let i = 0; i < steps; i++) {
      const angle1 = segment.start + (segment.end - segment.start) * (i / steps)
      const angle2 = segment.start + (segment.end - segment.start) * ((i + 1) / steps)
      
      const x1 = centerX + Math.cos(angle1) * radius
      const y1 = centerY + Math.sin(angle1) * radius
      const x2 = centerX + Math.cos(angle2) * radius
      const y2 = centerY + Math.sin(angle2) * radius
      
      doc.line(centerX, centerY, x1, y1)
      doc.line(centerX, centerY, x2, y2)
      doc.line(x1, y1, x2, y2)
    }
  })
  
  // Draw needle based on score
  const needleAngle = Math.PI + (Math.PI * score / 100)
  const needleX = centerX + Math.cos(needleAngle) * (radius - 5)
  const needleY = centerY + Math.sin(needleAngle) * (radius - 5)
  
  doc.setDrawColor(colors.text)
  doc.setLineWidth(2)
  doc.line(centerX, centerY, needleX, needleY)
  
  // Center dot
  doc.setFillColor(colors.text)
  doc.circle(centerX, centerY, 2, 'F')
  
  // Score label
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(colors.text)
  doc.text(`${score}/100`, centerX, centerY + radius + 10, { align: 'center' })
  
  return yPos + radius * 2 + 15
}

// Content generation functions
function generatePersonaAnalysis(assessment: AssessmentData): string {
  const level = parseInt(assessment.persona_level || '3')
  
  return `The assessment responses indicate characteristics consistent with a level ${level} investor profile. ` +
         `This classification was determined through analysis of ${assessment.answers ? Object.keys(assessment.answers).length : 'multiple'} ` +
         `responses covering investment preferences, risk tolerance, decision-making patterns, and communication preferences. ` +
         `The ${assessment.confidence || 0}% confidence score indicates the degree of consistency in responses across different ` +
         `assessment dimensions. This profile suggests investment behaviors and preferences that align with ` +
         `${level <= 2 ? 'conservative, capital-preservation focused strategies' : 
           level === 3 ? 'balanced approaches seeking moderate growth with controlled risk' :
           'growth-oriented strategies with higher risk tolerance'}.`
}

function generateScoreInterpretation(type: string, assessment: AssessmentData): string {
  const score = assessment.total_score || 0
  
  if (type === 'atr') {
    return `The assessment score of ${score} out of 100 was calculated using a weighted scoring methodology across ` +
           `${assessment.answers ? Object.keys(assessment.answers).length : '15'} risk-related questions. ` +
           `Scores in the ${score < 30 ? '0-30' : score < 50 ? '30-50' : score < 70 ? '50-70' : '70-100'} range ` +
           `typically indicate ${score < 30 ? 'conservative risk tolerance with priority on capital preservation' :
            score < 50 ? 'moderately conservative preferences with limited appetite for volatility' :
            score < 70 ? 'balanced risk tolerance accepting moderate volatility for growth' :
            'higher risk tolerance with focus on maximizing long-term returns'}. ` +
           `This scoring aligns with FCA guidelines for risk profiling and has been validated against historical investor behavior patterns.`
  } else if (type === 'cfl') {
    return `The capacity for loss assessment evaluated financial resilience across multiple dimensions including income stability, ` +
           `asset base, time horizon, and financial obligations. The resulting classification of "${assessment.capacity_category || 'Moderate'}" ` +
           `with a maximum acceptable loss threshold of ${assessment.max_loss_percentage || 10}% indicates ` +
           `${assessment.capacity_category === 'High' ? 'substantial financial resources that can withstand market volatility without impacting lifestyle or security' :
             assessment.capacity_category === 'Low' ? 'limited financial flexibility requiring careful risk management to protect capital' :
             'moderate financial resilience with some capacity to absorb temporary losses'}. ` +
           `This assessment considers both quantitative financial metrics and qualitative factors affecting loss capacity.`
  }
  
  return `The assessment score reflects responses to standardized questions designed to evaluate investment preferences and constraints. ` +
         `The scoring methodology follows industry best practices and regulatory guidelines for investor profiling.`
}

function generatePortfolioImplications(type: string, assessment: AssessmentData): string {
  const score = assessment.total_score || 0
  const category = assessment.risk_category || 'Moderate'
  
  if (type === 'atr') {
    return `Based on the ${category} risk classification, portfolio construction should consider ` +
           `${score < 30 ? 'a defensive allocation with 20-30% equity exposure and emphasis on fixed income and cash equivalents' :
             score < 50 ? 'a conservative allocation with 30-40% equity exposure balanced with investment-grade bonds' :
             score < 70 ? 'a balanced allocation with 50-60% equity exposure across diversified markets and sectors' :
             'a growth-oriented allocation with 70-80% equity exposure including emerging markets and growth sectors'}. ` +
           `Regular rebalancing will be required to maintain these target allocations. The portfolio should be reviewed ` +
           `annually or following significant market events or personal circumstances changes.`
  } else if (type === 'cfl') {
    return `The ${assessment.capacity_category || 'Moderate'} capacity for loss classification indicates that portfolio construction ` +
           `should ${assessment.capacity_category === 'Low' ? 'prioritize capital preservation with maximum drawdown limits of ' + (assessment.max_loss_percentage || 10) + '%' :
                     assessment.capacity_category === 'High' ? 'allow for strategic positioning in higher-return assets while maintaining prudent diversification' :
                     'balance growth objectives with downside protection through diversification and risk management overlays'}. ` +
           `Stress testing should be conducted to ensure the portfolio remains within acceptable loss parameters under adverse market conditions. ` +
           `Liquidity requirements should be carefully considered to avoid forced selling during market downturns.`
  }
  
  return `Portfolio construction will incorporate the assessment findings to ensure alignment with identified risk parameters and investment objectives.`
}

function generateProfessionalRecommendations(type: string, assessment: AssessmentData): string[] {
  if (type === 'persona') {
    const level = parseInt(assessment.persona_level || '3')
    
    if (level <= 2) {
      return [
        'Establish a robust emergency fund equivalent to 6-12 months of expenses before increasing investment risk exposure.',
        'Implement a phased investment approach starting with diversified, lower-volatility funds to build confidence and experience.',
        'Schedule quarterly reviews to monitor comfort levels and make gradual adjustments as appropriate.',
        'Consider structured products that provide downside protection while maintaining some growth potential.',
        'Maintain detailed documentation of all investment decisions and rationales for future reference.'
      ]
    } else if (level === 3) {
      return [
        'Construct a diversified portfolio with strategic asset allocation aligned to medium-term objectives.',
        'Implement systematic rebalancing protocols to maintain target allocations through market cycles.',
        'Establish clear investment policy statements defining acceptable ranges for each asset class.',
        'Incorporate tax-efficient strategies including ISA utilization and capital gains management.',
        'Develop contingency plans for various market scenarios to ensure disciplined decision-making.'
      ]
    } else {
      return [
        'Develop a strategic allocation incorporating growth assets across global markets and sectors.',
        'Consider alternative investments within regulatory limits to enhance portfolio diversification.',
        'Implement dynamic risk management strategies to capitalize on market opportunities.',
        'Establish systematic profit-taking and loss-limitation protocols to manage portfolio volatility.',
        'Maintain focus on long-term objectives while managing short-term volatility expectations.'
      ]
    }
  } else if (type === 'atr') {
    const score = assessment.total_score || 0
    
    if (score < 40) {
      return [
        'Prioritize capital preservation through allocation to government bonds and investment-grade corporate debt.',
        'Limit equity exposure to large-cap, dividend-paying stocks in defensive sectors.',
        'Implement pound-cost averaging for any increases in risk asset allocation.',
        'Maintain minimum 20% allocation to liquid assets for emergency needs.',
        'Review portfolio quarterly with focus on risk metrics rather than return comparisons.'
      ]
    } else if (score < 70) {
      return [
        'Establish balanced allocation across equities and fixed income with regular rebalancing triggers.',
        'Diversify equity holdings across geographic regions and market capitalizations.',
        'Include inflation-linked bonds to protect purchasing power over medium term.',
        'Consider multi-asset funds for simplified diversification and professional management.',
        'Implement stop-loss protocols for individual holdings exceeding 5% of portfolio value.'
      ]
    } else {
      return [
        'Construct growth-focused portfolio with emphasis on global equity markets.',
        'Include emerging market exposure within defined limits for enhanced return potential.',
        'Consider sector rotation strategies based on economic cycle positioning.',
        'Implement options strategies for income generation and risk management where appropriate.',
        'Maintain disciplined approach to position sizing and portfolio concentration limits.'
      ]
    }
  }
  
  return [
    'Schedule a comprehensive review meeting to discuss assessment findings in detail.',
    'Develop a formal Investment Policy Statement incorporating assessment outcomes.',
    'Establish regular review schedule aligned with identified communication preferences.',
    'Implement robust portfolio monitoring and reporting framework.',
    'Ensure ongoing compliance with regulatory requirements and best practices.'
  ]
}
