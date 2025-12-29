import type { AssessmentData } from './types'

export const aggregateAssessmentData = (
  assessments: AssessmentData[],
  client: any,
  reportType: string
): Record<string, any> => {
  const atr = assessments.find(a => a.type === 'atr')
  const cfl = assessments.find(a => a.type === 'cfl')
  const suitability = assessments.find(a => a.type === 'suitability')

  const baseData = {
    CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Client',
    REVIEW_DATE: new Date().toLocaleDateString('en-GB'),
    ADVISOR_NAME: 'Professional Advisor',
    EXECUTIVE_SUMMARY: generateExecutiveSummary(assessments, client)
  }

  return {
    ...baseData,
    ATR_SCORE: atr?.data.total_score || 'Not assessed',
    ATR_CATEGORY: atr?.data.risk_category || 'Not assessed',
    ATR_DATE: atr ? new Date(atr.completedAt).toLocaleDateString('en-GB') : 'N/A',
    CFL_SCORE: cfl?.data.total_score || 'Not assessed',
    MAX_LOSS: cfl?.data.max_loss_percentage || 0,
    CFL_DATE: cfl ? new Date(cfl.completedAt).toLocaleDateString('en-GB') : 'N/A',
    SUITABILITY_VERSION: suitability?.data.version_number || 'N/A',
    SUITABILITY_STATUS: suitability?.data.is_final ? 'Final' : 'Draft',
    ASSESSMENT_HISTORY: buildAssessmentHistory(assessments),
    KEY_CHANGES: identifyKeyChanges(assessments, client),
    RECOMMENDATIONS: buildRecommendations(assessments, client),
    NEXT_STEPS: buildNextSteps(assessments, client)
  }
}

const generateExecutiveSummary = (assessments: AssessmentData[], client: any): string => {
  const hasAllAssessments = assessments.length >= 3
  const riskAligned = checkRiskAlignment(assessments)
  const clientName = client.personal_details?.firstName || 'the client'

  return `This annual review summarizes the current financial position and risk profile for ${clientName}. ${hasAllAssessments ? 'All required assessments have been completed.' : 'Some assessments are pending completion.'} ${riskAligned ? 'Risk profiles are well-aligned across assessments.' : 'There are some discrepancies in risk assessments that require attention.'}`
}

const checkRiskAlignment = (assessments: AssessmentData[]): boolean => {
  const atr = assessments.find(a => a.type === 'atr')
  const cfl = assessments.find(a => a.type === 'cfl')

  if (!atr || !cfl) return true

  const atrLevel = atr.data.risk_level || 3
  const cflLevel = cfl.data.capacity_level || 3

  return Math.abs(atrLevel - cflLevel) <= 1
}

const buildAssessmentHistory = (assessments: AssessmentData[]): any[] => {
  return assessments
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .map(assessment => ({
      date: new Date(assessment.completedAt).toLocaleDateString('en-GB'),
      type: assessment.type.toUpperCase(),
      summary: getAssessmentSummary(assessment)
    }))
}

const getAssessmentSummary = (assessment: AssessmentData): string => {
  switch (assessment.type) {
    case 'atr':
      return `Risk score: ${assessment.data.total_score || 0}/100, Category: ${assessment.data.risk_category || 'Not assessed'}`
    case 'cfl':
      return `Capacity score: ${assessment.data.total_score || 0}/100, Max loss: ${assessment.data.max_loss_percentage || 0}%`
    case 'suitability': {
      const version = assessment.data.version_number || 1
      const objective = assessment.data.objectives?.primary_objective || 'investment'
      return `Suitability confirmed for ${objective} (Version ${version})`
    }
    case 'vulnerability':
      return assessment.data.is_vulnerable ? 'Vulnerability factors identified' : 'No vulnerabilities identified'
    default:
      return 'Assessment completed'
  }
}

const identifyKeyChanges = (assessments: AssessmentData[], client: any): string[] => {
  const changes: string[] = []

  const recentAssessments = assessments.filter(a => {
    const daysSince = (Date.now() - new Date(a.completedAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince < 90
  })

  if (recentAssessments.length > 0) {
    changes.push(`${recentAssessments.length} assessment(s) updated in the last 90 days`)
  }

  const atr = assessments.find(a => a.type === 'atr')
  if (atr && atr.data.risk_level !== client.risk_profile?.risk_level) {
    changes.push('Risk profile has been updated')
  }

  if (client.vulnerability_assessment?.is_vulnerable) {
    changes.push('Client vulnerability factors require ongoing monitoring')
  }

  return changes.length > 0 ? changes : ['No significant changes since last review']
}

const buildRecommendations = (assessments: AssessmentData[], client: any): any[] => {
  const recommendations: any[] = []

  const atr = assessments.find(a => a.type === 'atr')
  const cfl = assessments.find(a => a.type === 'cfl')

  if (atr && cfl) {
    const riskAligned = Math.abs((atr.data.risk_level || 3) - (cfl.data.capacity_level || 3)) <= 1
    if (!riskAligned) {
      recommendations.push({
        category: 'Risk Alignment',
        recommendation: 'Review and align risk tolerance with capacity for loss'
      })
    }
  }

  if (!assessments.find(a => a.type === 'vulnerability')) {
    recommendations.push({
      category: 'Vulnerability',
      recommendation: 'Complete vulnerability assessment for ongoing monitoring'
    })
  }

  if (!assessments.find(a => a.type === 'suitability')) {
    recommendations.push({
      category: 'Suitability',
      recommendation: 'Complete or update suitability assessment'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      category: 'Monitoring',
      recommendation: 'Maintain current review cadence and monitoring'
    })
  }

  return recommendations
}

const buildNextSteps = (assessments: AssessmentData[], client: any): string[] => {
  const nextSteps: string[] = []

  if (!assessments.find(a => a.type === 'atr')) {
    nextSteps.push('Complete attitude to risk assessment')
  }

  if (!assessments.find(a => a.type === 'cfl')) {
    nextSteps.push('Complete capacity for loss assessment')
  }

  if (!assessments.find(a => a.type === 'suitability')) {
    nextSteps.push('Complete suitability assessment')
  }

  if (client.next_review_date) {
    nextSteps.push(`Next review scheduled for ${new Date(client.next_review_date).toLocaleDateString('en-GB')}`)
  }

  return nextSteps.length > 0 ? nextSteps : ['Continue monitoring client profile and portfolio']
}
