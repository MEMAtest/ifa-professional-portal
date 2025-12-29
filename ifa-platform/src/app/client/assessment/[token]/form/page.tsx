// src/app/client/assessment/[token]/form/page.tsx
// Public assessment form page - renders questionnaire based on assessment type

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

// ==================== QUESTION DATA ====================

// ATR Questions
const ATR_QUESTIONS = [
  {
    id: 'atr_1',
    question: 'How would you describe your investment knowledge?',
    options: [
      { value: 1, label: 'None - I have no investment experience' },
      { value: 2, label: 'Limited - I understand basic concepts' },
      { value: 3, label: 'Good - I have some investment experience' },
      { value: 4, label: 'Extensive - I actively manage investments' }
    ]
  },
  {
    id: 'atr_2',
    question: 'If your investment dropped 20% in value, what would you do?',
    options: [
      { value: 1, label: 'Sell everything immediately' },
      { value: 2, label: 'Sell some to reduce further losses' },
      { value: 3, label: 'Hold and wait for recovery' },
      { value: 4, label: 'Buy more while prices are low' }
    ]
  },
  {
    id: 'atr_3',
    question: 'Which statement best describes your investment goals?',
    options: [
      { value: 1, label: 'Preserve my capital - I cannot afford any losses' },
      { value: 2, label: 'Generate steady income with minimal risk' },
      { value: 3, label: 'Balance growth and income with moderate risk' },
      { value: 4, label: 'Maximise growth - I accept higher risk for higher returns' }
    ]
  },
  {
    id: 'atr_4',
    question: 'How long do you plan to keep your investments before needing the money?',
    options: [
      { value: 1, label: 'Less than 2 years' },
      { value: 2, label: '2-5 years' },
      { value: 3, label: '5-10 years' },
      { value: 4, label: 'More than 10 years' }
    ]
  },
  {
    id: 'atr_5',
    question: 'How comfortable are you with investment fluctuations?',
    options: [
      { value: 1, label: 'Not at all - I check my investments daily and worry about any loss' },
      { value: 2, label: 'Somewhat uncomfortable - small fluctuations concern me' },
      { value: 3, label: 'Fairly comfortable - I understand markets go up and down' },
      { value: 4, label: 'Very comfortable - short-term losses don\'t bother me' }
    ]
  },
  {
    id: 'atr_6',
    question: 'Which portfolio would you prefer?',
    options: [
      { value: 1, label: 'Best case +5%, Worst case -2%' },
      { value: 2, label: 'Best case +15%, Worst case -10%' },
      { value: 3, label: 'Best case +25%, Worst case -15%' },
      { value: 4, label: 'Best case +40%, Worst case -25%' }
    ]
  }
]

// CFL Questions
const CFL_QUESTIONS = [
  {
    id: 'cfl_1',
    question: 'How many months of expenses do you have in easily accessible savings?',
    options: [
      { value: 1, label: 'Less than 3 months' },
      { value: 2, label: '3-6 months' },
      { value: 3, label: '6-12 months' },
      { value: 4, label: 'More than 12 months' }
    ]
  },
  {
    id: 'cfl_2',
    question: 'What percentage of your total wealth will this investment represent?',
    options: [
      { value: 1, label: 'More than 50%' },
      { value: 2, label: '25-50%' },
      { value: 3, label: '10-25%' },
      { value: 4, label: 'Less than 10%' }
    ]
  },
  {
    id: 'cfl_3',
    question: 'Do you have other sources of income besides employment?',
    options: [
      { value: 1, label: 'No, my job is my only income source' },
      { value: 2, label: 'Limited - some savings interest or dividends' },
      { value: 3, label: 'Moderate - rental income or pension' },
      { value: 4, label: 'Substantial - multiple income streams' }
    ]
  },
  {
    id: 'cfl_4',
    question: 'How secure is your current employment/income?',
    options: [
      { value: 1, label: 'Uncertain - job security is a concern' },
      { value: 2, label: 'Reasonably secure' },
      { value: 3, label: 'Very secure - stable employment' },
      { value: 4, label: 'Extremely secure - guaranteed income or retired with pension' }
    ]
  },
  {
    id: 'cfl_5',
    question: 'If you lost 25% of this investment, how would it affect your lifestyle?',
    options: [
      { value: 1, label: 'Severely - I would struggle to pay bills' },
      { value: 2, label: 'Significantly - I would need to cut back substantially' },
      { value: 3, label: 'Moderately - some adjustments needed' },
      { value: 4, label: 'Minimally - it wouldn\'t affect my day-to-day life' }
    ]
  }
]

