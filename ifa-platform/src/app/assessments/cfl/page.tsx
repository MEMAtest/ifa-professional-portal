// ================================================================
// File: ifa-platform/src/app/assessments/cfl/page.tsx
// Updated CFL Assessment with Client Integration
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
  DollarSign, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  PieChart,
  TrendingDown,
  Shield,
  RefreshCw,
  FileText,
  Save,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================================
// CFL ASSESSMENT QUESTIONS (Keep existing questions)
// ================================================================

interface CFLQuestion {
  id: string
  text: string
  category: 'financial' | 'timeframe' | 'objectives' | 'circumstances'
  type: 'radio' | 'number' | 'select'
  options?: string[]
  validation?: {
    min?: number
    max?: number
    required?: boolean
  }
  explanation: string
  impact: 'high' | 'medium' | 'low'
}

const cflQuestions: CFLQuestion[] = [
  {
    id: 'monthly_income',
    text: 'What is your total monthly income after tax?',
    category: 'financial',
    type: 'number',
    validation: { min: 0, required: true },
    explanation: 'Higher income generally indicates greater capacity to recover from losses',
    impact: 'high'
  },
  {
    id: 'monthly_essential_expenses',
    text: 'What are your essential monthly expenses (mortgage, utilities, food, etc.)?',
    category: 'financial',
    type: 'number',
    validation: { min: 0, required: true },
    explanation: 'Lower expenses relative to income indicate higher capacity for loss',
    impact: 'high'
  },
  {
    id: 'emergency_fund',
    text: 'How much do you have in emergency savings (immediately accessible)?',
    category: 'financial',
    type: 'number',
    validation: { min: 0, required: true },
    explanation: 'Emergency funds provide a buffer that increases loss capacity',
    impact: 'high'
  },
  {
    id: 'other_investments',
    text: 'What is the total value of your other investments and savings?',
    category: 'financial',
    type: 'number',
    validation: { min: 0 },
    explanation: 'Diversified wealth provides greater resilience to investment losses',
    impact: 'medium'
  },
  {
    id: 'investment_timeframe',
    text: 'How long can you leave this investment untouched?',
    category: 'timeframe',
    type: 'radio',
    options: [
      'Less than 1 year',
      '1-3 years',
      '3-5 years',
      '5-10 years',
      'More than 10 years'
    ],
    explanation: 'Longer timeframes provide more opportunity to recover from losses',
    impact: 'high'
  },
  {
    id: 'loss_impact',
    text: 'If you lost 20% of your investment, how would it affect your lifestyle?',
    category: 'financial',
    type: 'radio',
    options: [
      'Severe impact - would affect basic needs',
      'Significant impact - would need to cut back substantially',
      'Moderate impact - would need some adjustments',
      'Minor impact - would not affect lifestyle',
      'No impact - have substantial other resources'
    ],
    explanation: 'Direct measure of capacity to absorb losses',
    impact: 'high'
  },
  {
    id: 'income_stability',
    text: 'How would you describe your income stability?',
    category: 'circumstances',
    type: 'radio',
    options: [
      'Very unstable - irregular or at risk',
      'Somewhat unstable - varies significantly',
      'Moderately stable - some variation',
      'Stable - consistent and reliable',
      'Very stable - multiple secure sources'
    ],
    explanation: 'Stable income increases capacity to handle investment losses',
    impact: 'medium'
  },
  {
    id: 'future_income_expectations',
    text: 'How do you expect your income to change over the next 5 years?',
    category: 'circumstances',
    type: 'radio',
    options: [
      'Likely to decrease significantly',
      'Likely to decrease somewhat',
      'Likely to remain the same',
      'Likely to increase somewhat',
      'Likely to increase significantly'
    ],
    explanation: 'Expected income growth affects future capacity for loss',
    impact: 'medium'
  },
  {
    id: 'dependents',
    text: 'How many financial dependents do you have?',
    category: 'circumstances',
    type: 'radio',
    options: [
      'None',
      '1-2 dependents',
      '3-4 dependents',
      '5 or more dependents',
      'Extended family obligations'
    ],
    explanation: 'More dependents reduce capacity to take investment risks',
    impact: 'medium'
  },
  {
    id: 'life_stage',
    text: 'Which best describes your current life stage?',
    category: 'circumstances',
    type: 'radio',
    options: [
      'Young adult (20s-30s) - building wealth',
      'Mid-career (30s-40s) - peak earning years',
      'Pre-retirement (50s-60s) - preserving wealth',
      'Recently retired - need stability',
      'Later retirement - conservative approach'
    ],
    explanation: 'Life stage affects both time horizon and risk tolerance',
    impact: 'medium'
  }
]

