// components/compliance/AMLRiskWizard.tsx
// ================================================================
// AML Risk Assessment Wizard
// 4-question wizard to determine AML risk rating with auto-calculation
// ================================================================

'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Globe,
  User,
  AlertTriangle,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  X,
  Info,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// Types
interface AMLSettings {
  lowRiskYears: number
  mediumRiskYears: number
  highRiskYears: number
  reminderDaysBefore: number
}

interface AssessmentAnswers {
  jurisdiction: number | null
  pepStatus: number | null
  sanctions: number | null
  natureOfBusiness: number | null
}

interface AMLRiskWizardProps {
  clientName: string
  clientId: string
  existingData?: {
    risk_rating?: string
    pep_status?: string
    sanctions_status?: string
  }
  settings?: AMLSettings
  onComplete: (result: {
    riskRating: 'low' | 'medium' | 'high'
    nextReviewDate: string
    lastReviewDate: string
    assessmentDetails: {
      jurisdiction: string
      pepStatus: string
      sanctions: string
      natureOfBusiness: string
      totalScore: number
    }
  }) => void
  onCancel: () => void
}

// Question configurations
const QUESTIONS = [
  {
    id: 'jurisdiction',
    title: 'Client Jurisdiction',
    description: 'Where is the client based or tax resident?',
    icon: Globe,
    options: [
      { value: 0, label: 'UK Resident', description: 'UK tax resident, UK address', risk: 'Low' },
      { value: 1, label: 'EU/EEA Resident', description: 'European Economic Area country', risk: 'Medium' },
      { value: 2, label: 'Non-EEA/Offshore', description: 'High-risk jurisdiction or offshore territory', risk: 'High' }
    ]
  },
  {
    id: 'pepStatus',
    title: 'Politically Exposed Person (PEP)',
    description: 'Is the client or a close associate a PEP?',
    icon: User,
    options: [
      { value: 0, label: 'Not a PEP', description: 'No political exposure identified', risk: 'Low' },
      { value: 1, label: 'Related to PEP', description: 'Close family member or associate of a PEP', risk: 'Medium' },
      { value: 2, label: 'Is a PEP', description: 'Currently or recently held prominent public function', risk: 'High' }
    ]
  },
  {
    id: 'sanctions',
    title: 'Sanctions & Adverse Media',
    description: 'Have sanctions or adverse media checks been performed?',
    icon: AlertTriangle,
    options: [
      { value: 0, label: 'Clear', description: 'No sanctions matches, no adverse media', risk: 'Low' },
      { value: 1, label: 'Potential Match', description: 'Possible name match requiring investigation', risk: 'Medium' },
      { value: 2, label: 'Confirmed Match', description: 'Confirmed sanctions or significant adverse media', risk: 'High' }
    ]
  },
  {
    id: 'natureOfBusiness',
    title: 'Nature of Business / Source of Wealth',
    description: 'What is the client\'s primary source of income/wealth?',
    icon: Briefcase,
    options: [
      { value: 0, label: 'Standard Employment', description: 'Salaried employment, pension, verifiable income', risk: 'Low' },
      { value: 1, label: 'Self-employed / Complex', description: 'Business owner, multiple income sources', risk: 'Medium' },
      { value: 2, label: 'Cash-intensive / High-risk', description: 'Cash business, inheritance, gambling, crypto', risk: 'High' }
    ]
  }
]

const DEFAULT_SETTINGS: AMLSettings = {
  lowRiskYears: 5,
  mediumRiskYears: 3,
  highRiskYears: 1,
  reminderDaysBefore: 60
}

