import React from 'react'
import { Document } from '@react-pdf/renderer'

import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import {
  createSuitabilityStyles,
  defaultSuitabilityBrand,
  type SuitabilityBranding
} from './styles'

import { CoverPage } from './pages/CoverPage'
import { DataQualityPage } from './pages/DataQualityPage'
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

  const pages: React.ReactElement[] = []

  if (normalizedVariant === 'fullReport') {
    pages.push(<CoverPage key="cover" data={data} styles={styles} brand={brand} />)
    if (data.dataQuality.mode === 'draft' && (data.dataQuality.warnings.length > 0 || data.dataQuality.missing.length > 0)) {
      pages.push(<DataQualityPage key="dataQuality" data={data} styles={styles} brand={brand} />)
    }
    pages.push(<PersonalCircumstancesPage key="personal" data={data} styles={styles} brand={brand} />)
    pages.push(<FinancialAnalysisPage key="financial" data={data} styles={styles} brand={brand} />)
    pages.push(<RiskAssessmentPage key="risk" data={data} styles={styles} brand={brand} charts={charts} />)
    pages.push(<InvestorPersonaPage key="persona" data={data} styles={styles} brand={brand} />)
    pages.push(<VulnerabilityPage key="vulnerability" data={data} styles={styles} brand={brand} />)

    if (includeAdviceModules) {
      pages.push(<OptionsConsideredPage key="options" data={data} styles={styles} brand={brand} />)
      pages.push(<RecommendationPage key="recommendation" data={data} styles={styles} brand={brand} charts={charts} />)
      pages.push(<DisadvantagesRisksPage key="disadvantages" data={data} styles={styles} brand={brand} />)
      pages.push(<CostsChargesPage key="costs" data={data} styles={styles} brand={brand} />)
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

