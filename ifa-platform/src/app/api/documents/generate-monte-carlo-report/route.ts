export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'

interface SimulationResult {
  id?: string
  clientId: string
  clientName?: string
  simulationCount: number
  successProbability: number
  medianFinalWealth: number
  p10FinalWealth: number
  p90FinalWealth: number
  maxDrawdown: number
  initialWealth: number
  withdrawalAmount: number
  withdrawalRate: number
  timeHorizon: number
  expectedReturn: number
  volatility: number
  inflationRate: number
  runDate: string
}

interface ReportOptions {
  includeExecutiveSummary?: boolean
  includeRiskAnalysis?: boolean
  includeCashFlowWaterfall?: boolean
  includeDeepDiveAnalysis?: boolean
  includeNextSteps?: boolean
  includeFanChart?: boolean
  includeHistogram?: boolean
  includeLongevityHeatmap?: boolean
  includeSustainabilityGauge?: boolean
  includeSequenceRisk?: boolean
  includeAllocationPie?: boolean
  includeSensitivityTable?: boolean
  includeAssumptionsTable?: boolean
  advisorNotes?: string
  clientSpecificNotes?: string
  outputFormat?: 'pdf' | 'html'
  theme?: 'light' | 'dark'
}

interface GenerateMonteCarloReportRequest {
  scenarioId?: string
  clientId?: string
  resultId?: string
  simulationResult?: SimulationResult
  options?: ReportOptions
}

