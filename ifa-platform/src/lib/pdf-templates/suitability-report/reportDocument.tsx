import React from 'react'
import { Document } from '@react-pdf/renderer'

import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import {
  createSuitabilityStyles,
  defaultSuitabilityBrand,
  type SuitabilityBranding
} from './styles'

import { CoverPage } from './pages/CoverPage'
import { ExecutiveSummaryPage } from './pages/ExecutiveSummaryPage'
import { ClientLetterPage } from './pages/ClientLetterPage'
import { ComplianceReportPage } from './pages/ComplianceReportPage'
import { PersonalCircumstancesPage } from './pages/PersonalCircumstancesPage'
import { FinancialAnalysisPage } from './pages/FinancialAnalysisPage'
import { RiskAssessmentPage } from './pages/RiskAssessmentPage'
import { InvestorPersonaPage } from './pages/InvestorPersonaPage'
import { VulnerabilityPage } from './pages/VulnerabilityPage'
import { OptionsConsideredPage } from './pages/OptionsConsideredPage'
import { RecommendationPage } from './pages/RecommendationPage'
import { DisadvantagesRisksPage } from './pages/DisadvantagesRisksPage'
import { CostsChargesPage } from './pages/CostsChargesPage'
import { OngoingServicePage } from './pages/OngoingServicePage'

export interface SuitabilityReportProps {
  data: SuitabilityReportData
  branding?: SuitabilityBranding
  charts?: {
    riskChart?: string
    allocationChart?: string
    projectionChart?: string
  }
  variant?: 'fullReport' | 'clientLetter' | 'executiveSummary' | 'complianceReport' | 'advisorReport'
}

export const SuitabilityReportDocument: React.FC<SuitabilityReportProps> = ({
  data,
  branding,
  charts,
  variant = 'fullReport'
}) => {
  const brand = { ...defaultSuitabilityBrand, ...branding }
  const styles = createSuitabilityStyles(brand)

  const normalizedVariant =
    variant === 'advisorReport'
      ? 'fullReport'
      : (variant as 'fullReport' | 'clientLetter' | 'executiveSummary' | 'complianceReport')

  const includeAdviceModules =
    data.scope.includeInvestments || data.scope.includePensions || data.scope.includeProtection

  const hasFinancialAnalysis =
    data.financialAnalysis.income.rows.some((row) => row.current !== undefined || row.atRetirement !== undefined) ||
    data.financialAnalysis.expenditure.rows.some((row) => row.essential !== undefined || row.discretionary !== undefined) ||
    data.financialAnalysis.income.totalCurrent !== undefined ||
    data.financialAnalysis.income.totalAtRetirement !== undefined ||
    data.financialAnalysis.expenditure.totalEssential !== undefined ||
    data.financialAnalysis.expenditure.totalDiscretionary !== undefined

  const hasInvestorPersona =
    Boolean(data.investorPersona?.personaType) ||
    Boolean(data.investorPersona?.personaLevel) ||
    Boolean(data.investorPersona?.confidence !== undefined) ||
    Boolean(data.investorPersona?.motivations?.length) ||
    Boolean(data.investorPersona?.fears?.length)

  const hasVulnerabilityDetails =
    data.vulnerabilityAssessment.hasVulnerability ||
    Boolean(data.vulnerabilityAssessment.vulnerabilityFlags?.length) ||
    Boolean(data.vulnerabilityAssessment.accommodations?.length) ||
    Boolean(
      data.vulnerabilityAssessment.texasAssessment &&
        Object.values(data.vulnerabilityAssessment.texasAssessment).some((value) => Boolean(value))
    )

  const hasOptionsConsidered =
    data.optionsConsidered.options.length > 0 ||
    Boolean(data.aiGenerated?.alternativeRejections?.length)

  const hasDisadvantagesRisks =
    data.disadvantagesRisks.disadvantages.length > 0 ||
    data.disadvantagesRisks.risks.length > 0 ||
    data.disadvantagesRisks.mitigations.length > 0 ||
    Boolean(data.disadvantagesRisks.notes)

  const hasCostsCharges =
    data.costsCharges.initialFee !== undefined ||
    data.costsCharges.ongoingFee !== undefined ||
    data.costsCharges.platformFee !== undefined ||
    data.costsCharges.fundCharges !== undefined ||
    data.costsCharges.totalFirstYearCost !== undefined

  const pages: React.ReactElement[] = []

  if (normalizedVariant === 'fullReport') {
    pages.push(<CoverPage key="cover" data={data} styles={styles} brand={brand} />)
    pages.push(<PersonalCircumstancesPage key="personal" data={data} styles={styles} brand={brand} />)
    if (hasFinancialAnalysis) {
      pages.push(<FinancialAnalysisPage key="financial" data={data} styles={styles} brand={brand} />)
    }
    pages.push(<RiskAssessmentPage key="risk" data={data} styles={styles} brand={brand} charts={charts} />)
    if (hasInvestorPersona) {
      pages.push(<InvestorPersonaPage key="persona" data={data} styles={styles} brand={brand} />)
    }
    if (hasVulnerabilityDetails) {
      pages.push(<VulnerabilityPage key="vulnerability" data={data} styles={styles} brand={brand} />)
    }

    if (includeAdviceModules) {
      if (hasOptionsConsidered) {
        pages.push(<OptionsConsideredPage key="options" data={data} styles={styles} brand={brand} />)
      }
      pages.push(<RecommendationPage key="recommendation" data={data} styles={styles} brand={brand} charts={charts} />)
      if (hasDisadvantagesRisks) {
        pages.push(<DisadvantagesRisksPage key="disadvantages" data={data} styles={styles} brand={brand} />)
      }
      if (hasCostsCharges) {
        pages.push(<CostsChargesPage key="costs" data={data} styles={styles} brand={brand} />)
      }
    }

    pages.push(<OngoingServicePage key="ongoing" data={data} styles={styles} brand={brand} />)
  }

  if (normalizedVariant === 'clientLetter') {
    pages.push(<ClientLetterPage key="letter" data={data} styles={styles} brand={brand} />)
  }

  if (normalizedVariant === 'executiveSummary') {
    pages.push(<ExecutiveSummaryPage key="summary" data={data} styles={styles} brand={brand} />)
  }

  if (normalizedVariant === 'complianceReport') {
    pages.push(<ComplianceReportPage key="compliance" data={data} styles={styles} brand={brand} />)
  }

  return <Document>{pages}</Document>
}

export default SuitabilityReportDocument
