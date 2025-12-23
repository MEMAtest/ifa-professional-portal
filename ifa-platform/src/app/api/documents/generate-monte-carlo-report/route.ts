export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { log } from '@/lib/logging/structured'
// ChartJSNodeCanvas removed - requires native 'canvas' module
// Charts are generated client-side or omitted from server PDFs

interface GenerateMonteCarloReportRequest {
  scenarioId: string
  clientId: string
  resultId?: string
}

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured')
  }

  return createSupabaseClient(url, key)
}

// Shared palette with assessment reports
const COLORS = {
  primary: '#0f172a',
  accent: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
  lightGray: '#f8fafc',
  border: '#e2e8f0'
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMonteCarloReportRequest = await request.json()
    const { scenarioId, clientId, resultId } = body

    if (!scenarioId || !clientId) {
      return NextResponse.json(
        { error: 'scenarioId and clientId are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // Load scenario + latest result (or specified resultId)
    const { data: scenario, error: scenarioError } = await supabase
      .from('monte_carlo_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .maybeSingle()

    if (scenarioError || !scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const resultQuery = supabase
      .from('monte_carlo_results')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })

    if (resultId) {
      resultQuery.eq('id', resultId)
    }

    const { data: resultData, error: resultError } = await resultQuery.limit(1).single()
    if (resultError && resultError.code !== 'PGRST116') {
      log.warn('Result lookup warning', { message: resultError.message })
    }
    const result = resultData || null

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const charts = await generateCharts(result)
    const pdfBuffer = await generatePdf({ scenario, result, client, charts })

    const fileName = `monte-carlo-${scenarioId}-${Date.now()}.pdf`
    const filePath = `reports/${clientId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    const inlinePdf = Buffer.from(pdfBuffer).toString('base64')
    if (uploadError) {
      log.warn('Storage upload error (returning inline PDF instead)', { message: uploadError.message })
      return NextResponse.json({
        success: true,
        documentId: null,
        filePath: null,
        signedUrl: null,
        inlinePdf,
        error: uploadError.message
      })
    }

    // Create document record for auditing
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        client_id: clientId,
        name: fileName,
        document_type: 'monte_carlo',
        type: 'monte_carlo',
        category: 'monte_carlo',
        file_path: filePath,
        storage_path: filePath,
        file_name: fileName,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        compliance_status: 'approved',
        version_number: 1,
        is_template: false,
        is_archived: false,
        metadata: {
          scenarioId,
          resultId: result?.id || null,
          generatedAt: new Date().toISOString(),
          hasCharts: !!(charts.successChart || charts.percentileChart)
        }
      })
      .select()
      .maybeSingle()

    if (dbError) {
      log.warn('Document insert error (returning inline PDF)', { message: dbError.message })
      return NextResponse.json({
        success: true,
        documentId: null,
        filePath: filePath,
        signedUrl: null,
        inlinePdf,
        error: dbError.message
      })
    }

    // Signed URL for immediate download (1 hour)
    const { data: signed, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 60 * 60)

    if (signedError) {
      log.warn('Signed URL error', { message: signedError.message })
    }

    return NextResponse.json({
      success: true,
      documentId: document?.id,
      filePath,
      signedUrl: signed?.signedUrl || null,
      inlinePdf
    })
  } catch (error) {
    log.error('generate-monte-carlo-report error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateCharts(_result: any): Promise<{ successChart?: string; percentileChart?: string }> {
  // Charts disabled - canvas module not available in Next.js serverless environment
  // PDF will be generated without embedded charts
  // Charts can be rendered client-side if needed
  return {}
}

async function generatePdf(params: {
  scenario: any
  result: any
  client: any
  charts?: { successChart?: string; percentileChart?: string }
}): Promise<ArrayBuffer> {
  const { scenario, result, client, charts } = params
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  let y = 90

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const clientName = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Client'
  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Header
  doc.setFillColor(COLORS.primary)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Monte Carlo Report', margin, 35)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(currentDate, pageWidth - margin, 35, { align: 'right' })
  doc.text('Plannetic Advisory', margin, 52)

  // Client + scenario summary
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', margin, y)
  y += 18
  ensureSpace(60)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text(`Client: ${clientName}`, margin, y)
  doc.text(`Scenario: ${scenario.scenario_name || scenario.name || 'Scenario'}`, margin + 220, y)
  y += 16
  doc.text(`Initial Wealth: £${Number(scenario.initial_wealth || 0).toLocaleString()}`, margin, y)
  doc.text(`Time Horizon: ${scenario.time_horizon || 0} years`, margin + 220, y)
  y += 16
  doc.text(`Withdrawal: £${Number(scenario.withdrawal_amount || 0).toLocaleString()}`, margin, y)
  doc.text(`Risk Score: ${scenario.risk_score ?? 'N/A'}`, margin + 220, y)
  y += 24

  doc.setDrawColor(COLORS.border)
  doc.line(margin, y, pageWidth - margin, y)
  y += 24

  // Key metrics
  ensureSpace(90)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Metrics', margin, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)

  const metrics = [
    ['Success Probability', `${Math.round(result?.success_probability || 0)}%`],
    ['Simulations', (result?.simulation_count || 0).toLocaleString()],
    ['Median Wealth (P50)', `£${Number(result?.confidence_intervals?.p50 || 0).toLocaleString()}`],
    ['Shortfall Risk', `${Math.round(result?.shortfall_risk || 0)}%`],
    ['Volatility', `${Math.round(result?.wealth_volatility || 0)}%`],
    ['Max Drawdown', `${Math.round(result?.maximum_drawdown || 0)}%`]
  ]

  metrics.forEach((m, index) => {
    const x = index % 2 === 0 ? margin : margin + contentWidth / 2
    const row = Math.floor(index / 2)
    const yPos = y + row * 18
    doc.text(`${m[0]}: ${m[1]}`, x, yPos)
  })
  y += Math.ceil(metrics.length / 2) * 18 + 18

  // Charts
  const addChart = (title: string, dataUrl?: string) => {
    if (!dataUrl) return
    ensureSpace(260)
    doc.setTextColor(COLORS.primary)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 12
    doc.addImage(dataUrl, 'PNG', margin, y, contentWidth, 220, undefined, 'FAST')
    y += 240
  }

  addChart('Success Probability', charts?.successChart)
  addChart('Projected Wealth by Percentile', charts?.percentileChart)

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(COLORS.gray)
    doc.text('Confidential – Prepared for the client', margin, pageHeight - 25)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 25, { align: 'right' })
  }

  return doc.output('arraybuffer')
}
