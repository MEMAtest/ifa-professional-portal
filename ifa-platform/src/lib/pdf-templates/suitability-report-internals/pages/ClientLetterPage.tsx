import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/pdf-templates/suitability-report-internals/formatters'
import { PageFooter } from '@/lib/pdf-templates/suitability-report-internals/components/PageFooter'
import {
  formatTemplate,
  getRiskAllocationGuidance,
  getRiskCategoryDescription,
  reportTemplates
} from '@/lib/suitability/reporting/templates/reportContent'

export const ClientLetterPage: React.FC<{ data: SuitabilityReportData; styles: any; brand: any }> = ({
  data,
  styles,
  brand
}) => {
  const adviceInScope = data.scope.includeInvestments || data.scope.includePensions || data.scope.includeProtection
  const meetingDate = data.metadata.reportDate
  const greeting = formatTemplate(reportTemplates.greeting.standard, {
    adviser_name: data.adviser.name || 'your adviser',
    meeting_date: formatDate(meetingDate)
  })

  const riskDescription = getRiskCategoryDescription(data.riskAssessment.combinedRiskCategory)
  const riskGuidance = getRiskAllocationGuidance(data.riskAssessment.combinedRiskCategory)

  const aiNarrative = data.aiGenerated?.whySuitable || data.recommendation.rationale
  const hasNarrative = Boolean(aiNarrative)
  const narrativeParagraphs =
    aiNarrative?.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean) || []

  const secondaryObjectives = data.objectives.secondaryObjectives?.filter(Boolean) || []
  const alternatives = data.optionsConsidered.options.filter((option) => !option.selected)

  const hasRiskMismatch =
    typeof data.riskAssessment.attitudeToRisk === 'number' &&
    typeof data.riskAssessment.capacityForLoss === 'number' &&
    Math.abs(data.riskAssessment.attitudeToRisk - data.riskAssessment.capacityForLoss) > 2

  const alternativeRejections = data.aiGenerated?.alternativeRejections || []

  const costLines = [
    data.costsCharges.initialFee !== undefined
      ? `Initial adviser fee: ${
          data.costsCharges.initialFeeType === 'fixed'
            ? formatCurrency(data.costsCharges.initialFee)
            : formatPercentage(data.costsCharges.initialFee)
        }`
      : null,
    data.costsCharges.ongoingFee !== undefined
      ? `Ongoing adviser fee: ${
          data.costsCharges.ongoingFeeType === 'fixed'
            ? formatCurrency(data.costsCharges.ongoingFee)
            : formatPercentage(data.costsCharges.ongoingFee)
        }`
      : null,
    data.costsCharges.platformFee !== undefined
      ? `Platform fee: ${formatPercentage(data.costsCharges.platformFee)}`
      : null,
    data.costsCharges.fundCharges !== undefined
      ? `Fund charges (OCF): ${formatPercentage(data.costsCharges.fundCharges)}`
      : null,
    data.costsCharges.totalFirstYearCost !== undefined
      ? `Total first-year cost: ${formatCurrency(data.costsCharges.totalFirstYearCost)}`
      : null
  ].filter(Boolean) as string[]

  const riskStatements: string[] = []
  if ((data.recommendation.assetAllocation?.equities ?? 0) > 0) {
    riskStatements.push(reportTemplates.risks.marketRisk)
  }
  if (data.recommendation.products.some((product) => /pension|sipp/i.test(product.name))) {
    riskStatements.push(reportTemplates.risks.pensionAccess)
  }
  if (data.existingArrangements.dbTransferConsidered) {
    riskStatements.push(reportTemplates.risks.transferRisk)
  }
  if (data.recommendation.products.some((product) => /overseas|global|international/i.test(product.name))) {
    riskStatements.push(reportTemplates.risks.currencyRisk)
  }

  return (
    <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.firmName}>{brand.firmName}</Text>
        <Text style={styles.footerText}>Suitability Letter</Text>
      </View>
    </View>

    <Text style={styles.text}>{formatDate(data.metadata.reportDate)}</Text>

    <View style={{ marginTop: 14 }}>
      <Text style={styles.text}>{data.client.personalDetails.fullName || 'Client'}</Text>
      {data.client.contactDetails.address && <Text style={styles.text}>{data.client.contactDetails.address}</Text>}
    </View>

    <View style={{ marginTop: 16 }}>
      <Text style={styles.subsectionTitle}>Dear {data.client.personalDetails.fullName || 'Client'},</Text>
      <Text style={styles.text}>{greeting}</Text>
    </View>

    <View style={styles.infoCard}>
      <Text style={styles.boldText}>Your Circumstances Summary</Text>
      <Text style={styles.text}>
        Age: {data.client.personalDetails.age ?? 'Not provided'} years old
      </Text>
      <Text style={styles.text}>
        Employment: {data.client.personalDetails.occupation || 'Not provided'} ({data.client.personalDetails.employmentStatus || 'Not provided'})
      </Text>
      <Text style={styles.text}>
        Dependants: {data.client.personalDetails.dependants ?? 'Not provided'}
      </Text>
      <Text style={[styles.text, { marginTop: 6 }]}>
        Annual income: {formatCurrency(data.client.financialDetails.annualIncome)}
      </Text>
      <Text style={styles.text}>
        Monthly expenditure: {formatCurrency(data.client.financialDetails.monthlyExpenditure)}
      </Text>
      <Text style={styles.text}>
        Available for investment: {adviceInScope ? formatCurrency(data.client.financialDetails.investmentAmount) : 'Not applicable'}
      </Text>
      <Text style={styles.text}>
        Existing provisions: {data.existingArrangements.pensionArrangements?.length || data.existingArrangements.investmentArrangements?.length || data.existingArrangements.insurancePolicies?.length
          ? [
              data.existingArrangements.pensionArrangements?.length ? `${data.existingArrangements.pensionArrangements.length} pension` : null,
              data.existingArrangements.investmentArrangements?.length ? `${data.existingArrangements.investmentArrangements.length} investment` : null,
              data.existingArrangements.insurancePolicies?.length ? `${data.existingArrangements.insurancePolicies.length} protection` : null
            ].filter(Boolean).join(', ')
          : 'Not provided'}
      </Text>
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Your Objectives</Text>
      <Text style={styles.text}>
        Primary objective: {data.objectives.primaryObjective || 'Not provided'}
      </Text>
      {secondaryObjectives.length > 0 && (
        <View style={styles.bulletList}>
          {secondaryObjectives.map((objective, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{objective}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.text}>
        Investment timeframe: {data.objectives.timeHorizonYears ? `${data.objectives.timeHorizonYears} years` : data.objectives.investmentTimeline || 'Not provided'}
      </Text>
      <Text style={styles.text}>
        Income requirement: {data.objectives.incomeRequirement || 'Not provided'}
      </Text>
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Your Risk Profile</Text>
      <Text style={styles.text}>
        Attitude to Risk (ATR): {data.riskAssessment.attitudeToRisk !== undefined ? `${data.riskAssessment.attitudeToRisk}/10` : 'Not assessed'} - {data.riskAssessment.attitudeCategory}
      </Text>
      <Text style={styles.text}>
        Capacity for Loss (CFL): {data.riskAssessment.capacityForLoss !== undefined ? `${data.riskAssessment.capacityForLoss}/10` : 'Not assessed'} - {data.riskAssessment.capacityCategory}
      </Text>
      <Text style={styles.text}>Combined risk profile: {data.riskAssessment.combinedRiskCategory}</Text>
      {riskDescription && <Text style={styles.text}>{riskDescription}</Text>}
      {riskGuidance && <Text style={styles.text}>{riskGuidance}</Text>}
      {(hasRiskMismatch || data.aiGenerated?.riskReconciliation) && (
        <View style={[styles.warningCard, { marginTop: 8 }]}>
          <Text style={styles.boldText}>Important note on risk reconciliation</Text>
          <Text style={styles.text}>
            {data.aiGenerated?.riskReconciliation ||
              'Your attitude to risk differs from your capacity for loss. In line with FCA requirements, the recommendation is based on the lower of these two measures to ensure you are not exposed to more risk than you can afford to bear.'}
          </Text>
        </View>
      )}
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Our Recommendation</Text>
      {!adviceInScope ? (
        <View style={styles.infoCard}>
          <Text style={styles.boldText}>Out of scope</Text>
          <Text style={styles.text}>
            No Investment/Pension/Protection advice has been selected for this report.
          </Text>
        </View>
      ) : (
        <>
          {data.recommendation.portfolioName && (
            <Text style={styles.text}>Recommended portfolio: {data.recommendation.portfolioName}</Text>
          )}
          {data.recommendation.assetAllocation && (
            <Text style={styles.text}>
              Asset allocation: {data.recommendation.assetAllocation.equities}% equities, {data.recommendation.assetAllocation.bonds}% bonds, {data.recommendation.assetAllocation.cash}% cash, {data.recommendation.assetAllocation.alternatives}% alternatives
            </Text>
          )}
          {data.recommendation.products.length === 0 ? (
            <Text style={styles.text}>No recommendation has been recorded yet.</Text>
          ) : (
            <View style={styles.bulletList}>
              {data.recommendation.products.map((p, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    {p.name} {p.provider ? `(${p.provider})` : ''} — {formatCurrency(p.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {hasNarrative ? (
            <View style={[styles.card, { marginTop: 10 }]}>
              {narrativeParagraphs.length > 0 ? (
                narrativeParagraphs.map((paragraph, idx) => (
                  <Text key={idx} style={styles.text}>
                    {paragraph}
                  </Text>
                ))
              ) : (
                <Text style={styles.text}>{data.recommendation.rationale}</Text>
              )}
            </View>
          ) : null}
        </>
      )}
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Alternatives We Considered</Text>
      {alternatives.length === 0 ? (
        <Text style={styles.text}>No alternative options were recorded.</Text>
      ) : (
        alternatives.map((option, idx) => (
          <View key={idx} style={[styles.card, { marginBottom: 8 }]}>
            <Text style={styles.boldText}>{option.name}</Text>
            {option.pros.length > 0 && (
              <Text style={styles.text}>Pros: {option.pros.join(', ')}</Text>
            )}
            {option.cons.length > 0 && (
              <Text style={styles.text}>Cons: {option.cons.join(', ')}</Text>
            )}
            {(() => {
              const reason = alternativeRejections.find((rejection) => rejection.option === option.name)?.reason
              if (!reason) return null
              return <Text style={styles.text}>{reason}</Text>
            })()}
          </View>
        ))
      )}
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Costs and Charges</Text>
      {costLines.length > 0 ? (
        <View style={styles.bulletList}>
          {costLines.map((line, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.text}>Cost details not provided.</Text>
      )}
      <Text style={styles.text}>{reportTemplates.costsCharges.fairValue}</Text>
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Risks and Disadvantages</Text>
      {[...riskStatements, ...data.disadvantagesRisks.risks].slice(0, 6).map((risk, idx) => (
        <Text key={idx} style={styles.text}>
          - {risk}
        </Text>
      ))}
      {data.disadvantagesRisks.disadvantages.slice(0, 4).map((disadvantage, idx) => (
        <Text key={`disadvantage-${idx}`} style={styles.text}>
          - {disadvantage}
        </Text>
      ))}
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Next Steps</Text>
      <View style={styles.bulletList}>
        {reportTemplates.nextSteps.map((step, idx) => (
          <View key={idx} style={styles.bulletItem}>
            <Text style={styles.bullet}>{idx + 1}.</Text>
            <Text style={styles.bulletText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>

    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>Consumer Duty Statement</Text>
      <Text style={styles.text}>{reportTemplates.consumerDuty.standard}</Text>
    </View>

    <View style={{ marginTop: 18 }}>
      <Text style={styles.text}>Yours sincerely,</Text>
      <Text style={[styles.text, { marginTop: 10 }]}>{data.adviser.name}</Text>
      <Text style={styles.text}>{data.adviser.firmName}</Text>
    </View>

    <PageFooter styles={styles} brand={brand} />
  </Page>
  )
}
