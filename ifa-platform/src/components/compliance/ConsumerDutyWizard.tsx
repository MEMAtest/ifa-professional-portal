// src/components/compliance/ConsumerDutyWizard.tsx
// ================================================================
// CONSUMER DUTY ASSESSMENT WIZARD
// Step-by-step guided assessment for Consumer Duty outcomes
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  PoundSterling,
  BookOpen,
  HeadphonesIcon,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Upload,
  FileText,
  Clock,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import {
  consumerDutyQuestions,
  outcomeOrder,
  calculateOutcomeStatus,
  totalMaxScore,
  type OutcomeSection,
  type AssessmentQuestion
} from '@/config/consumerDuty/questions'

// Types
interface AssessmentAnswers {
  [outcomeId: string]: {
    [questionId: string]: {
      value: string | string[]
      notes?: string
      evidenceRef?: string
    }
  }
}

interface AssessmentScores {
  [outcomeId: string]: {
    score: number
    maxScore: number
    status: 'compliant' | 'partially_compliant' | 'non_compliant'
  }
}

interface Props {
  clientId: string
  clientName: string
  existingAssessment?: {
    id: string
    answers: AssessmentAnswers
    assessedAt?: string
    assessedBy?: string
  }
  onComplete: (data: {
    answers: AssessmentAnswers
    scores: AssessmentScores
    overallScore: number
    overallStatus: string
  }) => void
  onSaveDraft: (answers: AssessmentAnswers) => void
  onClose: () => void
}

// Icon mapping
const outcomeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  PoundSterling,
  BookOpen,
  HeadphonesIcon
}

