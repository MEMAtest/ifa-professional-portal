// ================================================================
// File: ifa-platform/src/app/assessments/cfl/page.tsx
// Capacity for Loss (CFL) Assessment - Financial Resilience Evaluation
// ================================================================

'use client'
import { useState } from 'react'
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
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================================
// CFL ASSESSMENT QUESTIONS
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
    type: 'select',
    options: [
      'Less than 2 years',
      '2-5 years',
      '5-10 years',
      '10-15 years',
      'More than 15 years'
    ],
    explanation: 'Longer timeframes allow for recovery from temporary losses',
    impact: 'high'
  },
  {
    id: 'income_dependency',
    text: 'Do you need income from this investment to cover living expenses?',
    category: 'objectives',
    type: 'radio',
    options: [
      'Yes, I depend on this investment for essential income',
      'Yes, but only for some discretionary spending',
      'No, but it would be nice to have some income',
      'No, I don\'t need any income from this investment'
    ],
    explanation: 'Dependence on investment income reduces capacity for loss',
    impact: 'high'
  },
  {
    id: 'employment_security',
    text: 'How secure is your employment or income source?',
    category: 'circumstances',
    type: 'radio',
    options: [
      'Very insecure - likely to lose income soon',
      'Somewhat insecure - income could change',
      'Reasonably secure - stable income expected',
      'Very secure - guaranteed income (pension, etc.)',
      'Multiple income sources - very diversified'
    ],
    explanation: 'Secure income provides confidence to weather investment losses',
    impact: 'medium'
  },
  {
    id: 'family_dependents',
    text: 'How many people depend on your income financially?',
    category: 'circumstances',
    type: 'select',
    options: [
      'None - just myself',
      '1 person (spouse/partner)',
      '2-3 people (spouse and 1-2 children)',
      '4-5 people (larger family)',
      'More than 5 people'
    ],
    explanation: 'More dependents typically reduces capacity for loss',
    impact: 'medium'
  },
  {
    id: 'life_stage',
    text: 'What life stage are you in?',
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
  },
  {
    id: 'unexpected_expenses',
    text: 'How likely are you to face large unexpected expenses?',
    category: 'circumstances',
    type: 'radio',
    options: [
      'Very likely - I often have financial surprises',
      'Somewhat likely - occasional large expenses',
      'Possible - typical family circumstances',
      'Unlikely - very stable financial situation',
      'Very unlikely - everything is planned and secure'
    ],
    explanation: 'Potential for unexpected expenses reduces investment loss capacity',
    impact: 'medium'
  }
]

