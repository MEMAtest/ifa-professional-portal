// ================================================================
// FIXED ATR PAGE - Complete working version
// File: ifa-platform/src/app/assessments/atr/page.tsx
// ================================================================

'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { FileText, ChevronLeft, ChevronRight, Save } from 'lucide-react'

// Import local components and data
import { QuestionCard } from '@/components/assessment/QuestionCard'
import { RiskProfileSummary } from '@/components/assessment/RiskProfileSummary'
import { atrQuestions } from '@/data/atrQuestions'
import { AssessmentService } from '@/services/AssessmentService'

interface ATRAnswers {
  [questionId: string]: number
}

interface RiskMetrics {
  atrScore: number
  atrCategory: string
  behavioralBias: 'conservative' | 'neutral' | 'aggressive'
  finalRiskProfile: number
  confidenceLevel: number
}

export default function ATRAssessmentPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<ATRAnswers>({})
  const [isComplete, setIsComplete] = useState(false)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)

  const handleAnswer = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer as number }))
  }

  const nextQuestion = () => {
    if (currentQuestion < atrQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      completeAssessment()
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const completeAssessment = () => {
    const metrics = AssessmentService.calculateRiskMetrics(answers, {})
    setRiskMetrics(metrics)
    setIsComplete(true)
  }

  const progress = ((currentQuestion + 1) / atrQuestions.length) * 100
  const currentQuestionData = atrQuestions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id]

  if (isComplete && riskMetrics) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Complete</h1>
          <p className="text-gray-600">Your risk profile has been calculated</p>
        </div>

        <RiskProfileSummary riskMetrics={riskMetrics} />

        <div className="flex justify-center space-x-4">
          <Button onClick={() => window.print()} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button onClick={() => {
            setIsComplete(false)
            setCurrentQuestion(0)
            setAnswers({})
            setRiskMetrics(null)
          }}>
            Start New Assessment
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Attitude to Risk Assessment</h1>
        <p className="text-gray-600">Please answer all questions to determine your risk profile</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Question {currentQuestion + 1} of {atrQuestions.length}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>

      {/* Question */}
      {currentQuestionData && (
        <QuestionCard
          question={currentQuestionData}
          selectedAnswer={currentAnswer}
          onAnswerSelect={handleAnswer}
          showCategory
        />
      )}

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {Object.keys(answers).length} of {atrQuestions.length} questions answered
              </p>
            </div>

            <Button
              onClick={nextQuestion}
              disabled={currentAnswer === undefined}
            >
              {currentQuestion === atrQuestions.length - 1 ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Complete Assessment
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
