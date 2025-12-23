import jsPDF from 'jspdf'

import type { ReportContext } from '@/services/AdvisorContextService'
import { mapSuitabilityAssessmentRowToFormData } from '@/lib/suitability/mappers'

const COLORS = {
  primary: '#0f172a',
  accent: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
  lightGray: '#f1f5f9',
  border: '#e2e8f0'
}

// Helper to extract data from suitability assessment structure
function extractSuitabilityData(assessment: any, client: any) {
  const asNumber = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const mapAttitudeToRiskToScore = (attitude?: string): number => {
    const normalized = (attitude || '').toLowerCase()
    if (normalized.includes('very low')) return 2
    if (normalized.includes('low')) return 4
    if (normalized.includes('medium')) return 6
    if (normalized.includes('high') && !normalized.includes('very high')) return 8
    if (normalized.includes('very high')) return 10
    return 6
  }

  const mapMaxLossToCapacityScore = (maxLoss?: string): number => {
    const normalized = (maxLoss || '').toLowerCase()
    if (normalized.includes('0-5')) return 2
    if (normalized.includes('5-10')) return 4
    if (normalized.includes('10-20')) return 6
    if (normalized.includes('20-30')) return 8
    if (normalized.includes('more than 30')) return 10
    return 6
  }

  const scoreToRiskCategory = (
    score: number
  ): 'Very Low' | 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High' | 'Very High' => {
    if (score <= 2) return 'Very Low'
    if (score <= 3) return 'Low'
    if (score <= 4) return 'Low-Medium'
    if (score <= 6) return 'Medium'
    if (score <= 7) return 'Medium-High'
    if (score <= 8) return 'High'
    return 'Very High'
  }

  const scoreToCapacityCategory = (score: number): 'Low' | 'Medium' | 'High' => {
    if (score <= 4) return 'Low'
    if (score <= 7) return 'Medium'
    return 'High'
  }

  const looksLikeSuitabilityRow =
    assessment &&
    typeof assessment === 'object' &&
    ('personal_circumstances' in assessment || 'investment_objectives' in assessment || 'recommendations' in assessment)

  const data = looksLikeSuitabilityRow
    ? mapSuitabilityAssessmentRowToFormData(assessment as any)
    : assessment.assessment_data || assessment.form_data || assessment

  // Personal info - try multiple field paths
  const personalInfo = data.personal_information || data.personal_details || {}
  const financialInfo = data.financial_situation || data.finances || {}
  const riskInfo = data.risk_assessment || data.risk_profile || {}
  const objectives = data.objectives || data.investment_objectives || {}
  const recommendation = data.recommendation || data.recommendations || {}

  // Extract client name from assessment data or client record
  const clientPersonal = client?.personal_details || client?.personalDetails || {}
  const clientName =
    personalInfo.client_name ||
    `${clientPersonal?.title || ''} ${clientPersonal?.firstName || clientPersonal?.first_name || ''} ${
      clientPersonal?.lastName || clientPersonal?.last_name || ''
    }`
      .replace(/\s+/g, ' ')
      .trim() ||
    'Client'

  // Risk (prefer explicit scores/categories; else derive from suitability answers)
  const attitudeToRisk: string =
    riskInfo.attitude_to_risk || riskInfo.attitudeToRisk || riskInfo.attitude || ''
  const maxLoss: string =
    riskInfo.max_acceptable_loss ||
    riskInfo.maxAcceptableLoss ||
    // Some older drafts stored max loss under a generic key.
    riskInfo.capacityForLoss ||
    ''

  const derivedAtrScore = mapAttitudeToRiskToScore(attitudeToRisk)
  const derivedCflScore = mapMaxLossToCapacityScore(maxLoss)

  const atrScore =
    asNumber(riskInfo.atr_score) ||
    asNumber(riskInfo.attitude_to_risk_score) ||
    asNumber((data as any)?._metadata?.pulledData?.atrScore) ||
    derivedAtrScore

  const cflScore =
    asNumber(riskInfo.cfl_score) ||
    asNumber(riskInfo.capacity_for_loss_score) ||
    asNumber((data as any)?._metadata?.pulledData?.cflScore) ||
    derivedCflScore

  const riskCategory =
    riskInfo.risk_category ||
    riskInfo.risk_profile ||
    (data as any)?._metadata?.pulledData?.atrCategory ||
    scoreToRiskCategory(atrScore)

  const cflCategory =
    riskInfo.cfl_category ||
    (data as any)?._metadata?.pulledData?.cflCategory ||
    scoreToCapacityCategory(cflScore)

  // Financial data
  const annualIncome =
    asNumber(financialInfo.annual_income) ||
    asNumber(financialInfo.annualIncome) ||
    asNumber(financialInfo.income_annual) ||
    0

  const monthlyIncome =
    asNumber(financialInfo.monthly_income) ||
    asNumber(financialInfo.income_monthly) ||
    (annualIncome > 0 ? Math.round(annualIncome / 12) : 0)

  const monthlyExpenses =
    asNumber(financialInfo.monthly_expenses) ||
    asNumber(financialInfo.monthlyExpenses) ||
    asNumber(financialInfo.expenses_monthly) ||
    0

  const savings =
    asNumber(financialInfo.savings) ||
    asNumber(financialInfo.liquid_assets) ||
    asNumber(financialInfo.liquidAssets) ||
    0

  const propertyValue =
    asNumber(financialInfo.property_value) || asNumber(financialInfo.propertyValue) || 0
  const mortgageOutstanding =
    asNumber(financialInfo.mortgage_outstanding) ||
    asNumber(financialInfo.outstanding_mortgage) ||
    asNumber(financialInfo.mortgageBalance) ||
    0
  const otherDebts =
    asNumber(financialInfo.other_debts) || asNumber(financialInfo.otherDebts) || 0

  const totalAssets = asNumber(financialInfo.total_assets) || savings + propertyValue
  const totalLiabilities =
    asNumber(financialInfo.total_liabilities) || mortgageOutstanding + otherDebts

  const netWorth =
    asNumber(financialInfo.net_worth) ||
    asNumber(financialInfo.netWorth) ||
    totalAssets - totalLiabilities

  // Investment objectives
  const primaryObjective = objectives.primary_objective || objectives.main_goal || 'Not specified'
  const investmentHorizon =
    objectives.investment_timeline || objectives.investment_horizon || objectives.time_horizon || 'Not specified'
  const investmentAmount =
    asNumber(financialInfo.investment_amount) ||
    asNumber(objectives.investment_amount) ||
    asNumber(objectives.lump_sum) ||
    // If "amount available to invest" wasn't captured, fall back to recommended product amounts.
    asNumber(recommendation.product_1_amount) ||
    asNumber(recommendation.product_2_amount) ||
    asNumber(recommendation.product_3_amount) ||
    0

  // Recommendation details
  const recommendationType =
    recommendation.recommended_portfolio || recommendation.recommendation_type || recommendation.type || 'Not specified'
  const recommendationRationale =
    recommendation.recommendation_rationale || recommendation.rationale || recommendation.reason || ''

  const status = (assessment?.status || (data as any)?._metadata?.status || 'draft') as string
  const completionFromRow =
    asNumber(assessment?.completion_percentage) ||
    asNumber((data as any)?._metadata?.completionPercentage) ||
    0
  const completionPercentage =
    status.toLowerCase() === 'completed' || status.toLowerCase() === 'submitted' ? 100 : completionFromRow

  return {
    clientName,
    clientRef: client.client_ref || client.clientRef || personalInfo.client_reference || client.id?.slice(0, 8) || 'N/A',
    personalInfo,
    financialInfo,
    riskInfo,
    objectives,
    recommendation,
    atrScore,
    cflScore,
    riskCategory,
    cflCategory,
    totalAssets,
    totalLiabilities,
    netWorth,
    monthlyIncome,
    monthlyExpenses,
    primaryObjective,
    investmentHorizon,
    investmentAmount,
    recommendationType,
    recommendationRationale,
    completionPercentage,
    status
  }
}