// ================================================================
// CFL SCORING LOGIC (Keep existing)
// ================================================================

interface CFLResult {
  score: number
  category: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High'
  description: string
  recommendations: string[]
  maxLossPercentage: number
  confidenceLevel: number
}

const calculateCFLScore = (answers: { [questionId: string]: any }): CFLResult => {
  let totalScore = 0
  let maxScore = 0

  // Financial capacity calculation
  const monthlyIncome = Number(answers.monthly_income) || 0
  const monthlyExpenses = Number(answers.monthly_essential_expenses) || 0
  const emergencyFund = Number(answers.emergency_fund) || 0
  const otherInvestments = Number(answers.other_investments) || 0

  // Income surplus calculation (30% weight)
  const monthlySurplus = monthlyIncome - monthlyExpenses
  const surplusRatio = monthlyIncome > 0 ? (monthlySurplus / monthlyIncome) : 0
  const incomeScore = Math.min(100, Math.max(0, surplusRatio * 100))
  totalScore += incomeScore * 0.3
  maxScore += 100 * 0.3

  // Emergency fund adequacy (20% weight)
  const emergencyMonths = monthlyExpenses > 0 ? (emergencyFund / monthlyExpenses) : 0
  const emergencyScore = Math.min(100, (emergencyMonths / 6) * 100)
  totalScore += emergencyScore * 0.2
  maxScore += 100 * 0.2

  // Other investments buffer (15% weight)
  const yearlyIncome = monthlyIncome * 12
  const investmentRatio = yearlyIncome > 0 ? (otherInvestments / yearlyIncome) : 0
  const investmentScore = Math.min(100, investmentRatio * 20)
  totalScore += investmentScore * 0.15
  maxScore += 100 * 0.15

  // Time horizon score (15% weight)
  const timeframeMap: { [key: string]: number } = {
    'Less than 1 year': 20,
    '1-3 years': 40,
    '3-5 years': 60,
    '5-10 years': 80,
    'More than 10 years': 100
  }
  const timeScore = timeframeMap[answers.investment_timeframe] || 50
  totalScore += timeScore * 0.15
  maxScore += 100 * 0.15

  // Other factors (20% weight)
  const otherFactorsScore = calculateOtherFactors(answers)
  totalScore += otherFactorsScore * 0.2
  maxScore += 100 * 0.2

  // Calculate final score as percentage
  const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

  // Determine category and recommendations
  let category: CFLResult['category']
  let description: string
  let maxLossPercentage: number
  let recommendations: string[] = []

  if (finalScore >= 80) {
    category = 'Very High'
    description = 'You have excellent capacity for loss with strong financial foundations'
    maxLossPercentage = 40
    recommendations = [
      'You can comfortably withstand significant market volatility',
      'Higher-risk investments may be suitable if aligned with your goals',
      'Your strong financial buffer allows for aggressive growth strategies',
      'Consider maximizing long-term growth opportunities'
    ]
  } else if (finalScore >= 65) {
    category = 'High'
    description = 'You have good capacity for loss with solid financial foundations'
    maxLossPercentage = 25
    recommendations = [
      'You can tolerate moderate to high volatility',
      'Growth investments are suitable for your situation',
      'You have adequate financial buffers for market downturns',
      'Consider diversified growth portfolios'
    ]
  } else if (finalScore >= 45) {
    category = 'Medium'
    description = 'You have moderate capacity for loss requiring balanced approach'
    maxLossPercentage = 20
    recommendations = [
      'A balanced investment approach is most suitable',
      'Some volatility is acceptable but should be limited',
      'Focus on diversified, moderate-risk investments',
      'Ensure adequate emergency funds before investing'
    ]
  } else if (finalScore >= 25) {
    category = 'Low'
    description = 'You have limited capacity for loss requiring conservative approach'
    maxLossPercentage = 15
    recommendations = [
      'Conservative investments are most appropriate',
      'Limit exposure to volatile investments',
      'Prioritize capital preservation over growth',
      'Build emergency funds before considering higher-risk investments'
    ]
  } else {
    category = 'Very Low'
    description = 'You have very limited capacity for loss requiring maximum caution'
    maxLossPercentage = 10
    recommendations = [
      'Only very conservative investments should be considered',
      'Capital preservation must be the primary objective',
      'Avoid investments with significant downside risk',
      'Focus on building financial security before investing'
    ]
  }

  return {
    score: finalScore,
    category,
    description,
    recommendations,
    maxLossPercentage,
    confidenceLevel: 85
  }
}

