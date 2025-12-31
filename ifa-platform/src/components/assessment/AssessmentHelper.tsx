// src/components/assessment/AssessmentHelper.tsx
// ===================================================================
// ASSESSMENT HELPER - Real-time analysis during ATR, CFL, Investor Persona
// ===================================================================

'use client'

import React, { useMemo, useCallback } from 'react'
import {
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Scale,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// Types
interface ATRData {
  investmentExperience?: string
  riskWillingness?: number
  emotionalReaction?: string
  investmentGoal?: string
  timeHorizon?: number
  lossReaction?: string
}

interface CFLData {
  annualIncome?: number
  essentialExpenses?: number
  discretionaryIncome?: number
  emergencyFund?: number
  existingDebts?: number
  dependents?: number
  employmentStability?: string
  incomeSources?: number
}

interface PersonaData {
  investorType?: string
  communicationPreference?: string
  decisionMakingStyle?: string
  financialKnowledge?: string
}

interface AssessmentHelperProps {
  assessmentType: 'atr' | 'cfl' | 'persona' | 'suitability'
  atrData?: ATRData
  cflData?: CFLData
  personaData?: PersonaData
  clientAge?: number
  onSuggestedQuestion?: (question: string) => void
}

interface Insight {
  type: 'warning' | 'info' | 'success' | 'question' | 'regulatory'
  title: string
  message: string
  icon: React.ElementType
  priority: 'high' | 'medium' | 'low'
}

// Assessment Helper Component
export const AssessmentHelper: React.FC<AssessmentHelperProps> = ({
  assessmentType,
  atrData,
  cflData,
  personaData,
  clientAge,
  onSuggestedQuestion
}) => {
  // Analyze ATR data for inconsistencies
  const analyzeATR = useCallback((): Insight[] => {
    const insights: Insight[] = []

    if (!atrData) return insights

    // Check for aggressive risk with low experience
    if (atrData.riskWillingness && atrData.riskWillingness >= 7 &&
        atrData.investmentExperience === 'none') {
      insights.push({
        type: 'warning',
        title: 'Risk Experience Mismatch',
        message: 'Client indicates high risk willingness but has no investment experience. Explore whether understanding of risk is realistic.',
        icon: AlertTriangle,
        priority: 'high'
      })
    }

    // Emotional reaction inconsistent with stated willingness
    if (atrData.riskWillingness && atrData.riskWillingness >= 6 &&
        (atrData.lossReaction === 'panic' || atrData.lossReaction === 'sell_immediately')) {
      insights.push({
        type: 'warning',
        title: 'Emotional vs Stated Risk',
        message: 'Client\'s stated risk tolerance conflicts with emotional response to losses. This may indicate an overstated risk appetite.',
        icon: Scale,
        priority: 'high'
      })
    }

    // Short time horizon with growth goal
    if (atrData.timeHorizon && atrData.timeHorizon < 5 &&
        atrData.investmentGoal === 'capital_growth') {
      insights.push({
        type: 'warning',
        title: 'Time Horizon Concern',
        message: 'Capital growth goal with short time horizon (<5 years) may not be suitable. Consider whether income or capital preservation is more appropriate.',
        icon: Clock,
        priority: 'medium'
      })
    }

    // Age consideration for aggressive risk
    if (clientAge && clientAge >= 60 && atrData.riskWillingness && atrData.riskWillingness >= 7) {
      insights.push({
        type: 'info',
        title: 'Age Consideration',
        message: 'Client aged 60+ with aggressive risk profile. Ensure capacity for loss is thoroughly assessed and recovery time from drawdowns is considered.',
        icon: Info,
        priority: 'medium'
      })
    }

    // Good alignment
    if (atrData.riskWillingness && atrData.investmentExperience &&
        atrData.lossReaction && !insights.some(i => i.type === 'warning')) {
      insights.push({
        type: 'success',
        title: 'Consistent Profile',
        message: 'Client\'s risk attitude appears consistent across questions. Responses align with stated experience level.',
        icon: CheckCircle,
        priority: 'low'
      })
    }

    return insights
  }, [atrData, clientAge])

  // Analyze CFL data
  const analyzeCFL = useCallback((): Insight[] => {
    const insights: Insight[] = []

    if (!cflData) return insights

    const disposableIncome = (cflData.annualIncome || 0) - (cflData.essentialExpenses || 0)
    const disposableRatio = cflData.annualIncome ? disposableIncome / cflData.annualIncome : 0

    // Low capacity for loss
    if (disposableRatio < 0.15) {
      insights.push({
        type: 'warning',
        title: 'Limited Capacity for Loss',
        message: 'Client has limited discretionary income (<15% of annual income). Any loss could significantly impact living standards.',
        icon: TrendingDown,
        priority: 'high'
      })
    }

    // Insufficient emergency fund
    if (cflData.emergencyFund && cflData.essentialExpenses) {
      const monthsCovered = cflData.emergencyFund / (cflData.essentialExpenses / 12)
      if (monthsCovered < 3) {
        insights.push({
          type: 'warning',
          title: 'Emergency Fund Gap',
          message: `Emergency fund covers only ${monthsCovered.toFixed(1)} months of expenses. FCA guidance suggests 3-6 months. Address this before high-risk investments.`,
          icon: Shield,
          priority: 'high'
        })
      }
    }

    // High debt relative to income
    if (cflData.existingDebts && cflData.annualIncome) {
      const debtRatio = cflData.existingDebts / cflData.annualIncome
      if (debtRatio > 0.4) {
        insights.push({
          type: 'warning',
          title: 'High Debt Burden',
          message: 'Debt exceeds 40% of annual income. Prioritise debt reduction before significant investment commitments.',
          icon: AlertCircle,
          priority: 'high'
        })
      }
    }

    // Single income source with dependents
    if (cflData.incomeSources === 1 && cflData.dependents && cflData.dependents > 0) {
      insights.push({
        type: 'info',
        title: 'Single Income Household',
        message: `Client has ${cflData.dependents} dependent(s) with single income source. Income protection and cautious investment approach recommended.`,
        icon: Info,
        priority: 'medium'
      })
    }

    // Employment instability
    if (cflData.employmentStability === 'unstable' || cflData.employmentStability === 'contract') {
      insights.push({
        type: 'warning',
        title: 'Employment Risk',
        message: 'Employment situation is not stable. Maintain higher liquidity and consider reduced risk exposure.',
        icon: AlertTriangle,
        priority: 'medium'
      })
    }

    // Good capacity
    if (disposableRatio >= 0.25 && !insights.some(i => i.priority === 'high')) {
      insights.push({
        type: 'success',
        title: 'Healthy Financial Position',
        message: 'Client has good discretionary income ratio. Financial capacity appears sufficient for investment risk.',
        icon: TrendingUp,
        priority: 'low'
      })
    }

    return insights
  }, [cflData])

  // Analyze combined ATR vs CFL
  const analyzeATRvsCFL = useCallback((): Insight[] => {
    const insights: Insight[] = []

    if (!atrData || !cflData) return insights

    const disposableIncome = (cflData.annualIncome || 0) - (cflData.essentialExpenses || 0)
    const disposableRatio = cflData.annualIncome ? disposableIncome / cflData.annualIncome : 0

    // High ATR but low CFL - critical mismatch
    if (atrData.riskWillingness && atrData.riskWillingness >= 7 && disposableRatio < 0.2) {
      insights.push({
        type: 'regulatory',
        title: 'ATR/CFL Mismatch',
        message: 'CRITICAL: Client has high Attitude to Risk but limited Capacity for Loss. FCA COBS 9.2 requires capacity to be given appropriate weight. Document rationale if proceeding with higher-risk recommendation.',
        icon: Shield,
        priority: 'high'
      })
    }

    // Aggressive profile with debt
    if (atrData.riskWillingness && atrData.riskWillingness >= 6 &&
        cflData.existingDebts && cflData.existingDebts > 0) {
      insights.push({
        type: 'question',
        title: 'Consider Debt Repayment',
        message: 'Client wishes to invest but has existing debts. Explore whether debt repayment might be more suitable than investment.',
        icon: Lightbulb,
        priority: 'medium'
      })
    }

    return insights
  }, [atrData, cflData])

  // Generate suggested follow-up questions
  const getSuggestedQuestions = useCallback((): string[] => {
    const questions: string[] = []

    if (atrData?.riskWillingness && atrData.riskWillingness >= 7 &&
        atrData.investmentExperience === 'none') {
      questions.push('Can you describe what a 30% portfolio decline would mean to you in practical terms?')
      questions.push('Have you experienced any significant financial losses before? How did you respond?')
    }

    if (cflData && cflData.emergencyFund && cflData.essentialExpenses) {
      const monthsCovered = cflData.emergencyFund / (cflData.essentialExpenses / 12)
      if (monthsCovered < 3) {
        questions.push('Would you like to discuss building your emergency fund before making investments?')
      }
    }

    if (clientAge && clientAge >= 55 && atrData?.investmentGoal === 'capital_growth') {
      questions.push('With retirement approaching, how do you see your investment needs changing over the next 5-10 years?')
    }

    return questions
  }, [atrData, cflData, clientAge])

  // Get regulatory considerations
  const getRegulatoryConsiderations = useCallback((): Insight[] => {
    const insights: Insight[] = []

    // Consumer Duty considerations
    insights.push({
      type: 'regulatory',
      title: 'Consumer Duty (FCA)',
      message: 'Ensure the recommended product delivers good outcomes for this specific client. Document how the recommendation meets their needs and objectives.',
      icon: Shield,
      priority: 'medium'
    })

    // COBS 9.2 suitability
    if (atrData && cflData) {
      insights.push({
        type: 'regulatory',
        title: 'COBS 9.2.2R',
        message: 'Suitability assessment must account for: (1) knowledge and experience, (2) financial situation including capacity for loss, (3) investment objectives including risk tolerance.',
        icon: Shield,
        priority: 'medium'
      })
    }

    return insights
  }, [atrData, cflData])

  // Combine all insights
  const allInsights = useMemo(() => {
    let insights: Insight[] = []

    if (assessmentType === 'atr' || assessmentType === 'suitability') {
      insights = [...insights, ...analyzeATR()]
    }

    if (assessmentType === 'cfl' || assessmentType === 'suitability') {
      insights = [...insights, ...analyzeCFL()]
    }

    if (assessmentType === 'suitability') {
      insights = [...insights, ...analyzeATRvsCFL(), ...getRegulatoryConsiderations()]
    }

    // Sort by priority
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [assessmentType, analyzeATR, analyzeATRvsCFL, analyzeCFL, getRegulatoryConsiderations])

  const suggestedQuestions = useMemo(() => getSuggestedQuestions(), [getSuggestedQuestions])

  if (allInsights.length === 0 && suggestedQuestions.length === 0) {
    return null
  }

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      case 'question': return 'bg-purple-50 border-purple-200 text-purple-800'
      case 'regulatory': return 'bg-red-50 border-red-200 text-red-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return 'text-yellow-600'
      case 'info': return 'text-blue-600'
      case 'success': return 'text-green-600'
      case 'question': return 'text-purple-600'
      case 'regulatory': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityBadge = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High Priority</Badge>
      case 'medium': return <Badge variant="default" className="text-xs">Medium</Badge>
      case 'low': return <Badge variant="secondary" className="text-xs">Note</Badge>
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          Assessment Helper
        </CardTitle>
        <p className="text-sm text-gray-600">
          Real-time analysis and compliance considerations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insights */}
        {allInsights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Analysis & Insights</h4>
            {allInsights.map((insight, index) => {
              const Icon = insight.icon
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getIconColor(insight.type)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-sm">{insight.title}</h5>
                        {getPriorityBadge(insight.priority)}
                      </div>
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Suggested Follow-up Questions
            </h4>
            <div className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <div
                  key={index}
                  className="p-2 bg-white rounded border border-gray-200 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSuggestedQuestion?.(question)}
                >
                  <span className="text-purple-600 mr-2">Q:</span>
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {allInsights.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                {allInsights.filter(i => i.type === 'warning').length} warnings
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-red-600" />
                {allInsights.filter(i => i.type === 'regulatory').length} regulatory
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                {allInsights.filter(i => i.type === 'success').length} positive
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for sidebar display
export const AssessmentHelperCompact: React.FC<AssessmentHelperProps> = (props) => {
  // Simplified version that just shows key warnings
  const hasHighPriorityWarnings = useMemo(() => {
    // Logic to determine if there are critical warnings
    if (props.atrData?.riskWillingness && props.atrData.riskWillingness >= 7) {
      if (props.cflData) {
        const disposableIncome = (props.cflData.annualIncome || 0) - (props.cflData.essentialExpenses || 0)
        const disposableRatio = props.cflData.annualIncome ? disposableIncome / props.cflData.annualIncome : 0
        if (disposableRatio < 0.2) return true
      }
      if (props.atrData.investmentExperience === 'none') return true
    }
    return false
  }, [props.atrData, props.cflData])

  if (!hasHighPriorityWarnings) return null

  return (
    <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">
          Review Assessment Helper for important considerations
        </span>
      </div>
    </div>
  )
}

export default AssessmentHelper