export default function ConsumerDutyWizard({
  clientId,
  clientName,
  existingAssessment,
  onComplete,
  onSaveDraft,
  onClose
}: Props) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswers>(existingAssessment?.answers || {})
  const [saving, setSaving] = useState(false)

  // Get current outcome
  const currentOutcomeId = outcomeOrder[currentStep]
  const currentOutcome = consumerDutyQuestions[currentOutcomeId]
  const totalSteps = outcomeOrder.length

  // Calculate scores for all outcomes
  const calculateScores = useCallback((): AssessmentScores => {
    const scores: AssessmentScores = {}

    for (const outcomeId of outcomeOrder) {
      const outcome = consumerDutyQuestions[outcomeId]
      const outcomeAnswers = answers[outcomeId] || {}

      let score = 0
      for (const question of outcome.questions) {
        const answer = outcomeAnswers[question.id]
        if (answer?.value && question.options) {
          const selectedOption = question.options.find(opt => opt.value === answer.value)
          if (selectedOption) {
            score += selectedOption.score
          }
        }
      }

      scores[outcomeId] = {
        score,
        maxScore: outcome.maxScore,
        status: calculateOutcomeStatus(score, outcome.maxScore, outcome.scoringThresholds)
      }
    }

    return scores
  }, [answers])

  const scores = calculateScores()

  // Calculate overall progress
  const calculateProgress = (): number => {
    let answeredQuestions = 0
    let totalQuestions = 0

    for (const outcomeId of outcomeOrder) {
      const outcome = consumerDutyQuestions[outcomeId]
      const outcomeAnswers = answers[outcomeId] || {}

      for (const question of outcome.questions) {
        totalQuestions++
        if (outcomeAnswers[question.id]?.value) {
          answeredQuestions++
        }
      }
    }

    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  }

  const progress = calculateProgress()

  // Check if current step is complete (all required questions answered)
  const isStepComplete = (): boolean => {
    const outcomeAnswers = answers[currentOutcomeId] || {}

    for (const question of currentOutcome.questions) {
      if (question.required && !outcomeAnswers[question.id]?.value) {
        return false
      }
    }

    return true
  }

  // Handle answer change
  const handleAnswerChange = (questionId: string, value: string, notes?: string, evidenceRef?: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentOutcomeId]: {
        ...prev[currentOutcomeId],
        [questionId]: {
          value,
          notes: notes || prev[currentOutcomeId]?.[questionId]?.notes,
          evidenceRef: evidenceRef || prev[currentOutcomeId]?.[questionId]?.evidenceRef
        }
      }
    }))
  }

  // Handle notes change
  const handleNotesChange = (questionId: string, notes: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentOutcomeId]: {
        ...prev[currentOutcomeId],
        [questionId]: {
          ...prev[currentOutcomeId]?.[questionId],
          value: prev[currentOutcomeId]?.[questionId]?.value || '',
          notes
        }
      }
    }))
  }

  // Navigation
  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const goPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Save draft
  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await onSaveDraft(answers)
      toast({
        title: 'Draft Saved',
        description: 'Your assessment progress has been saved'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Complete assessment
  const handleComplete = async () => {
    const allScores = calculateScores()

    // Calculate overall
    let totalScore = 0
    let maxPossible = 0

    for (const outcomeId of outcomeOrder) {
      totalScore += allScores[outcomeId].score
      maxPossible += allScores[outcomeId].maxScore
    }

    const overallPercentage = Math.round((totalScore / maxPossible) * 100)
    let overallStatus = 'non_compliant'
    if (overallPercentage >= 80) overallStatus = 'compliant'
    else if (overallPercentage >= 60) overallStatus = 'partially_compliant'

    setSaving(true)
    try {
      await onComplete({
        answers,
        scores: allScores,
        overallScore: overallPercentage,
        overallStatus
      })
      toast({
        title: 'Assessment Complete',
        description: 'Consumer Duty assessment has been submitted'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit assessment',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'compliant':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Compliant' }
      case 'partially_compliant':
        return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Partially Compliant' }
      case 'non_compliant':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Non-Compliant' }
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Not Assessed' }
    }
  }

  // Render question
  const renderQuestion = (question: AssessmentQuestion) => {
    const currentAnswer = answers[currentOutcomeId]?.[question.id]

    return (
      <div key={question.id} className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            {question.helpText && (
              <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
            )}
          </div>
          {question.evidenceRequired && (
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Evidence Required
            </Badge>
          )}
        </div>

        {question.fcaGuidance && (
          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md mb-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700">{question.fcaGuidance}</p>
          </div>
        )}

        {/* Radio options */}
        {question.type === 'radio' && question.options && (
          <div className="space-y-2">
            {question.options.map(option => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentAnswer?.value === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={currentAnswer?.value === option.value}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{option.label}</p>
                  {option.description && (
                    <p className="text-sm text-gray-500">{option.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Score: {option.score} points</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Notes field */}
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
          <textarea
            value={currentAnswer?.notes || ''}
            onChange={(e) => handleNotesChange(question.id, e.target.value)}
            placeholder="Add any relevant notes or observations..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={2}
          />
        </div>

        {/* Evidence reference */}
        {question.evidenceRequired && (
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-1">Evidence Reference</label>
            <input
              type="text"
              value={currentAnswer?.evidenceRef || ''}
              onChange={(e) => handleAnswerChange(question.id, (typeof currentAnswer?.value === 'string' ? currentAnswer.value : '') || '', currentAnswer?.notes, e.target.value)}
              placeholder="Document reference, filename, or location..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>
    )
  }

  const OutcomeIcon = outcomeIcons[currentOutcome.icon] || Package

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Consumer Duty Assessment</h2>
              <p className="text-sm text-gray-500">Client: {clientName}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Progress</p>
                <p className="font-semibold">{progress}%</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between mt-4">
            {outcomeOrder.map((outcomeId, index) => {
              const outcome = consumerDutyQuestions[outcomeId]
              const outcomeScore = scores[outcomeId]
              const statusDisplay = outcomeScore ? getStatusDisplay(outcomeScore.status) : getStatusDisplay('')
              const StatusIcon = statusDisplay.icon
              const isActive = index === currentStep
              const isCompleted = outcomeScore && outcomeScore.score > 0

              return (
                <button
                  key={outcomeId}
                  onClick={() => setCurrentStep(index)}
                  className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    isActive ? 'bg-blue-600 text-white' : statusDisplay.bg
                  }`}>
                    {isCompleted && !isActive ? (
                      <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
                    ) : (
                      <span className={isActive ? 'text-white' : 'text-gray-600'}>{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                    {outcome.shortTitle}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Outcome header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <OutcomeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{currentOutcome.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{currentOutcome.description}</p>
              <Badge variant="outline" className="mt-2">
                FCA Reference: {currentOutcome.fcaReference}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {scores[currentOutcomeId]?.score || 0}/{currentOutcome.maxScore}
              </p>
              {scores[currentOutcomeId] && (
                <Badge className={getStatusDisplay(scores[currentOutcomeId].status).bg}>
                  {getStatusDisplay(scores[currentOutcomeId].status).label}
                </Badge>
              )}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {currentOutcome.questions.map(question => renderQuestion(question))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>

            {currentStep === totalSteps - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={saving || progress < 100}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Assessment
              </Button>
            ) : (
              <Button onClick={goNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