// Investor Persona Questions
const INVESTOR_PERSONA_QUESTIONS = [
  {
    id: 'ip_1',
    question: 'What is your primary investment objective?',
    options: [
      { value: 'preservation', label: 'Capital preservation - protect what I have' },
      { value: 'income', label: 'Regular income - steady cash flow' },
      { value: 'growth', label: 'Capital growth - increase my wealth over time' },
      { value: 'aggressive', label: 'Maximum growth - willing to take significant risks' }
    ]
  },
  {
    id: 'ip_2',
    question: 'How do you typically make important financial decisions?',
    options: [
      { value: 'cautious', label: 'Very carefully - I research extensively and take my time' },
      { value: 'balanced', label: 'I gather information but also trust my instincts' },
      { value: 'intuitive', label: 'I rely heavily on gut feelings and quick decisions' },
      { value: 'delegator', label: 'I prefer to delegate to professionals' }
    ]
  },
  {
    id: 'ip_3',
    question: 'How important is it for you to understand every investment in your portfolio?',
    options: [
      { value: 'essential', label: 'Essential - I need to fully understand before investing' },
      { value: 'important', label: 'Important - I like to understand the basics' },
      { value: 'moderate', label: 'Somewhat important - I trust my advisor\'s recommendations' },
      { value: 'minimal', label: 'Not important - I prefer to leave it to the experts' }
    ]
  },
  {
    id: 'ip_4',
    question: 'How would you describe your approach to financial planning?',
    options: [
      { value: 'meticulous', label: 'Meticulous - detailed budgets and financial tracking' },
      { value: 'planned', label: 'Planned - I have goals but flexible with details' },
      { value: 'reactive', label: 'Reactive - I deal with things as they come up' },
      { value: 'spontaneous', label: 'Spontaneous - I don\'t like to plan too far ahead' }
    ]
  },
  {
    id: 'ip_5',
    question: 'What matters most to you when choosing investments?',
    options: [
      { value: 'security', label: 'Security and stability' },
      { value: 'track_record', label: 'Proven track record and reputation' },
      { value: 'potential', label: 'Growth potential and opportunities' },
      { value: 'innovation', label: 'Innovation and cutting-edge strategies' }
    ]
  },
  {
    id: 'ip_6',
    question: 'How do you feel about ethical or sustainable investments?',
    options: [
      { value: 'priority', label: 'Very important - I only want ethical investments' },
      { value: 'preference', label: 'A preference - I\'d like to consider ESG factors' },
      { value: 'neutral', label: 'Neutral - returns matter more than ethics' },
      { value: 'unconcerned', label: 'Not concerned - purely focused on financial returns' }
    ]
  },
  {
    id: 'ip_7',
    question: 'How often would you like to review your portfolio?',
    options: [
      { value: 'frequent', label: 'Frequently - at least monthly' },
      { value: 'quarterly', label: 'Quarterly - every 3 months' },
      { value: 'biannual', label: 'Twice a year' },
      { value: 'annual', label: 'Annually - once a year is enough' }
    ]
  }
]

// ==================== SCORING FUNCTIONS ====================

function calculateATRScore(responses: Record<string, number>) {
  const values = Object.values(responses)
  const total = values.reduce((sum, val) => sum + val, 0)
  const average = total / values.length
  const percentage = ((average - 1) / 3) * 100 // Convert 1-4 scale to 0-100

  let riskCategory = 'Cautious'
  if (percentage >= 75) riskCategory = 'Adventurous'
  else if (percentage >= 50) riskCategory = 'Balanced'
  else if (percentage >= 25) riskCategory = 'Moderately Cautious'

  return {
    riskScore: Math.round(percentage),
    riskCategory,
    raw: total,
    average: average.toFixed(2)
  }
}

function calculateCFLScore(responses: Record<string, number>) {
  const values = Object.values(responses)
  const total = values.reduce((sum, val) => sum + val, 0)
  const average = total / values.length
  const percentage = ((average - 1) / 3) * 100

  let capacityRating = 'Low'
  if (percentage >= 75) capacityRating = 'High'
  else if (percentage >= 50) capacityRating = 'Medium-High'
  else if (percentage >= 25) capacityRating = 'Medium-Low'

  return {
    capacityScore: Math.round(percentage),
    capacityRating,
    raw: total,
    average: average.toFixed(2)
  }
}