function calculateOtherFactors(answers: { [key: string]: any }): number {
  let score = 50 // Base score

  // Loss impact adjustment
  const lossImpactMap: { [key: string]: number } = {
    'No impact - have substantial other resources': 100,
    'Minor impact - would not affect lifestyle': 80,
    'Moderate impact - would need some adjustments': 50,
    'Significant impact - would need to cut back substantially': 20,
    'Severe impact - would affect basic needs': 0
  }
  score = (score + (lossImpactMap[answers.loss_impact] || 50)) / 2

  // Income stability adjustment
  const stabilityMap: { [key: string]: number } = {
    'Very stable - multiple secure sources': 100,
    'Stable - consistent and reliable': 80,
    'Moderately stable - some variation': 60,
    'Somewhat unstable - varies significantly': 30,
    'Very unstable - irregular or at risk': 10
  }
  score = (score + (stabilityMap[answers.income_stability] || 50)) / 2

  // Dependents adjustment
  const dependentsMap: { [key: string]: number } = {
    'None': 100,
    '1-2 dependents': 70,
    '3-4 dependents': 40,
    '5 or more dependents': 20,
    'Extended family obligations': 10
  }
  score = (score + (dependentsMap[answers.dependents] || 50)) / 2

  return Math.max(0, Math.min(100, score))
}

// ================================================================
// UPDATED CFL ASSESSMENT COMPONENT WITH CLIENT INTEGRATION
// ================================================================