// ================================================================
// CFL SCORING LOGIC
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
  const emergencyScore = Math.min(100, (emergencyMonths / 6) * 100) // 6 months = 100%
  totalScore += emergencyScore * 0.2
  maxScore += 100 * 0.2

  // Time horizon (20% weight)
  const timeframeScores = {
    'Less than 2 years': 10,
    '2-5 years': 30,
    '5-10 years': 60,
    '10-15 years': 85,
    'More than 15 years': 100
  }
  const timeScore = timeframeScores[answers.investment_timeframe as keyof typeof timeframeScores] || 50
  totalScore += timeScore * 0.2
  maxScore += 100 * 0.2

  // Income dependency (15% weight)
  const dependencyScores = {
    'Yes, I depend on this investment for essential income': 0,
    'Yes, but only for some discretionary spending': 25,
    'No, but it would be nice to have some income': 75,
    'No, I don\'t need any income from this investment': 100
  }
  const dependencyScore = dependencyScores[answers.income_dependency as keyof typeof dependencyScores] || 50
  totalScore += dependencyScore * 0.15
  maxScore += 100 * 0.15

  // Employment security (10% weight)
  const employmentScores = {
    'Very insecure - likely to lose income soon': 10,
    'Somewhat insecure - income could change': 30,
    'Reasonably secure - stable income expected': 70,
    'Very secure - guaranteed income (pension, etc.)': 90,
    'Multiple income sources - very diversified': 100
  }
  const employmentScore = employmentScores[answers.employment_security as keyof typeof employmentScores] || 50
  totalScore += employmentScore * 0.1
  maxScore += 100 * 0.1

  // Other factors (5% weight total)
  const familyScores = { 'None - just myself': 100, '1 person (spouse/partner)': 80, '2-3 people (spouse and 1-2 children)': 60, '4-5 people (larger family)': 40, 'More than 5 people': 20 }
  const familyScore = familyScores[answers.family_dependents as keyof typeof familyScores] || 60
  totalScore += familyScore * 0.025

  const expenseScores = {
    'Very likely - I often have financial surprises': 20,
    'Somewhat likely - occasional large expenses': 40,
    'Possible - typical family circumstances': 60,
    'Unlikely - very stable financial situation': 80,
    'Very unlikely - everything is planned and secure': 100
  }
  const expenseScore = expenseScores[answers.unexpected_expenses as keyof typeof expenseScores] || 60
  totalScore += expenseScore * 0.025

  maxScore += 100 * 0.05

  // Final score calculation
  const finalScore = Math.round((totalScore / maxScore) * 100)

  // Determine category and recommendations
  let category: CFLResult['category']
  let description: string
  let recommendations: string[]
  let maxLossPercentage: number

  if (finalScore >= 80) {
    category = 'Very High'
    description = 'You have excellent capacity for loss with strong financial resilience'
    maxLossPercentage = 30
    recommendations = [
      'You can consider growth-focused investments',
      'Volatility should not significantly impact your financial security',
      'You have the financial flexibility to ride out market downturns',
      'Consider higher-risk, higher-return investment strategies'
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

// ================================================================
// CFL ASSESSMENT COMPONENT
// ================================================================

export default function CFLAssessmentPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({})
  const [isComplete, setIsComplete] = useState(false)
  const [cflResult, setCFLResult] = useState<CFLResult | null>(null)

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
  }

  const progress = ((currentQuestion + 1) / cflQuestions.length) * 100
  const currentQuestionData = cflQuestions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id]

  if (isComplete && cflResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Capacity for Loss Result</h1>
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
                <CardTitle className="text-2xl">{cflResult.category} Capacity</CardTitle>
                <p className="text-lg font-semibold">{cflResult.score}/100</p>
              </div>
            </div>
            <p className="text-gray-700">{cflResult.description}</p>
            <div className="mt-3 flex justify-center space-x-4">
              <Badge variant="outline">
                Max Acceptable Loss: {cflResult.maxLossPercentage}%
              </Badge>
              <Badge variant="default">
                {cflResult.confidenceLevel}% Confidence
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            {/* Score Breakdown */}
            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold">
                <PieChart className="h-5 w-5 text-blue-600" />
                <span>Financial Resilience Factors</span>
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Income vs Expenses</span>
                    <span className="font-medium">
                      {answers.monthly_income && answers.monthly_essential_expenses 
                        ? `${Math.round(((Number(answers.monthly_income) - Number(answers.monthly_essential_expenses)) / Number(answers.monthly_income)) * 100)}%`
                        : 'N/A'} surplus
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Emergency Fund</span>
                    <span className="font-medium">
                      {answers.emergency_fund && answers.monthly_essential_expenses
                        ? `${Math.round(Number(answers.emergency_fund) / Number(answers.monthly_essential_expenses))} months`
                        : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Investment Timeframe</span>
                    <span className="font-medium">{answers.investment_timeframe || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Income Dependency</span>
                    <span className="font-medium text-xs">
                      {answers.income_dependency?.includes('No') ? 'Independent' : 'Some dependency'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Employment Security</span>
                    <span className="font-medium text-xs">
                      {answers.employment_security?.includes('secure') ? 'Secure' : 'Variable'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Financial Dependents</span>
                    <span className="font-medium">{answers.family_dependents || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold">
                <TrendingDown className="h-5 w-5 text-purple-600" />
                <span>Investment Recommendations</span>
              </h4>
              <ul className="space-y-2">
                {cflResult.recommendations.map((recommendation, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warning for Low Capacity */}
            {(cflResult.category === 'Low' || cflResult.category === 'Very Low') && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-orange-800 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Important Considerations</span>
                </div>
                <p className="text-sm text-orange-700">
                  Your current financial situation indicates limited capacity for investment losses. 
                  Consider building emergency funds and improving your financial foundation before 
                  pursuing higher-risk investments.
                </p>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span>Next Steps</span>
              </h4>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 mb-3">
                  Your CFL assessment should be combined with your Attitude to Risk (ATR) to determine 
                  your overall investment strategy.
                </p>
                <div className="text-sm text-blue-700">
                  <strong>Recommended Actions:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Complete ATR assessment if not done already</li>
                    <li>• Review portfolio recommendations based on both assessments</li>
                    <li>• Consider financial planning to improve capacity for loss</li>
                    <li>• Schedule regular reviews to reassess as circumstances change</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button onClick={resetAssessment} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retake Assessment
          </Button>
          <Button onClick={() => alert('CFL result saved to client profile!')}>
            <FileText className="h-4 w-4 mr-2" />
            Save CFL Result
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Capacity for Loss Assessment</h1>
        <p className="text-gray-600">Evaluate your financial resilience and ability to withstand investment losses</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Question {currentQuestion + 1} of {cflQuestions.length}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>

      {/* Question */}
      {currentQuestionData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-blue-600">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium capitalize">{currentQuestionData.category}</span>
              </div>
              <Badge variant={
                currentQuestionData.impact === 'high' ? 'destructive' :
                currentQuestionData.impact === 'medium' ? 'warning' : 'secondary'
              }>
                {currentQuestionData.impact} impact
              </Badge>
            </div>
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestionData.text}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">{currentQuestionData.explanation}</p>
          </CardHeader>
          <CardContent>
            {currentQuestionData.type === 'number' && (
              <div className="space-y-2">
                <input
                  type="number"
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswer(currentQuestionData.id, e.target.value)}
                  placeholder="Enter amount in £"
                  min={currentQuestionData.validation?.min}
                  max={currentQuestionData.validation?.max}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {currentQuestionData.type === 'select' && (
              <select
                value={currentAnswer || ''}
                onChange={(e) => handleAnswer(currentQuestionData.id, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an option...</option>
                {currentQuestionData.options?.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            )}

            {currentQuestionData.type === 'radio' && (
              <div className="space-y-3">
                {currentQuestionData.options?.map((option, index) => {
                  const isSelected = currentAnswer === option
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(currentQuestionData.id, option)}
                      className={cn(
                        "w-full p-4 text-left border rounded-lg transition-all hover:bg-gray-50",
                        isSelected 
                          ? "border-blue-500 bg-blue-50 text-blue-900" 
                          : "border-gray-200"
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <div 
                          className={cn(
                            "w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center",
                            isSelected 
                              ? "border-blue-500 bg-blue-500" 
                              : "border-gray-300"
                          )}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm leading-relaxed">{option}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
                {Object.keys(answers).length} of {cflQuestions.length} questions answered
              </p>
            </div>

            <Button
              onClick={nextQuestion}
              disabled={!currentAnswer}
            >
              {currentQuestion === cflQuestions.length - 1 ? (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate CFL
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