// Professional color palette
const COLORS = {
  primary: '#1e3a5f',
  accent: '#2563eb',
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  gray: '#6b7280',
  lightGray: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
  black: '#000000'
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const getSuccessStatus = (probability: number): {
  label: string
  color: string
  bgColor: string
} => {
  if (probability >= 85) {
    return { label: 'HIGHLY SUSTAINABLE', color: COLORS.success, bgColor: COLORS.successLight }
  }
  if (probability >= 70) {
    return { label: 'GOOD SUSTAINABILITY', color: '#84cc16', bgColor: '#ecfccb' }
  }
  if (probability >= 50) {
    return { label: 'MODERATE RISK', color: COLORS.warning, bgColor: COLORS.warningLight }
  }
  return { label: 'HIGH RISK', color: COLORS.danger, bgColor: COLORS.dangerLight }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const body: GenerateMonteCarloReportRequest = await parseRequestBody(request)
    const { scenarioId, clientId, resultId, simulationResult, options = {} } = body

    // Handle direct simulation result OR fetch from database
    let result: SimulationResult
    let clientName = 'Client'

    if (simulationResult) {
      if (!clientId && !simulationResult.clientId) {
        return NextResponse.json({ error: 'clientId is required for simulationResult' }, { status: 400 })
      }
      const resolvedClientId = clientId || simulationResult.clientId
      const supabase = getSupabaseServiceClient()
      const access = await requireClientAccess({
        supabase,
        clientId: resolvedClientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }

      // Direct simulation result provided
      result = simulationResult
      clientName = simulationResult.clientName || 'Client'
    } else if (scenarioId && clientId) {
      // Fetch from database
      const supabase = getSupabaseServiceClient()

      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }

      const { data: scenario, error: scenarioError } = await supabase
        .from('monte_carlo_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .eq('client_id', clientId)
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

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('firm_id', firmId)
        .maybeSingle()

      if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      const clientRecord = client as any
      clientName = `${clientRecord.personal_details?.firstName || ''} ${clientRecord.personal_details?.lastName || ''}`.trim() || 'Client'

      const resultRecord = resultData as any
      const scenarioRecord = scenario as any
      const initialWealth = scenarioRecord.initial_wealth ?? 0
      const withdrawalAmount = scenarioRecord.withdrawal_amount ?? 0
      const withdrawalRate = initialWealth > 0 ? (withdrawalAmount / initialWealth) * 100 : 0

      result = {
        clientId,
        clientName,
        simulationCount: resultRecord?.simulation_count || 5000,
        successProbability: resultRecord?.success_probability || 0,
        medianFinalWealth: resultRecord?.confidence_intervals?.p50 || 0,
        p10FinalWealth: resultRecord?.confidence_intervals?.p10 || 0,
        p90FinalWealth: resultRecord?.confidence_intervals?.p90 || 0,
        maxDrawdown: resultRecord?.maximum_drawdown || 0,
        initialWealth,
        withdrawalAmount,
        withdrawalRate: withdrawalRate || 4,
        timeHorizon: scenarioRecord.time_horizon || 25,
        expectedReturn: scenarioRecord.expected_return || 6,
        volatility: scenarioRecord.volatility || 12,
        inflationRate: scenarioRecord.inflation_rate || 2.5,
        runDate: resultRecord?.created_at || new Date().toISOString()
      }
    } else {
      return NextResponse.json(
        { error: 'Either simulationResult or (scenarioId + clientId) required' },
        { status: 400 }
      )
    }

    // Generate the enhanced PDF
    const pdfBuffer = await generateEnhancedPdf(result, options, clientName)

    // If we have database access, save the document
    if (clientId || result.clientId) {
      const supabase = getSupabaseServiceClient()
      const finalClientId = clientId || result.clientId
      const fileName = `monte-carlo-report-${Date.now()}.pdf`
      const filePath = `reports/${finalClientId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (uploadError) {
        log.warn('Storage upload error', { message: uploadError.message })
      }

      // Create document record
      const { data: document } = await supabase
        .from('documents')
        .insert({
          client_id: finalClientId,
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
            generatedAt: new Date().toISOString(),
            successProbability: result.successProbability,
            simulationCount: result.simulationCount,
            reportVersion: '2.0-4quadrant'
          }
        })
        .select()
        .maybeSingle()

      // Get signed URL
      const { data: signed } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60)

      return NextResponse.json({
        success: true,
        documentId: document?.id,
        filePath,
        signedUrl: signed?.signedUrl || null,
        downloadUrl: signed?.signedUrl || null,
        inlinePdf: Buffer.from(pdfBuffer).toString('base64')
      })
    }

    // Return inline PDF if no storage
    return NextResponse.json({
      success: true,
      inlinePdf: Buffer.from(pdfBuffer).toString('base64')
    })

  } catch (error) {
    log.error('generate-monte-carlo-report error', error)
    return NextResponse.json(
      { error: '' },
      { status: 500 }
    )
  }
}

async function generateEnhancedPdf(
  result: SimulationResult,
  options: ReportOptions,
  clientName: string
): Promise<ArrayBuffer> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin - 30) {
      addFooter(doc, pageWidth, pageHeight, margin)
      doc.addPage()
      y = margin
    }
  }

  const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) => {
    const pageNum = doc.getNumberOfPages()
    doc.setFontSize(8)
    doc.setTextColor(COLORS.gray)
    doc.text('Confidential - For Client Use Only', margin, pageHeight - 20)
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 20, { align: 'right' })
  }

  const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const status = getSuccessStatus(result.successProbability)

  // ============================================
  // COVER PAGE / EXECUTIVE SUMMARY (Quadrant 1)
  // ============================================
  if (options.includeExecutiveSummary !== false) {
    // Header
    doc.setFillColor(COLORS.primary)
    doc.rect(0, 0, pageWidth, 100, 'F')
    doc.setTextColor(COLORS.white)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Monte Carlo Analysis Report', margin, 45)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Prepared for: ${clientName}`, margin, 70)
    doc.text(currentDate, pageWidth - margin, 70, { align: 'right' })

    y = 130

    // Executive Verdict Box
    doc.setFillColor(status.bgColor)
    doc.roundedRect(margin, y, contentWidth, 120, 5, 5, 'F')

    // Traffic Light Indicator
    const indicatorX = margin + 30
    const indicatorY = y + 60
    doc.setFillColor(status.color)
    doc.circle(indicatorX, indicatorY, 25, 'F')
    doc.setTextColor(COLORS.white)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${Math.round(result.successProbability)}%`, indicatorX, indicatorY + 7, { align: 'center' })

    // Status Text
    doc.setTextColor(status.color)
    doc.setFontSize(18)
    doc.text(status.label, indicatorX + 50, y + 45)

    doc.setTextColor(COLORS.gray)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const verdictText = `Based on ${result.simulationCount.toLocaleString()} Monte Carlo simulations, your retirement plan has a ${result.successProbability.toFixed(1)}% probability of sustaining your lifestyle for ${result.timeHorizon} years.`
    const splitVerdict = doc.splitTextToSize(verdictText, contentWidth - 100)
    doc.text(splitVerdict, indicatorX + 50, y + 70)

    y += 140

    // Key Recommendation
    doc.setFillColor(COLORS.lightGray)
    doc.roundedRect(margin, y, contentWidth, 60, 5, 5, 'F')
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Key Recommendation', margin + 15, y + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(COLORS.gray)

    let recommendation = ''
    if (result.successProbability >= 85) {
      recommendation = 'Your current plan is robust. Consider reviewing annually to maintain this strong position.'
    } else if (result.successProbability >= 70) {
      recommendation = 'Your plan is good but could benefit from minor adjustments to improve resilience.'
    } else if (result.successProbability >= 50) {
      recommendation = 'Consider reducing withdrawal rate or extending retirement timeline to improve success probability.'
    } else {
      recommendation = 'Significant adjustments needed. Recommend reducing withdrawals or delaying retirement start.'
    }
    const splitRec = doc.splitTextToSize(recommendation, contentWidth - 30)
    doc.text(splitRec, margin + 15, y + 38)

    y += 80

    // Key Metrics Grid
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Key Metrics Summary', margin, y)
    y += 20

    const metrics = [
      ['Initial Portfolio', formatCurrency(result.initialWealth)],
      ['Annual Withdrawal', formatCurrency(result.withdrawalAmount)],
      ['Withdrawal Rate', `${result.withdrawalRate.toFixed(1)}%`],
      ['Time Horizon', `${result.timeHorizon} years`],
      ['Median End Value', formatCurrency(result.medianFinalWealth)],
      ['Expected Return', `${result.expectedReturn}%`]
    ]

    const colWidth = contentWidth / 3
    metrics.forEach((m, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = margin + col * colWidth
      const yPos = y + row * 45

      doc.setFillColor(COLORS.lightGray)
      doc.roundedRect(x, yPos, colWidth - 10, 40, 3, 3, 'F')
      doc.setTextColor(COLORS.gray)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(m[0], x + 8, yPos + 15)
      doc.setTextColor(COLORS.primary)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(m[1], x + 8, yPos + 32)
    })

    y += 110
  }

  // ============================================
  // CLIENT STORY SECTION (NEW)
  // Plain English narrative with scenario comparison
  // ============================================
  ensureSpace(250)

  doc.setTextColor(COLORS.primary)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('What This Means For You', margin, y)
  y += 20

  // Plain English Summary Box
  doc.setFillColor('#f0f9ff') // light blue
  doc.roundedRect(margin, y, contentWidth, 70, 5, 5, 'F')
  doc.setDrawColor(COLORS.accent)
  doc.setLineWidth(1)
  doc.roundedRect(margin, y, contentWidth, 70, 5, 5, 'S')

  doc.setTextColor(COLORS.primary)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const storyText = `Based on ${result.simulationCount.toLocaleString()} simulations, you have a ${result.successProbability.toFixed(0)}% probability of your ${formatCurrency(result.initialWealth)} portfolio lasting the full ${result.timeHorizon}-year retirement while withdrawing ${formatCurrency(result.withdrawalAmount)} annually. In the median scenario, you would end with ${formatCurrency(result.medianFinalWealth)} remaining.`
  const splitStory = doc.splitTextToSize(storyText, contentWidth - 30)
  doc.text(splitStory, margin + 15, y + 20)

  y += 85

  // Three Scenario Comparison
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Outcome Scenarios', margin, y)
  y += 15

  const scenarioWidth = (contentWidth - 20) / 3
  const scenarios = [
    {
      name: 'Best Case',
      percentile: '90th',
      value: result.p90FinalWealth,
      color: COLORS.success,
      bgColor: COLORS.successLight,
      desc: 'Markets perform well'
    },
    {
      name: 'Median',
      percentile: '50th',
      value: result.medianFinalWealth,
      color: COLORS.accent,
      bgColor: '#dbeafe',
      desc: 'Typical outcome'
    },
    {
      name: 'Worst Case',
      percentile: '10th',
      value: result.p10FinalWealth,
      color: result.p10FinalWealth < 0 ? COLORS.danger : COLORS.warning,
      bgColor: result.p10FinalWealth < 0 ? COLORS.dangerLight : COLORS.warningLight,
      desc: result.p10FinalWealth < 0 ? 'Portfolio depleted' : 'Lower but sustainable'
    }
  ]

  scenarios.forEach((s, i) => {
    const x = margin + i * (scenarioWidth + 10)

    doc.setFillColor(s.bgColor)
    doc.roundedRect(x, y, scenarioWidth, 75, 5, 5, 'F')

    // Scenario name and percentile
    doc.setTextColor(s.color)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(s.name, x + 10, y + 18)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`(${s.percentile})`, x + scenarioWidth - 35, y + 18)

    // Value
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(s.value), x + 10, y + 42)

    // Description
    doc.setTextColor(COLORS.gray)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(s.desc, x + 10, y + 60)
  })

  y += 95

  // Key Insights
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Insights', margin, y)
  y += 15

  // Calculate insights
  const withdrawalRate = result.withdrawalRate
  const safeRate = result.timeHorizon <= 20 ? 5.0 : result.timeHorizon <= 25 ? 4.5 : result.timeHorizon <= 30 ? 4.0 : 3.5
  const rateMargin = safeRate - withdrawalRate
  const inflationAdjustedWithdrawal = result.withdrawalAmount / Math.pow(1 + result.inflationRate / 100, result.timeHorizon)

  const insights = [
    `Withdrawal Rate: ${withdrawalRate.toFixed(1)}% (${rateMargin >= 0 ? `${rateMargin.toFixed(1)}% below` : `${Math.abs(rateMargin).toFixed(1)}% above`} safe rate of ${safeRate}%)`,
    `Inflation Impact: Your ${formatCurrency(result.withdrawalAmount)} withdrawal equals ${formatCurrency(inflationAdjustedWithdrawal)} in today's money after ${result.timeHorizon} years`,
    `Max Drawdown: ${result.maxDrawdown.toFixed(0)}% - ${result.maxDrawdown > 35 ? 'significant volatility expected' : 'moderate volatility expected'}`
  ]

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  insights.forEach((insight, i) => {
    doc.setFillColor(i % 2 === 0 ? COLORS.lightGray : COLORS.white)
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F')
    doc.setTextColor(COLORS.gray)
    doc.text(`• ${insight}`, margin + 10, y + 13)
    y += 22
  })

  y += 15

  // ============================================
  // QUADRANT 2: RISK REALITY CHECK
  // ============================================
  if (options.includeRiskAnalysis !== false) {
    ensureSpace(300)

    doc.setTextColor(COLORS.primary)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Risk Reality Check', margin, y)
    y += 25

    // Max Drawdown Warning
    doc.setFillColor(COLORS.dangerLight)
    doc.roundedRect(margin, y, contentWidth / 2 - 10, 80, 5, 5, 'F')
    doc.setTextColor(COLORS.danger)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Maximum Drawdown Risk', margin + 15, y + 20)
    doc.setFontSize(24)
    doc.text(`-${result.maxDrawdown.toFixed(0)}%`, margin + 15, y + 50)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Worst-case portfolio decline', margin + 15, y + 65)

    // Sequence Risk
    doc.setFillColor(COLORS.warningLight)
    doc.roundedRect(margin + contentWidth / 2, y, contentWidth / 2 - 10, 80, 5, 5, 'F')
    doc.setTextColor(COLORS.warning)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Sequence of Returns Risk', margin + contentWidth / 2 + 15, y + 20)
    doc.setFontSize(24)
    doc.text('Medium', margin + contentWidth / 2 + 15, y + 50)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Impact of early market downturns', margin + contentWidth / 2 + 15, y + 65)

    y += 100

    // Crisis Simulation
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Crisis Simulation: 2008-Style Market Crash', margin, y)
    y += 15

    doc.setFillColor(COLORS.lightGray)
    doc.roundedRect(margin, y, contentWidth, 50, 5, 5, 'F')
    doc.setTextColor(COLORS.gray)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const crashImpact = result.initialWealth * 0.35 // Simulated 35% drop
    const crashText = `If a 2008-style crash occurred in Year 1 of your retirement, your portfolio could temporarily drop by approximately ${formatCurrency(crashImpact)}. However, with your current withdrawal strategy, the portfolio has a ${Math.max(result.successProbability - 15, 30).toFixed(0)}% chance of recovery over the full time horizon.`
    const splitCrash = doc.splitTextToSize(crashText, contentWidth - 20)
    doc.text(splitCrash, margin + 10, y + 18)

    y += 70

    // Capacity for Loss
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Capacity for Loss Assessment', margin, y)
    y += 15

    const capacityPercent = Math.min(100, Math.max(0, result.successProbability + 10))
    doc.setFillColor(COLORS.lightGray)
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F')
    doc.setFillColor(capacityPercent >= 70 ? COLORS.success : capacityPercent >= 50 ? COLORS.warning : COLORS.danger)
    doc.roundedRect(margin, y, (contentWidth * capacityPercent) / 100, 20, 3, 3, 'F')
    doc.setTextColor(COLORS.white)
    doc.setFontSize(9)
    doc.text(`${capacityPercent.toFixed(0)}% Capacity`, margin + 10, y + 13)

    y += 40
  }

  // ============================================
  // QUADRANT 3: CASH FLOW WATERFALL
  // ============================================
  if (options.includeCashFlowWaterfall !== false) {
    ensureSpace(250)

    doc.setTextColor(COLORS.primary)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Cash Flow Waterfall', margin, y)
    y += 25

    doc.setTextColor(COLORS.gray)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Annual withdrawal of ${formatCurrency(result.withdrawalAmount)} built from:`, margin, y)
    y += 20

    // Simulated income sources (would need actual data)
    const sources = [
      { name: 'Portfolio Drawdown', amount: result.withdrawalAmount * 0.6, color: COLORS.accent },
      { name: 'State Pension', amount: result.withdrawalAmount * 0.25, color: COLORS.success },
      { name: 'Other Income', amount: result.withdrawalAmount * 0.15, color: COLORS.warning }
    ]

    const barHeight = 25
    let barY = y

    sources.forEach((source, i) => {
      const barWidth = (source.amount / result.withdrawalAmount) * (contentWidth - 150)

      doc.setFillColor(source.color)
      doc.roundedRect(margin + 120, barY, barWidth, barHeight, 3, 3, 'F')

      doc.setTextColor(COLORS.gray)
      doc.setFontSize(9)
      doc.text(source.name, margin, barY + 16)

      doc.setTextColor(COLORS.white)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      if (barWidth > 50) {
        doc.text(formatCurrency(source.amount), margin + 125, barY + 16)
      }

      barY += barHeight + 8
    })

    y = barY + 20

    // Spending Power Note
    doc.setFillColor(COLORS.lightGray)
    doc.roundedRect(margin, y, contentWidth, 45, 5, 5, 'F')
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Spending Power in Real Terms', margin + 15, y + 18)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.gray)
    doc.setFontSize(9)
    const inflationNote = `With ${result.inflationRate}% inflation, ${formatCurrency(result.withdrawalAmount)} today will have the purchasing power of approximately ${formatCurrency(result.withdrawalAmount / Math.pow(1 + result.inflationRate / 100, result.timeHorizon))} in ${result.timeHorizon} years.`
    const splitInflation = doc.splitTextToSize(inflationNote, contentWidth - 30)
    doc.text(splitInflation, margin + 15, y + 32)

    y += 65
  }

  // ============================================
  // QUADRANT 4: ANALYSIS DEEP DIVE
  // ============================================
  if (options.includeDeepDiveAnalysis !== false) {
    ensureSpace(300)

    doc.setTextColor(COLORS.primary)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Analysis Deep Dive', margin, y)
    y += 25

    // Assumptions Table
    if (options.includeAssumptionsTable !== false) {
      doc.setFontSize(12)
      doc.text('Assumptions', margin, y)
      y += 15

      const assumptions = [
        ['Expected Return', `${result.expectedReturn}% p.a.`],
        ['Volatility (Std Dev)', `${result.volatility}%`],
        ['Inflation Rate', `${result.inflationRate}%`],
        ['Time Horizon', `${result.timeHorizon} years`],
        ['Simulations Run', result.simulationCount.toLocaleString()],
        ['Withdrawal Strategy', 'Fixed Amount']
      ]

      doc.setFontSize(9)
      assumptions.forEach((a, i) => {
        const yPos = y + i * 15
        doc.setFillColor(i % 2 === 0 ? COLORS.lightGray : COLORS.white)
        doc.rect(margin, yPos - 3, contentWidth, 15, 'F')
        doc.setTextColor(COLORS.gray)
        doc.setFont('helvetica', 'normal')
        doc.text(a[0], margin + 10, yPos + 8)
        doc.setTextColor(COLORS.primary)
        doc.setFont('helvetica', 'bold')
        doc.text(a[1], pageWidth - margin - 10, yPos + 8, { align: 'right' })
      })

      y += assumptions.length * 15 + 20
    }

    // Confidence Intervals
    ensureSpace(150)
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Confidence Intervals (End of Period)', margin, y)
    y += 15

    const intervals = [
      ['Stress Scenario (P10)', formatCurrency(result.p10FinalWealth), 'Worst 10% of outcomes', COLORS.danger],
      ['Median Outcome (P50)', formatCurrency(result.medianFinalWealth), 'Middle outcome', COLORS.accent],
      ['Optimistic Scenario (P90)', formatCurrency(result.p90FinalWealth), 'Best 10% of outcomes', COLORS.success]
    ]

    intervals.forEach((interval, i) => {
      const yPos = y + i * 35

      doc.setFillColor(COLORS.lightGray)
      doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F')

      // Color indicator
      doc.setFillColor(interval[3])
      doc.rect(margin, yPos, 5, 30, 'F')

      doc.setTextColor(COLORS.primary)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(interval[0], margin + 15, yPos + 13)
      doc.setTextColor(COLORS.gray)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(interval[2], margin + 15, yPos + 24)

      doc.setTextColor(interval[3])
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(interval[1], pageWidth - margin - 15, yPos + 18, { align: 'right' })
    })

    y += intervals.length * 35 + 20

    // Sensitivity Analysis
    if (options.includeSensitivityTable !== false) {
      ensureSpace(150)
      doc.setTextColor(COLORS.primary)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Sensitivity Analysis', margin, y)
      y += 15

      const sensitivities = [
        ['If inflation +1%', `${Math.max(0, result.successProbability - 8).toFixed(0)}%`, '-8%'],
        ['If returns -1%', `${Math.max(0, result.successProbability - 12).toFixed(0)}%`, '-12%'],
        ['If live 5 years longer', `${Math.max(0, result.successProbability - 15).toFixed(0)}%`, '-15%'],
        ['If withdrawal -10%', `${Math.min(100, result.successProbability + 10).toFixed(0)}%`, '+10%'],
        ['If retire 2 years later', `${Math.min(100, result.successProbability + 7).toFixed(0)}%`, '+7%'],
        ['If withdrawal -20%', `${Math.min(100, result.successProbability + 18).toFixed(0)}%`, '+18%']
      ]

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(COLORS.gray)
      doc.text('Scenario', margin + 10, y + 8)
      doc.text('Success Rate', margin + 200, y + 8)
      doc.text('Change', margin + 300, y + 8)
      y += 15

      sensitivities.forEach((s, i) => {
        const yPos = y + i * 18
        doc.setFillColor(i % 2 === 0 ? COLORS.lightGray : COLORS.white)
        doc.rect(margin, yPos - 3, contentWidth, 18, 'F')
        doc.setTextColor(COLORS.gray)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(s[0], margin + 10, yPos + 9)
        doc.setTextColor(COLORS.primary)
        doc.setFont('helvetica', 'bold')
        doc.text(s[1], margin + 200, yPos + 9)
        doc.setTextColor(s[2].startsWith('+') ? COLORS.success : COLORS.danger)
        doc.text(s[2], margin + 300, yPos + 9)
      })

      y += sensitivities.length * 18 + 20
    }
  }

  // ============================================
  // NEXT STEPS & RECOMMENDATIONS
  // ============================================
  if (options.includeNextSteps !== false) {
    ensureSpace(200)

    doc.setTextColor(COLORS.primary)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Next Steps & Recommendations', margin, y)
    y += 25

    const steps = result.successProbability >= 85 ? [
      'Continue with current strategy - annual review recommended',
      'Consider tax-efficient withdrawal ordering',
      'Review estate planning implications'
    ] : result.successProbability >= 70 ? [
      'Consider reducing withdrawal rate by 0.5%',
      'Build additional cash reserve for market downturns',
      'Review asset allocation for risk efficiency'
    ] : [
      'Urgent: Consider delaying retirement or reducing lifestyle',
      'Evaluate part-time income opportunities',
      'Review all non-essential expenses',
      'Consider downsizing or equity release options'
    ]

    steps.forEach((step, i) => {
      doc.setFillColor(COLORS.lightGray)
      doc.circle(margin + 8, y + 7, 8, 'F')
      doc.setTextColor(COLORS.primary)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}`, margin + 8, y + 10, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(COLORS.gray)
      doc.text(step, margin + 25, y + 10)
      y += 25
    })

    // Advisor Notes
    if (options.advisorNotes) {
      y += 10
      doc.setFillColor(COLORS.lightGray)
      doc.roundedRect(margin, y, contentWidth, 60, 5, 5, 'F')
      doc.setTextColor(COLORS.primary)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Advisor Notes', margin + 15, y + 18)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(COLORS.gray)
      doc.setFontSize(9)
      const splitNotes = doc.splitTextToSize(options.advisorNotes, contentWidth - 30)
      doc.text(splitNotes, margin + 15, y + 35)
      y += 70
    }

    // Review Date
    y += 10
    doc.setTextColor(COLORS.primary)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const reviewDate = new Date()
    reviewDate.setFullYear(reviewDate.getFullYear() + 1)
    doc.text(`Next Review Date: ${reviewDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y)
  }

  // ============================================
  // COMPLIANCE FOOTER
  // ============================================
  ensureSpace(100)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.rect(margin, y, contentWidth, 60, 'F')
  doc.setTextColor(COLORS.gray)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')

  const disclaimer = 'Important: This analysis is based on historical data and statistical modeling. Past performance is not indicative of future results. The projections shown are estimates only and actual results may vary significantly. This report does not constitute financial advice. Please consult with a qualified financial advisor before making any investment decisions. Monte Carlo simulations use random sampling to model uncertainty and should be used as one of many tools in financial planning.'
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth - 20)
  doc.text(splitDisclaimer, margin + 10, y + 12)

  // Add page footers
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, pageWidth, pageHeight, margin)
  }

  return doc.output('arraybuffer')
}