export default function CFLAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams?.get('clientId') || null
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({})
  const [isComplete, setIsComplete] = useState(false)
  const [cflResult, setCFLResult] = useState<CFLResult | null>(null)
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

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const nextQuestion = () => {
    if (currentQuestion < cflQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      const result = calculateCFLScore(answers)
      setCFLResult(result)
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
    setCFLResult(null)
    setSaveError(null)
  }

  const saveAssessment = async () => {
    if (!clientId || !cflResult) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/assessments/cfl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          answers,
          score: cflResult.score,
          category: cflResult.category,
          level: Math.round(cflResult.score / 20) || 1, // Convert to 1-5 scale
          maxLossPercentage: cflResult.maxLossPercentage,
          confidenceLevel: cflResult.confidenceLevel,
          recommendations: cflResult.recommendations,
          financialData: {
            monthlyIncome: answers.monthly_income,
            monthlyExpenses: answers.monthly_essential_expenses,
            emergencyFund: answers.emergency_fund,
            otherInvestments: answers.other_investments
          }
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

  const progress = ((currentQuestion + 1) / cflQuestions.length) * 100
  const currentQuestionData = cflQuestions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id]

  if (isComplete && cflResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with client info */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Capacity for Loss Result</h1>
          {clientName && (
            <div className="flex items-center justify-center text-gray-600 mb-2">
              <User className="h-4 w-4 mr-2" />
              <span>Assessment for: {clientName}</span>
            </div>
          )}
          <p className="text-gray-600">Based on your financial circumstances and resilience</p>
        </div>

        {/* CFL Result */}
        <Card className="overflow-hidden">
          <CardHeader className={cn(
            "text-center",
            cflResult.category === 'Very High' ? 'bg-green-50' :
            cflResult.category === 'High' ? 'bg-blue-50' :
            cflResult.category === 'Medium' ? 'bg-yellow-50' :
            cflResult.category === 'Low' ? 'bg-orange-50' : 'bg-red-50'
          )}>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className={cn(
                "h-12 w-12",
                cflResult.category === 'Very High' ? 'text-green-600' :
                cflResult.category === 'High' ? 'text-blue-600' :
                cflResult.category === 'Medium' ? 'text-yellow-600' :
                cflResult.category === 'Low' ? 'text-orange-600' : 'text-red-600'
              )} />
              <div>
                <h2 className="text-4xl font-bold">{cflResult.category}</h2>
                <p className="text-lg">Capacity for Loss</p>
              </div>
            </div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">{cflResult.description}</p>
          </CardHeader>

          <CardContent className="p-8">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <PieChart className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">CFL Score</p>
                  <p className="text-3xl font-bold text-blue-600">{cflResult.score.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Maximum Loss Tolerance</p>
                  <p className="text-3xl font-bold text-orange-600">{cflResult.maxLossPercentage}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Confidence Level</p>
                  <p className="text-3xl font-bold text-green-600">{cflResult.confidenceLevel}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Key Recommendations
              </h3>
              <div className="space-y-3">
                {cflResult.recommendations.map((rec, index) => (
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Capacity for Loss Assessment</h1>
        {clientName && (
          <div className="flex items-center justify-center text-gray-600 mb-2">
            <User className="h-4 w-4 mr-2" />
            <span>Assessment for: {clientName}</span>
          </div>
        )}
        <p className="text-gray-600">Evaluating your financial resilience and ability to absorb losses</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Question {currentQuestion + 1} of {cflQuestions.length}</span>
            <span className="text-sm font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              currentQuestionData.impact === 'high' ? 'bg-red-100' :
              currentQuestionData.impact === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
            )}>
              <span className="font-bold">{currentQuestion + 1}</span>
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{currentQuestionData.text}</CardTitle>
              <Badge 
                variant={currentQuestionData.impact === 'high' ? 'destructive' : 'secondary'}
                className="mt-2"
              >
                {currentQuestionData.impact} impact
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Explanation */}
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">{currentQuestionData.explanation}</p>
            </div>

            {/* Answer Input */}
            <div className="space-y-3">
              {currentQuestionData.type === 'radio' && currentQuestionData.options?.map((option, index) => (
                <label
                  key={index}
                  className={cn(
                    "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                    currentAnswer === option
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name={currentQuestionData.id}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => handleAnswer(currentQuestionData.id, e.target.value)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 mr-3",
                    currentAnswer === option
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  )}>
                    {currentAnswer === option && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}

              {currentQuestionData.type === 'number' && (
                <div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswer(currentQuestionData.id, e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Enter amount"
                      min={currentQuestionData.validation?.min}
                      max={currentQuestionData.validation?.max}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Enter the amount in pounds (£)
                  </p>
                </div>
              )}
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
              disabled={!currentAnswer && currentQuestionData.validation?.required}
            >
              {currentQuestion === cflQuestions.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}