export async function generatePdfWithJsPDF(params: {
  reportType: string
  assessmentType: string
  assessment: any
  client: any
  charts?: {
    riskChart?: string
    capacityChart?: string
    progressChart?: string
    categoryChart?: string
    alignmentChart?: string
  }
  reportContext?: ReportContext
}): Promise<ArrayBuffer> {
  const { reportType, assessmentType, assessment, client, reportContext } = params

  const brand = {
    firmName: reportContext?.firmName || 'Plannetic Advisory',
    primaryColor: reportContext?.firmPrimaryColor || COLORS.primary,
    accentColor: reportContext?.firmAccentColor || COLORS.accent,
    footerText: reportContext?.firmFooterText || 'Confidential – Prepared for the client',
    advisorName: reportContext?.advisorName || ''
  }

  // Extract data properly from suitability structure
  const extractedData = extractSuitabilityData(assessment, client)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Helper functions
  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 60) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  const drawLine = (yPos: number, color = COLORS.border) => {
    doc.setDrawColor(color)
    doc.setLineWidth(1)
    doc.line(margin, yPos, pageWidth - margin, yPos)
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Route to specific template based on report type
  switch (reportType) {
    case 'clientLetter':
      generateClientLetterTemplate(doc, extractedData, brand, currentDate, margin, contentWidth, pageWidth, pageHeight, y, addNewPageIfNeeded, drawLine)
      break
    case 'advisorReport':
      generateAdvisorReportTemplate(doc, extractedData, currentDate, margin, contentWidth, pageWidth, pageHeight, y, addNewPageIfNeeded, drawLine)
      break
    case 'executiveSummary':
      generateExecutiveSummaryTemplate(doc, extractedData, currentDate, margin, contentWidth, pageWidth, pageHeight, y, addNewPageIfNeeded, drawLine)
      break
    case 'fullReport':
      generateFullReportTemplate(doc, extractedData, currentDate, margin, contentWidth, pageWidth, pageHeight, y, addNewPageIfNeeded, drawLine)
      break
    case 'complianceReport':
      generateComplianceReportTemplate(doc, extractedData, currentDate, margin, contentWidth, pageWidth, pageHeight, y, addNewPageIfNeeded, drawLine)
      break
    default:
      generateFullReportTemplate(doc, extractedData, currentDate, margin, contentWidth, pageWidth, pageHeight, y, addNewPageIfNeeded, drawLine)
  }

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(COLORS.border)
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40)
    doc.setFontSize(8)
    doc.setTextColor(COLORS.gray)
    doc.text(brand.footerText, margin, pageHeight - 25)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 25, { align: 'right' })
    doc.text(`Generated by ${brand.firmName}`, pageWidth / 2, pageHeight - 25, { align: 'center' })
  }

  return doc.output('arraybuffer')
}

