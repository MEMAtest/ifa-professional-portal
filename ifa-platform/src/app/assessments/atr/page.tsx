// ================================================================
// File: ifa-platform/src/app/assessments/atr/page.tsx
// Updated ATR Assessment with Client Integration
// ================================================================

'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Brain,
  Target,
  RefreshCw,
  FileText,
  Save,
  User,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================================
// ATR QUESTIONS DATA
// ================================================================

interface ATRQuestion {
  id: string
  text: string
  options: string[]
  scores: number[]
  category: 'attitude' | 'experience' | 'knowledge' | 'emotional'
  weight: number
}

const atrQuestions: ATRQuestion[] = [
  {
    id: 'atr_1',
    text: 'How would you describe your investment experience?',
    options: [
      'No prior investment experience',
      'Limited experience with basic investments',
      'Moderate experience with various investments',
      'Extensive experience with complex investments',
      'Professional investment experience'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'experience',
    weight: 1.2
  },
  {
    id: 'atr_2',
    text: 'If your investment portfolio lost 20% of its value in one month, what would you do?',
    options: [
      'Sell immediately to avoid further losses',
      'Sell some investments to reduce risk',
      'Hold and wait for recovery',
      'Buy more while prices are lower',
      'Invest significantly more at lower prices'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'emotional',
    weight: 1.5
  },
  {
    id: 'atr_3',
    text: 'What is your primary investment objective?',
    options: [
      'Capital preservation - avoid losses',
      'Income generation with modest growth',
      'Balanced growth and income',
      'Long-term capital growth',
      'Maximum capital appreciation'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.3
  },
  {
    id: 'atr_4',
    text: 'Over what time period do you expect to invest?',
    options: [
      'Less than 2 years',
      '2-5 years',
      '5-10 years',
      '10-20 years',
      'More than 20 years'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.1
  },
  {
    id: 'atr_5',
    text: 'How important is it to have access to your investments quickly?',
    options: [
      'Very important - need immediate access',
      'Somewhat important - access within weeks',
      'Moderately important - access within months',
      'Not very important - can wait years',
      'Not important - long-term investment'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.0
  },
  {
    id: 'atr_6',
    text: 'Which statement best describes your attitude to investment risk?',
    options: [
      'I prefer certainty and will accept lower returns',
      'I will accept small fluctuations for modest returns',
      'I will accept moderate volatility for reasonable returns',
      'I will accept high volatility for potentially higher returns',
      'I actively seek high-risk, high-reward opportunities'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.4
  },
  {
    id: 'atr_7',
    text: 'How would you feel if your investments fluctuated significantly in value?',
    options: [
      'Very uncomfortable - would lose sleep',
      'Uncomfortable but could tolerate short-term',
      'Neutral - understand it is normal',
      'Comfortable - focus on long-term goals',
      'Excited - see it as opportunity'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'emotional',
    weight: 1.3
  },
  {
    id: 'atr_8',
    text: 'What percentage of your investment portfolio would you be comfortable placing in higher-risk investments?',
    options: [
      '0% - I want guaranteed returns',
      '1-20% - Very small allocation',
      '21-40% - Moderate allocation',
      '41-60% - Significant allocation',
      '61-100% - Majority or all'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.2
  }
]

// ================================================================
// ATR SCORING LOGIC
// ================================================================

interface ATRResult {
  totalScore: number
  riskLevel: number
  riskCategory: string
  description: string
  recommendations: string[]
  categoryScores: {
    attitude: number
    experience: number
    knowledge: number
    emotional: number
  }
}

const calculateATRScore = (answers: { [questionId: string]: number }): ATRResult => {
  let weightedScore = 0
  let totalWeight = 0
  const categoryScores = {
    attitude: 0,
    experience: 0,
    knowledge: 0,
    emotional: 0
  }
  const categoryWeights = {
    attitude: 0,
    experience: 0,
    knowledge: 0,
    emotional: 0
  }

  // Calculate weighted scores
  atrQuestions.forEach(question => {
    const answerIndex = answers[question.id]
    if (answerIndex !== undefined) {
      const score = question.scores[answerIndex]
      const weightedQuestionScore = score * question.weight
      
      weightedScore += weightedQuestionScore
      totalWeight += question.weight
      
      categoryScores[question.category] += weightedQuestionScore
      categoryWeights[question.category] += question.weight
    }
  })

  // Normalize scores
  const totalScore = totalWeight > 0 ? (weightedScore / totalWeight) * 20 : 0 // Scale to 0-100
  
  // Normalize category scores
  Object.keys(categoryScores).forEach(category => {
    const cat = category as keyof typeof categoryScores
    if (categoryWeights[cat] > 0) {
      categoryScores[cat] = (categoryScores[cat] / categoryWeights[cat]) * 20
    }
  })

  // Determine risk level (1-5)
  let riskLevel: number
  let riskCategory: string
  let description: string
  let recommendations: string[] = []

  if (totalScore >= 80) {
    riskLevel = 5
    riskCategory = 'Very High'
    description = 'You have a very high tolerance for risk and volatility'
    recommendations = [
      'You are comfortable with aggressive growth strategies',
      'High-risk, high-reward investments align with your profile',
      'You can tolerate significant portfolio volatility',
      'Consider emerging markets and growth stocks'
    ]
  } else if (totalScore >= 65) {
    riskLevel = 4
    riskCategory = 'High'
    description = 'You have a high tolerance for risk with growth focus'
    recommendations = [
      'Growth-oriented portfolios suit your risk tolerance',
      'You can accept above-average volatility',
      'Consider a mix of growth stocks and some stability',
      'International diversification may enhance returns'
    ]
  } else if (totalScore >= 45) {
    riskLevel = 3
    riskCategory = 'Medium'
    description = 'You have a moderate risk tolerance seeking balance'
    recommendations = [
      'Balanced portfolios align with your risk profile',
      'Mix of growth and income investments recommended',
      'Diversification across asset classes is important',
      'Consider 60/40 stocks to bonds allocation'
    ]
  } else if (totalScore >= 25) {
    riskLevel = 2
    riskCategory = 'Low'
    description = 'You have a low risk tolerance preferring stability'
    recommendations = [
      'Conservative investments suit your profile',
      'Focus on capital preservation with modest growth',
      'High-quality bonds and dividend stocks recommended',
      'Limit exposure to volatile investments'
    ]
  } else {
    riskLevel = 1
    riskCategory = 'Very Low'
    description = 'You have a very low risk tolerance prioritizing security'
    recommendations = [
      'Capital preservation is your primary objective',
      'Focus on guaranteed and low-risk investments',
      'Government bonds and savings accounts suitable',
      'Avoid volatile or speculative investments'
    ]
  }

  return {
    totalScore,
    riskLevel,
    riskCategory,
    description,
    recommendations,
    categoryScores
  }
}

// ================================================================
// UPDATED ATR ASSESSMENT COMPONENT
// ================================================================

export default function ATRAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams?.get('clientId') || null
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({})
  const [isComplete, setIsComplete] = useState(false)
  const [atrResult, setATRResult] = useState<ATRResult | null>(null)
  const [clientName, setClientName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load client info if clientId provided
  useEffect(() => {
    if (clientId) {
      loadClientInfo()
    }
  }, [clientId])

  const loadClientInfo = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      if (response.ok) {
        const data = await response.json()
        const client = data.client
        setClientName(`${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim())
      }
    } catch (error) {
      console.error('Error loading client:', error)
    }
  }

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const nextQuestion = () => {
    if (currentQuestion < atrQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      const result = calculateATRScore(answers)
      setATRResult(result)
      setIsComplete(true)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const resetAssessment = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setIsComplete(false)
    setATRResult(null)
    setSaveError(null)
  }

  const saveAssessment = async () => {
    if (!clientId || !atrResult) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/assessments/atr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          answers,
          score: atrResult.totalScore,
          category: atrResult.riskCategory,
          level: atrResult.riskLevel,
          categoryScores: atrResult.categoryScores,
          recommendations: atrResult.recommendations
        }),
      })

      if (response.ok) {
        // Redirect back to client profile risk tab
        router.push(`/clients/${clientId}?tab=risk`)
      } else {
        throw new Error('Failed to save assessment')
      }
    } catch (error) {
      console.error('Error saving assessment:', error)
      setSaveError('Failed to save assessment. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const progress = ((currentQuestion + 1) / atrQuestions.length) * 100
  const currentQuestionData = atrQuestions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id]

  if (isComplete && atrResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with client info */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Attitude to Risk Result</h1>
          {clientName && (
            <div className="flex items-center justify-center text-gray-600 mb-2">
              <User className="h-4 w-4 mr-2" />
              <span>Assessment for: {clientName}</span>
            </div>
          )}
          <p className="text-gray-600">Your psychological comfort with investment volatility</p>
        </div>

        {/* ATR Result */}
        <Card className="overflow-hidden">
          <CardHeader className={cn(
            "text-center",
            atrResult.riskLevel === 5 ? 'bg-purple-50' :
            atrResult.riskLevel === 4 ? 'bg-blue-50' :
            atrResult.riskLevel === 3 ? 'bg-green-50' :
            atrResult.riskLevel === 2 ? 'bg-yellow-50' : 'bg-orange-50'
          )}>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className={cn(
                "h-12 w-12",
                atrResult.riskLevel === 5 ? 'text-purple-600' :
                atrResult.riskLevel === 4 ? 'text-blue-600' :
                atrResult.riskLevel === 3 ? 'text-green-600' :
                atrResult.riskLevel === 2 ? 'text-yellow-600' : 'text-orange-600'
              )} />
              <div>
                <h2 className="text-4xl font-bold">{atrResult.riskCategory}</h2>
                <p className="text-lg">Risk Tolerance</p>
              </div>
            </div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">{atrResult.description}</p>
          </CardHeader>

          <CardContent className="p-8">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                  <p className="text-2xl font-bold text-blue-600">{atrResult.totalScore.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Attitude</p>
                  <p className="text-2xl font-bold text-green-600">{atrResult.categoryScores.attitude.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Experience</p>
                  <p className="text-2xl font-bold text-purple-600">{atrResult.categoryScores.experience.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Emotional</p>
                  <p className="text-2xl font-bold text-orange-600">{atrResult.categoryScores.emotional.toFixed(1)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Risk Level Indicator */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Risk Level</h3>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "flex-1 h-8 rounded-lg flex items-center justify-center font-semibold",
                      level <= atrResult.riskLevel
                        ? level === 1 ? 'bg-orange-500 text-white' :
                          level === 2 ? 'bg-yellow-500 text-white' :
                          level === 3 ? 'bg-green-500 text-white' :
                          level === 4 ? 'bg-blue-500 text-white' :
                          'bg-purple-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    )}
                  >
                    {level}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Very Low</span>
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
                <span>Very High</span>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Investment Recommendations
              </h3>
              <div className="space-y-3">
                {atrResult.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {clientId ? (
                <>
                  <Button 
                    onClick={saveAssessment} 
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Assessment & Return to Client
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetAssessment}
                    className="flex-1"
                    disabled={isSaving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retake Assessment
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={resetAssessment}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retake Assessment
                </Button>
              )}
            </div>

            {saveError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{saveError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Question display
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Attitude to Risk Assessment</h1>
        {clientName && (
          <div className="flex items-center justify-center text-gray-600 mb-2">
            <User className="h-4 w-4 mr-2" />
            <span>Assessment for: {clientName}</span>
          </div>
        )}
        <p className="text-gray-600">Evaluating your psychological comfort with investment volatility</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Question {currentQuestion + 1} of {atrQuestions.length}</span>
            <span className="text-sm font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
              <span className="font-bold">{currentQuestion + 1}</span>
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{currentQuestionData.text}</CardTitle>
              <Badge variant="secondary" className="mt-2">
                {currentQuestionData.category}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Category Info */}
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">
                This question assesses your {currentQuestionData.category} aspect of risk tolerance.
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestionData.options.map((option, index) => (
                <label
                  key={index}
                  className={cn(
                    "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                    currentAnswer === index
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name={currentQuestionData.id}
                    value={index}
                    checked={currentAnswer === index}
                    onChange={() => handleAnswer(currentQuestionData.id, index)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 mr-3",
                    currentAnswer === index
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  )}>
                    {currentAnswer === index && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={nextQuestion}
              disabled={currentAnswer === undefined}
            >
              {currentQuestion === atrQuestions.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}