export default function AMLRiskWizard({
  clientName,
  clientId,
  existingData,
  settings = DEFAULT_SETTINGS,
  onComplete,
  onCancel
}: AMLRiskWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswers>({
    jurisdiction: null,
    pepStatus: null,
    sanctions: null,
    natureOfBusiness: null
  })
  const [showSummary, setShowSummary] = useState(false)

  // Calculate risk rating from scores
  const calculateRiskRating = (scores: (number | null)[]): 'low' | 'medium' | 'high' => {
    const validScores = scores.filter((s): s is number => s !== null)
    if (validScores.length === 0) return 'low'

    const total = validScores.reduce((a, b) => a + b, 0)
    const hasHighRisk = validScores.some(s => s === 2)

    // Any high-risk answer OR total score >= 5 = High Risk
    if (hasHighRisk || total >= 5) return 'high'
    // Total score 2-4 = Medium Risk
    if (total >= 2) return 'medium'
    // Total score 0-1 = Low Risk
    return 'low'
  }

  // Calculate next review date based on risk rating
  const calculateNextReviewDate = (riskRating: 'low' | 'medium' | 'high'): string => {
    const now = new Date()
    const years = {
      low: settings.lowRiskYears,
      medium: settings.mediumRiskYears,
      high: settings.highRiskYears
    }
    const nextDate = new Date(now)
    nextDate.setFullYear(nextDate.getFullYear() + years[riskRating])
    return nextDate.toISOString().split('T')[0]
  }

  // Get current question
  const currentQuestion = QUESTIONS[currentStep]
  const allAnswered = Object.values(answers).every(a => a !== null)
  const scores = [answers.jurisdiction, answers.pepStatus, answers.sanctions, answers.natureOfBusiness]
  const riskRating = calculateRiskRating(scores)
  const totalScore = scores.filter((s): s is number => s !== null).reduce((a, b) => a + b, 0)

  // Handle answer selection
  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // Handle navigation
  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleBack = () => {
    if (showSummary) {
      setShowSummary(false)
    } else if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Handle completion
  const handleComplete = () => {
    const nextReviewDate = calculateNextReviewDate(riskRating)
    const lastReviewDate = new Date().toISOString().split('T')[0]

    onComplete({
      riskRating,
      nextReviewDate,
      lastReviewDate,
      assessmentDetails: {
        jurisdiction: QUESTIONS[0].options.find(o => o.value === answers.jurisdiction)?.label || 'Not assessed',
        pepStatus: QUESTIONS[1].options.find(o => o.value === answers.pepStatus)?.label || 'Not assessed',
        sanctions: QUESTIONS[2].options.find(o => o.value === answers.sanctions)?.label || 'Not assessed',
        natureOfBusiness: QUESTIONS[3].options.find(o => o.value === answers.natureOfBusiness)?.label || 'Not assessed',
        totalScore
      }
    })
  }

  // Risk color styling
  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getRiskBgColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'high': return 'bg-red-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                AML Risk Assessment
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Client: <span className="font-medium">{clientName}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center gap-2">
            {QUESTIONS.map((q, idx) => (
              <div key={q.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    idx < currentStep || showSummary
                      ? 'bg-blue-600 text-white'
                      : idx === currentStep && !showSummary
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {idx < currentStep || showSummary ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < QUESTIONS.length - 1 && (
                  <div className={`w-8 h-1 mx-1 rounded ${
                    idx < currentStep || showSummary ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
            <div className="flex items-center">
              <div className={`w-1 h-8 mx-1 rounded ${showSummary ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  showSummary
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {showSummary ? (
            /* Summary View */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Assessment Complete</h3>
                <p className="text-gray-600">Review the results below before saving.</p>
              </div>

              {/* Risk Rating Result */}
              <Card className={`${getRiskColor(riskRating)} border-2`}>
                <CardContent className="p-6 text-center">
                  <div className="text-sm uppercase tracking-wide mb-2">Overall Risk Rating</div>
                  <div className="text-3xl font-bold capitalize">{riskRating} Risk</div>
                  <div className="text-sm mt-2">Total Score: {totalScore}/8</div>
                </CardContent>
              </Card>

              {/* Review Schedule */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Review Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Review Due:</span>
                    <span className="font-medium">{calculateNextReviewDate(riskRating)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Review Frequency:</span>
                    <span className="font-medium">
                      {riskRating === 'low' ? `${settings.lowRiskYears} years` :
                       riskRating === 'medium' ? `${settings.mediumRiskYears} years` :
                       `${settings.highRiskYears} year`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reminder:</span>
                    <span className="font-medium">{settings.reminderDaysBefore} days before due</span>
                  </div>
                </CardContent>
              </Card>

              {/* Answers Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Assessment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {QUESTIONS.map((q, idx) => {
                    const answer = answers[q.id as keyof AssessmentAnswers]
                    const option = q.options.find(o => o.value === answer)
                    return (
                      <div key={q.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <q.icon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{q.title}</span>
                        </div>
                        <Badge variant="outline" className={
                          option?.risk === 'Low' ? 'bg-green-50 text-green-700' :
                          option?.risk === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }>
                          {option?.label || 'Not assessed'} ({option?.risk})
                        </Badge>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Question View */
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${getRiskBgColor('low')} bg-opacity-10`}>
                  <currentQuestion.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{currentQuestion.title}</h3>
                  <p className="text-sm text-gray-600">{currentQuestion.description}</p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id as keyof AssessmentAnswers] === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(currentQuestion.id, option.value)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? option.risk === 'Low' ? 'border-green-500 bg-green-50' :
                            option.risk === 'Medium' ? 'border-yellow-500 bg-yellow-50' :
                            'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                        <Badge variant="outline" className={
                          option.risk === 'Low' ? 'bg-green-100 text-green-700' :
                          option.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {option.risk}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Current Risk Indicator */}
              {Object.values(answers).some(a => a !== null) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Current estimated risk:
                  </span>
                  <Badge className={getRiskColor(riskRating)}>
                    {riskRating.charAt(0).toUpperCase() + riskRating.slice(1)} Risk
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 && !showSummary}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {showSummary ? (
              <Button onClick={handleComplete}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Save Assessment
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={answers[currentQuestion.id as keyof AssessmentAnswers] === null}
              >
                {currentStep === QUESTIONS.length - 1 ? 'Review' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