function calculateInvestorPersona(responses: Record<string, string>) {
  const traits: string[] = []

  // Determine persona type based on patterns
  const objective = responses['ip_1']
  const decisionStyle = responses['ip_2']
  const understanding = responses['ip_3']
  const planning = responses['ip_4']
  const priorities = responses['ip_5']

  let personaType = 'Balanced Investor'

  if (objective === 'preservation' || priorities === 'security') {
    personaType = 'Cautious Guardian'
    traits.push('Risk-averse', 'Security-focused')
  } else if (objective === 'aggressive' || priorities === 'innovation') {
    personaType = 'Growth Seeker'
    traits.push('Opportunity-focused', 'Risk-tolerant')
  } else if (objective === 'income') {
    personaType = 'Income Focused'
    traits.push('Stability-seeking', 'Income-oriented')
  }

  if (decisionStyle === 'cautious' || understanding === 'essential') {
    traits.push('Detail-oriented', 'Analytical')
  }
  if (decisionStyle === 'delegator') {
    traits.push('Trusts professionals', 'Hands-off approach')
  }
  if (planning === 'meticulous') {
    traits.push('Organised', 'Disciplined')
  }

  return {
    personaType,
    traits: [...new Set(traits)].slice(0, 4)
  }
}

// ==================== MAIN COMPONENT ====================

interface AssessmentInfo {
  type: string
  typeLabel: string
  clientName: string
  advisorName: string
}

export default function AssessmentFormPage({
  params
}: {
  params: { token: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})

  // Get token directly from params (Next.js 14 pattern)
  const token = params.token

  useEffect(() => {
    if (token) {
      validateAndLoad(token)
    }
  }, [token])

  const validateAndLoad = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/assessments/share/${tokenValue}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid assessment link')
        return
      }

      setAssessment(data.assessment)

      // Load saved responses from localStorage
      const saved = localStorage.getItem(`assessment_${tokenValue}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setResponses(parsed.responses || {})
          setCurrentQuestion(parsed.currentQuestion || 0)
        } catch (e) {
          // Ignore parse errors
        }
      }
    } catch (err) {
      setError('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }

  const questions = assessment?.type === 'atr'
    ? ATR_QUESTIONS
    : assessment?.type === 'cfl'
      ? CFL_QUESTIONS
      : INVESTOR_PERSONA_QUESTIONS

  const totalQuestions = questions?.length || 0
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0

  // Auto-save to localStorage
  const saveProgress = useCallback(() => {
    if (token) {
      localStorage.setItem(`assessment_${token}`, JSON.stringify({
        responses,
        currentQuestion
      }))
    }
  }, [token, responses, currentQuestion])

  useEffect(() => {
    saveProgress()
  }, [saveProgress])

  const handleAnswer = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!token || !assessment) return

    setSubmitting(true)
    try {
      // Calculate scores based on assessment type
      let scores: any = {}
      let summary = ''

      if (assessment.type === 'atr') {
        scores = calculateATRScore(responses as Record<string, number>)
        summary = `Risk Category: ${scores.riskCategory} (Score: ${scores.riskScore}%)`
      } else if (assessment.type === 'cfl') {
        scores = calculateCFLScore(responses as Record<string, number>)
        summary = `Capacity Rating: ${scores.capacityRating} (Score: ${scores.capacityScore}%)`
      } else if (assessment.type === 'investor_persona') {
        scores = calculateInvestorPersona(responses as Record<string, string>)
        summary = `Persona: ${scores.personaType}`
      }

      const response = await fetch(`/api/assessments/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          scores,
          summary
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit assessment')
      }

      // Clear saved progress
      localStorage.removeItem(`assessment_${token}`)

      // Redirect to completion page
      router.push(`/client/assessment/${token}/complete`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment')
    } finally {
      setSubmitting(false)
    }
  }

  const currentQ = questions?.[currentQuestion]
  const isAnswered = currentQ && responses[currentQ.id] !== undefined
  const allAnswered = questions?.every(q => responses[q.id] !== undefined)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading assessment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessment || !currentQ) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{assessment.typeLabel}</h1>
          <p className="text-gray-600">For {assessment.clientName}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {totalQuestions}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              {currentQ.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(currentQ.id, option.value)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    responses[currentQ.id] === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      responses[currentQ.id] === option.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {responses[currentQ.id] === option.value && (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {currentQuestion < totalQuestions - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!isAnswered}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Assessment
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Question dots indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {questions.map((q, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentQuestion
                  ? 'bg-blue-600 w-6'
                  : responses[q.id] !== undefined
                    ? 'bg-green-500'
                    : 'bg-gray-300'
              }`}
              title={`Question ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