// ===== CLIENT LETTER TEMPLATE =====
function generateClientLetterTemplate(
  doc: any, data: any, brand: any, currentDate: string, margin: number, contentWidth: number,
  pageWidth: number, pageHeight: number, y: number, addNewPageIfNeeded: Function, drawLine: Function
) {
  // Header
  doc.setFillColor(brand.primaryColor || COLORS.primary)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(brand.firmName || 'Financial Advisory Services', margin, 30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Client Suitability Letter', margin, 48)
  doc.text(currentDate, pageWidth - margin, 48, { align: 'right' })

  y = 95

  // Greeting
  doc.setTextColor(brand.primaryColor || COLORS.primary)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Dear ${data.clientName},`, margin, y)
  y += 30

  // Introduction paragraph
  doc.setTextColor(COLORS.gray)
  doc.setFontSize(10)
  const introText = `Thank you for allowing us to review your financial circumstances and investment objectives. Following our detailed suitability assessment, we are pleased to provide you with this summary of our findings and recommendations.`
  const introLines = doc.splitTextToSize(introText, contentWidth)
  doc.text(introLines, margin, y)
  y += introLines.length * 14 + 20

  // Your Profile section
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Your Profile Summary', margin, y)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, 80, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text(`Risk Profile: ${data.riskCategory}`, margin + 15, y + 20)
  doc.text(`Capacity for Loss: ${data.cflCategory}`, margin + contentWidth/2, y + 20)
  doc.text(`Investment Objective: ${data.primaryObjective}`, margin + 15, y + 40)
  doc.text(`Time Horizon: ${data.investmentHorizon}`, margin + contentWidth/2, y + 40)
  doc.text(`Investment Amount: £${Number(data.investmentAmount || 0).toLocaleString()}`, margin + 15, y + 60)
  doc.text(`Status: ${data.completionPercentage}% Complete`, margin + contentWidth/2, y + 60)
  y += 100

  // Recommendation section
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Our Recommendation', margin, y)
  y += 20

  doc.setFillColor('#f0fdf4')
  doc.roundedRect(margin, y, contentWidth, 60, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  const recText = data.recommendationRationale ||
    `Based on your risk profile (${data.riskCategory}) and capacity for loss (${data.cflCategory}), we recommend an investment strategy that aligns with your ${data.primaryObjective} objective over your ${data.investmentHorizon} time horizon.`
  const recLines = doc.splitTextToSize(recText, contentWidth - 30)
  doc.text(recLines, margin + 15, y + 20)
  y += 80

  // Next steps
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Next Steps', margin, y)
  y += 20

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  const steps = [
    '1. Review this letter and the accompanying suitability report',
    '2. Contact us with any questions or concerns',
    '3. Confirm your agreement to proceed with the recommendation',
    '4. Complete any required documentation'
  ]
  steps.forEach((step, idx) => {
    doc.text(step, margin + 10, y + (idx * 16))
  })
  y += steps.length * 16 + 30

  // Closing
  doc.text('We look forward to assisting you in achieving your financial goals.', margin, y)
  y += 30
  doc.text('Yours sincerely,', margin, y)
  y += 30
  doc.setFont('helvetica', 'bold')
  doc.text(brand.advisorName || brand.firmName || 'Financial Advisor', margin, y)
  if (brand.advisorName && brand.firmName) {
    doc.setFont('helvetica', 'normal')
    doc.text(brand.firmName, margin, y + 14)
  }
}

// ===== ADVISOR REPORT TEMPLATE =====
function generateAdvisorReportTemplate(
  doc: any, data: any, currentDate: string, margin: number, contentWidth: number,
  pageWidth: number, pageHeight: number, y: number, addNewPageIfNeeded: Function, drawLine: Function
) {
  // Header - darker for internal document
  doc.setFillColor('#1e293b')
  doc.rect(0, 0, pageWidth, 80, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ADVISOR TECHNICAL REPORT', margin, 35)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('INTERNAL USE ONLY - CONFIDENTIAL', margin, 55)
  doc.text(currentDate, pageWidth - margin, 55, { align: 'right' })

  y = 100

  // Client Reference Box
  doc.setFillColor('#fef3c7')
  doc.roundedRect(margin, y, contentWidth, 50, 4, 4, 'F')
  doc.setFontSize(10)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('Client Reference:', margin + 10, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(data.clientRef, margin + 100, y + 20)
  doc.text(`Client Name: ${data.clientName}`, margin + 250, y + 20)
  doc.text(`Assessment Status: ${data.status.toUpperCase()}`, margin + 10, y + 38)
  doc.text(`Completion: ${data.completionPercentage}%`, margin + 250, y + 38)
  y += 70

  // Risk Assessment Section
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RISK ASSESSMENT DETAILS', margin, y)
  y += 20

  // Risk metrics table
  const riskMetrics = [
    ['ATR Score', data.atrScore ? `${data.atrScore}/10` : 'Not assessed'],
    ['ATR Category', data.riskCategory],
    ['CFL Score', data.cflScore ? `${data.cflScore}/10` : 'Not assessed'],
    ['CFL Category', data.cflCategory],
  ]

  doc.setFillColor('#f8fafc')
  doc.roundedRect(margin, y, contentWidth, 90, 4, 4, 'F')

  riskMetrics.forEach((metric, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    doc.setFontSize(9)
    doc.setTextColor(COLORS.gray)
    doc.text(metric[0] + ':', margin + 15 + (col * contentWidth/2), y + 20 + (row * 35))
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text(metric[1], margin + 15 + (col * contentWidth/2), y + 35 + (row * 35))
    doc.setFont('helvetica', 'normal')
  })
  y += 110

  // Financial Overview
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FINANCIAL OVERVIEW', margin, y)
  y += 20

  doc.setFillColor('#f8fafc')
  doc.roundedRect(margin, y, contentWidth, 80, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  doc.text('Total Assets:', margin + 15, y + 20)
  doc.text('Total Liabilities:', margin + contentWidth/2, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary)
  doc.text(`£${Number(data.totalAssets).toLocaleString()}`, margin + 15, y + 35)
  doc.text(`£${Number(data.totalLiabilities).toLocaleString()}`, margin + contentWidth/2, y + 35)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text('Net Worth:', margin + 15, y + 55)
  doc.text('Monthly Surplus:', margin + contentWidth/2, y + 55)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(data.netWorth >= 0 ? COLORS.success : COLORS.danger)
  doc.text(`£${Number(data.netWorth).toLocaleString()}`, margin + 15, y + 70)
  doc.setTextColor(COLORS.primary)
  doc.text(`£${Number(data.monthlyIncome - data.monthlyExpenses).toLocaleString()}`, margin + contentWidth/2, y + 70)
  y += 100

  // Investment Details
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('INVESTMENT DETAILS', margin, y)
  y += 20

  doc.setFillColor('#f8fafc')
  doc.roundedRect(margin, y, contentWidth, 60, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text(`Primary Objective: ${data.primaryObjective}`, margin + 15, y + 20)
  doc.text(`Time Horizon: ${data.investmentHorizon}`, margin + 15, y + 38)
  doc.text(`Investment Amount: £${Number(data.investmentAmount).toLocaleString()}`, margin + contentWidth/2, y + 20)
  y += 80

  // Compliance Notes
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPLIANCE NOTES', margin, y)
  y += 20

  doc.setFillColor('#fef3c7')
  doc.roundedRect(margin, y, contentWidth, 80, 4, 4, 'F')
  doc.setFontSize(9)
  doc.setTextColor(COLORS.gray)
  doc.text('• FCA COBS 9.2 - Suitability requirements have been followed', margin + 15, y + 20)
  doc.text('• Consumer Duty - Fair value assessment completed', margin + 15, y + 35)
  doc.text('• KYC/AML - Client identification verified', margin + 15, y + 50)
  doc.text(`• Assessment completed on: ${currentDate}`, margin + 15, y + 65)
}

// ===== EXECUTIVE SUMMARY TEMPLATE =====
function generateExecutiveSummaryTemplate(
  doc: any, data: any, currentDate: string, margin: number, contentWidth: number,
  pageWidth: number, pageHeight: number, y: number, addNewPageIfNeeded: Function, drawLine: Function
) {
  // Header
  doc.setFillColor(COLORS.primary)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('EXECUTIVE SUMMARY', margin, 35)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.clientName} | ${currentDate}`, margin, 52)

  y = 90

  // Key Metrics - Large cards
  const metricCards = [
    { label: 'Risk Profile', value: data.riskCategory, color: COLORS.accent },
    { label: 'Capacity for Loss', value: data.cflCategory, color: COLORS.success },
    { label: 'Investment Amount', value: `£${Number(data.investmentAmount).toLocaleString()}`, color: COLORS.warning },
    { label: 'Completion', value: `${data.completionPercentage}%`, color: COLORS.primary }
  ]

  const cardWidth = (contentWidth - 30) / 2
  const cardHeight = 70

  metricCards.forEach((card, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = margin + (col * (cardWidth + 15))
    const boxY = y + (row * (cardHeight + 15))

    doc.setFillColor('#ffffff')
    doc.setDrawColor(card.color)
    doc.setLineWidth(2)
    doc.roundedRect(x, boxY, cardWidth, cardHeight, 6, 6, 'FD')

    doc.setFillColor(card.color)
    doc.rect(x, boxY, 6, cardHeight, 'F')

    doc.setFontSize(10)
    doc.setTextColor(COLORS.gray)
    doc.text(card.label, x + 15, boxY + 25)

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text(card.value, x + 15, boxY + 50)
    doc.setFont('helvetica', 'normal')
  })
  y += (cardHeight + 15) * 2 + 20

  // Summary Points
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Points', margin, y)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, 100, 4, 4, 'F')

  const keyPoints = [
    `Client: ${data.clientName} (Ref: ${data.clientRef})`,
    `Primary Objective: ${data.primaryObjective}`,
    `Time Horizon: ${data.investmentHorizon}`,
    `Net Worth: £${Number(data.netWorth).toLocaleString()}`,
    `Monthly Surplus: £${Number(data.monthlyIncome - data.monthlyExpenses).toLocaleString()}`
  ]

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  keyPoints.forEach((point, idx) => {
    doc.text(`• ${point}`, margin + 15, y + 20 + (idx * 16))
  })
  y += 120

  // Recommendation Summary
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Recommendation', margin, y)
  y += 20

  doc.setFillColor('#f0fdf4')
  doc.roundedRect(margin, y, contentWidth, 60, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  const recSummary = `Based on ${data.riskCategory} risk profile and ${data.cflCategory} capacity for loss, recommend ${data.recommendationType || 'diversified portfolio'} strategy aligned with ${data.primaryObjective} objective.`
  const recLines = doc.splitTextToSize(recSummary, contentWidth - 30)
  doc.text(recLines, margin + 15, y + 25)
}

// ===== FULL REPORT TEMPLATE =====
function generateFullReportTemplate(
  doc: any, data: any, currentDate: string, margin: number, contentWidth: number,
  pageWidth: number, pageHeight: number, startY: number, addNewPageIfNeeded: Function, drawLine: Function
) {
  let y = startY

  // Header
  doc.setFillColor(COLORS.primary)
  doc.rect(0, 0, pageWidth, 80, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Suitability Assessment Report', margin, 35)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Full Assessment Report`, margin, 55)
  doc.text(currentDate, pageWidth - margin, 55, { align: 'right' })

  y = 100

  // Client Details Section
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Client Details', margin, y)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, 70, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text(`Name: ${data.clientName}`, margin + 15, y + 18)
  doc.text(`Reference: ${data.clientRef}`, margin + contentWidth/2, y + 18)
  doc.text(`Assessment Status: ${data.status}`, margin + 15, y + 36)
  doc.text(`Completion: ${data.completionPercentage}%`, margin + contentWidth/2, y + 36)
  doc.text(`Date: ${currentDate}`, margin + 15, y + 54)
  y += 90

  // Risk Profile Section
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Risk Profile', margin, y)
  y += 20

  // Risk metrics grid
  const riskMetrics = [
    { label: 'ATR Score', value: data.atrScore ? `${data.atrScore}/10` : 'Pending', color: COLORS.accent },
    { label: 'Risk Category', value: data.riskCategory, color: getRiskColor(data.atrScore) },
    { label: 'CFL Score', value: data.cflScore ? `${data.cflScore}/10` : 'Pending', color: COLORS.success },
    { label: 'Capacity Category', value: data.cflCategory, color: COLORS.success }
  ]

  const metricWidth = (contentWidth - 15) / 2
  const metricHeight = 55

  riskMetrics.forEach((metric, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = margin + (col * (metricWidth + 10))
    const boxY = y + (row * (metricHeight + 10))

    doc.setFillColor('#ffffff')
    doc.setDrawColor(COLORS.border)
    doc.roundedRect(x, boxY, metricWidth, metricHeight, 4, 4, 'FD')

    doc.setFillColor(metric.color)
    doc.rect(x, boxY, 4, metricHeight, 'F')

    doc.setFontSize(9)
    doc.setTextColor(COLORS.gray)
    doc.text(metric.label, x + 12, boxY + 18)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text(metric.value, x + 12, boxY + 40)
    doc.setFont('helvetica', 'normal')
  })
  y += (metricHeight + 10) * 2 + 20

  // Financial Situation
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Financial Situation', margin, y)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, 90, 4, 4, 'F')

  const financialItems = [
    ['Total Assets', `£${Number(data.totalAssets).toLocaleString()}`],
    ['Total Liabilities', `£${Number(data.totalLiabilities).toLocaleString()}`],
    ['Net Worth', `£${Number(data.netWorth).toLocaleString()}`],
    ['Monthly Income', `£${Number(data.monthlyIncome).toLocaleString()}`],
    ['Monthly Expenses', `£${Number(data.monthlyExpenses).toLocaleString()}`],
    ['Monthly Surplus', `£${Number(data.monthlyIncome - data.monthlyExpenses).toLocaleString()}`]
  ]

  financialItems.forEach((item, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    doc.setFontSize(9)
    doc.setTextColor(COLORS.gray)
    doc.text(item[0] + ':', margin + 15 + (col * contentWidth/2), y + 18 + (row * 25))
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text(item[1], margin + 120 + (col * contentWidth/2), y + 18 + (row * 25))
    doc.setFont('helvetica', 'normal')
  })
  y += 110

  // Page break if needed
  if (y > pageHeight - 200) {
    doc.addPage()
    y = margin
  }

  // Investment Objectives
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('4. Investment Objectives', margin, y)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, 70, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  doc.text(`Primary Objective: ${data.primaryObjective}`, margin + 15, y + 20)
  doc.text(`Time Horizon: ${data.investmentHorizon}`, margin + 15, y + 38)
  doc.text(`Investment Amount: £${Number(data.investmentAmount).toLocaleString()}`, margin + 15, y + 56)
  y += 90

  // Recommendation
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('5. Recommendation', margin, y)
  y += 20

  doc.setFillColor('#f0fdf4')
  doc.roundedRect(margin, y, contentWidth, 80, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  const fullRec = data.recommendationRationale ||
    `Based on your risk profile assessment (${data.riskCategory}) and capacity for loss evaluation (${data.cflCategory}), ` +
    `we recommend an investment strategy aligned with your ${data.primaryObjective} objective. ` +
    `This recommendation takes into account your ${data.investmentHorizon} time horizon and current financial circumstances.`
  const fullRecLines = doc.splitTextToSize(fullRec, contentWidth - 30)
  doc.text(fullRecLines, margin + 15, y + 20)
}

// ===== COMPLIANCE REPORT TEMPLATE =====
function generateComplianceReportTemplate(
  doc: any, data: any, currentDate: string, margin: number, contentWidth: number,
  pageWidth: number, pageHeight: number, y: number, addNewPageIfNeeded: Function, drawLine: Function
) {
  // Header - Red accent for compliance
  doc.setFillColor('#7f1d1d')
  doc.rect(0, 0, pageWidth, 80, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('FCA COMPLIANCE REPORT', margin, 35)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Suitability Assessment - Regulatory Documentation', margin, 52)
  doc.text(currentDate, pageWidth - margin, 52, { align: 'right' })

  y = 100

  // Regulatory Reference Box
  doc.setFillColor('#fef2f2')
  doc.setDrawColor('#ef4444')
  doc.setLineWidth(1)
  doc.roundedRect(margin, y, contentWidth, 50, 4, 4, 'FD')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('Regulatory References:', margin + 15, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.gray)
  doc.text('FCA COBS 9.2 (Suitability) | FCA Consumer Duty | MIFID II', margin + 15, y + 35)
  y += 70

  // Client Identification
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Client Identification', margin, y)
  y += 20

  doc.setFillColor(COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, 60, 4, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(COLORS.gray)
  doc.text(`Client Name: ${data.clientName}`, margin + 15, y + 20)
  doc.text(`Reference: ${data.clientRef}`, margin + contentWidth/2, y + 20)
  doc.text(`Assessment Date: ${currentDate}`, margin + 15, y + 40)
  doc.text(`Status: ${data.status.toUpperCase()}`, margin + contentWidth/2, y + 40)
  y += 80

  // Suitability Assessment
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Suitability Assessment Summary', margin, y)
  y += 20

  const suitabilityChecks = [
    { check: 'Risk Profile Assessment', status: data.atrScore ? 'COMPLETE' : 'PENDING', value: data.riskCategory },
    { check: 'Capacity for Loss Assessment', status: data.cflScore ? 'COMPLETE' : 'PENDING', value: data.cflCategory },
    { check: 'Financial Situation Review', status: data.totalAssets > 0 ? 'COMPLETE' : 'PENDING', value: `Net Worth: £${data.netWorth.toLocaleString()}` },
    { check: 'Investment Objectives', status: data.primaryObjective !== 'Not specified' ? 'COMPLETE' : 'PENDING', value: data.primaryObjective }
  ]

  suitabilityChecks.forEach((item, idx) => {
    const boxY = y + (idx * 45)
    doc.setFillColor(item.status === 'COMPLETE' ? '#f0fdf4' : '#fef3c7')
    doc.roundedRect(margin, boxY, contentWidth, 40, 4, 4, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary)
    doc.text(item.check, margin + 15, boxY + 15)

    doc.setTextColor(item.status === 'COMPLETE' ? COLORS.success : COLORS.warning)
    doc.text(`[${item.status}]`, margin + contentWidth - 80, boxY + 15)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.gray)
    doc.text(item.value, margin + 15, boxY + 30)
  })
  y += suitabilityChecks.length * 45 + 20

  // Compliance Declaration
  doc.addPage()
  y = margin

  doc.setTextColor(COLORS.primary)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Compliance Declaration', margin, y)
  y += 20

  doc.setFillColor('#fef2f2')
  doc.roundedRect(margin, y, contentWidth, 120, 4, 4, 'F')

  doc.setFontSize(9)
  doc.setTextColor(COLORS.gray)
  const declarations = [
    '• The advice provided is suitable for the client based on information obtained',
    '• The client\'s risk profile has been assessed using approved methodology',
    '• The client\'s capacity for loss has been evaluated',
    '• Investment objectives and time horizon have been established',
    '• Any conflicts of interest have been disclosed',
    '• Fee structures and charges have been explained',
    '• The client has received appropriate documentation'
  ]
  declarations.forEach((dec, idx) => {
    doc.text(dec, margin + 15, y + 18 + (idx * 14))
  })
  y += 140

  // Sign-off section
  doc.setTextColor(COLORS.primary)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Advisor Sign-off', margin, y)
  y += 20

  doc.setDrawColor(COLORS.border)
  doc.line(margin, y + 30, margin + 200, y + 30)
  doc.setFontSize(9)
  doc.setTextColor(COLORS.gray)
  doc.text('Advisor Signature', margin, y + 45)

  doc.line(margin + 280, y + 30, margin + 400, y + 30)
  doc.text('Date', margin + 280, y + 45)
}

function getRiskColor(riskLevel: number | undefined): string {
  if (!riskLevel) return COLORS.gray
  if (riskLevel <= 3) return COLORS.success // Conservative
  if (riskLevel <= 5) return COLORS.accent  // Balanced
  if (riskLevel <= 7) return COLORS.warning // Growth
  return COLORS.danger // Aggressive
}

export async function generateCharts(_assessment: any) {
  // Charts disabled - canvas module not available in Next.js serverless environment
  // PDF will be generated without embedded charts
  // Charts can be rendered client-side if needed
  return {}
}
