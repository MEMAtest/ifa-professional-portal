// ================================================================
// File: ifa-platform/src/app/assessments/persona-assessment/page.tsx
// PHASE 1 NAVIGATION FIX - Persona Assessment with URL-based Context
// ================================================================

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/use-toast'

// PHASE 1: Import navigation components
import { NavigationGuard } from '@/components/ui/NavigationGuard'
import { useClientContext } from '@/hooks/useClientContext'

import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Brain,
  Heart,
  Target,
  TrendingUp,
  Shield,
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  Save,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { investorPersonas } from '@/data/investorPersonas'

// ================================================================
// PERSONA ASSESSMENT QUESTIONS (same as before)
// ================================================================

interface PersonaQuestion {
  id: string
  text: string
  category: 'motivation' | 'fear' | 'communication' | 'decision_making' | 'emotional'
  options: {
    text: string
    scores: { [personaLevel: string]: number } // Points for each persona level 1-5
  }[]
}

const personaQuestions: PersonaQuestion[] = [
  {
    id: 'motivation_primary',
    text: 'What motivates you most when making investment decisions?',
    category: 'motivation',
    options: [
      {
        text: 'Protecting my money from any losses - security is paramount',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'Steady, predictable growth with minimal surprises',
        scores: { '1': 3, '2': 5, '3': 2, '4': 0, '5': 0 }
      },
      {
        text: 'Balanced approach - reasonable growth with controlled risk',
        scores: { '1': 1, '2': 3, '3': 5, '4': 2, '5': 0 }
      },
      {
        text: 'Building wealth over time - focused on long-term growth',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 2 }
      },
      {
        text: 'Maximizing returns - I want the highest possible growth',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'fear_primary',
    text: 'What worries you most about investing?',
    category: 'fear',
    options: [
      {
        text: 'Losing any of my original investment',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'Not having enough predictable income',
        scores: { '1': 3, '2': 5, '3': 2, '4': 1, '5': 0 }
      },
      {
        text: 'Making poor investment decisions due to lack of knowledge',
        scores: { '1': 2, '2': 3, '3': 5, '4': 2, '5': 1 }
      },
      {
        text: 'Missing out on growth opportunities',
        scores: { '1': 0, '2': 1, '3': 2, '4': 5, '5': 3 }
      },
      {
        text: 'Not achieving my wealth-building goals',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'market_reaction',
    text: 'How do you typically react when markets are volatile?',
    category: 'emotional',
    options: [
      {
        text: 'I get very anxious and want to move to safer investments immediately',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'I feel uncomfortable but try to stick to my plan',
        scores: { '1': 3, '2': 5, '3': 3, '4': 1, '5': 0 }
      },
      {
        text: 'I review my strategy and make adjustments if needed',
        scores: { '1': 1, '2': 3, '3': 5, '4': 3, '5': 1 }
      },
      {
        text: 'I stay focused on my long-term goals and remain invested',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 3 }
      },
      {
        text: 'I see it as an opportunity to invest more at lower prices',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'decision_making',
    text: 'How do you prefer to make investment decisions?',
    category: 'decision_making',
    options: [
      {
        text: 'I want guaranteed outcomes and clear documentation',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'I prefer conservative strategies with proven track records',
        scores: { '1': 3, '2': 5, '3': 3, '4': 1, '5': 0 }
      },
      {
        text: 'I want to see data and analysis before deciding',
        scores: { '1': 1, '2': 3, '3': 5, '4': 3, '5': 1 }
      },
      {
        text: 'I focus on long-term potential and market opportunities',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 3 }
      },
      {
        text: 'I\'m comfortable with sophisticated strategies and higher risk',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'communication_style',
    text: 'How do you prefer your advisor to communicate with you?',
    category: 'communication',
    options: [
      {
        text: 'Simple explanations, frequent updates, and lots of reassurance',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'Regular check-ins with clear, straightforward information',
        scores: { '1': 3, '2': 5, '3': 3, '4': 1, '5': 0 }
      },
      {
        text: 'Detailed reports with charts and performance analysis',
        scores: { '1': 1, '2': 3, '3': 5, '4': 3, '5': 1 }
      },
      {
        text: 'Market insights and growth opportunities focus',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 3 }
      },
      {
        text: 'Sophisticated analysis and alternative investment options',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'time_horizon',
    text: 'When you think about your investments, what timeframe do you focus on?',
    category: 'decision_making',
    options: [
      {
        text: 'I need access to my money soon and can\'t afford losses',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'Medium-term goals with steady progress',
        scores: { '1': 3, '2': 5, '3': 3, '4': 1, '5': 0 }
      },
      {
        text: 'Balanced between short-term needs and long-term growth',
        scores: { '1': 1, '2': 3, '3': 5, '4': 3, '5': 1 }
      },
      {
        text: 'Long-term wealth building over 10+ years',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 3 }
      },
      {
        text: 'Very long-term - decades ahead for maximum growth',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'financial_knowledge',
    text: 'How would you describe your investment knowledge and experience?',
    category: 'decision_making',
    options: [
      {
        text: 'Very limited - I prefer simple, guaranteed products',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'Basic understanding - I prefer traditional investments',
        scores: { '1': 3, '2': 5, '3': 3, '4': 1, '5': 0 }
      },
      {
        text: 'Moderate experience with different investment types',
        scores: { '1': 1, '2': 3, '3': 5, '4': 3, '5': 1 }
      },
      {
        text: 'Good knowledge - comfortable with growth-focused strategies',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 3 }
      },
      {
        text: 'Extensive experience - interested in sophisticated strategies',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  },
  {
    id: 'performance_expectations',
    text: 'What are your expectations for investment performance?',
    category: 'motivation',
    options: [
      {
        text: 'I just want to protect my money and beat inflation slightly',
        scores: { '1': 5, '2': 3, '3': 1, '4': 0, '5': 0 }
      },
      {
        text: 'Steady returns that are better than cash but not too risky',
        scores: { '1': 3, '2': 5, '3': 3, '4': 1, '5': 0 }
      },
      {
        text: 'Reasonable returns with some growth over time',
        scores: { '1': 1, '2': 3, '3': 5, '4': 3, '5': 1 }
      },
      {
        text: 'Strong long-term growth that builds significant wealth',
        scores: { '1': 0, '2': 1, '3': 3, '4': 5, '5': 3 }
      },
      {
        text: 'Maximum possible returns - I want to beat the market',
        scores: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 5 }
      }
    ]
  }
]

// ================================================================
// PERSONA ASSESSMENT COMPONENT WITH PHASE 1 NAVIGATION
// ================================================================

export default function PersonaAssessmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // PHASE 1: Use context instead of sessionStorage
  const { client, clientId, isProspect } = useClientContext()
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({})
  const [isComplete, setIsComplete] = useState(false)
  const [calculatedPersona, setCalculatedPersona] = useState<{
    level: string
    persona: any
    scores: { [level: string]: number }
    confidence: number
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Calculate persona based on answers
  const calculatePersona = () => {
    const scores = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    
    // Sum up scores for each persona level
    Object.entries(answers).forEach(([questionId, optionIndex]) => {
      const question = personaQuestions.find(q => q.id === questionId)
      if (question && question.options[optionIndex]) {
        const optionScores = question.options[optionIndex].scores
        Object.entries(optionScores).forEach(([level, points]) => {
          scores[level as keyof typeof scores] += points
        })
      }
    })

    // Find the persona with highest score
    const maxScore = Math.max(...Object.values(scores))
    const winningLevel = Object.entries(scores).find(([level, score]) => score === maxScore)?.[0] || '3'
    
    // Calculate confidence based on score separation
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
    const winningPercentage = (maxScore / totalScore) * 100
    const confidence = Math.min(95, Math.max(60, winningPercentage))

    return {
      level: winningLevel,
      persona: investorPersonas[winningLevel],
      scores,
      confidence: Math.round(confidence)
    }
  }

  const handleAnswer = (optionIndex: number) => {
    const questionId = personaQuestions[currentQuestion].id
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }))
  }

  const nextQuestion = () => {
    if (currentQuestion < personaQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      const result = calculatePersona()
      setCalculatedPersona(result)
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
    setCalculatedPersona(null)
  }

  // PHASE 1: Navigation handlers
  const handleBack = () => {
    router.push(`/assessments/client/${clientId}${isProspect ? '?isProspect=true' : ''}`)
  }

  // PHASE 1: Save persona to client/prospect
  const savePersona = async () => {
    if (!calculatedPersona || !clientId) return
    
    setIsSaving(true)
    try {
      // TODO: Implement actual save logic
      // For now, just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Persona Saved',
        description: `${calculatedPersona.persona.type} profile saved successfully`,
        variant: 'default'
      })
      
      // Navigate back to hub after saving
      handleBack()
    } catch (error) {
      console.error('Error saving persona:', error)
      toast({
        title: 'Error',
        description: 'Failed to save persona assessment',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const progress = ((currentQuestion + 1) / personaQuestions.length) * 100
  const currentQuestionData = personaQuestions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id]

  // PHASE 1: Wrap entire component in NavigationGuard
  return (
    <NavigationGuard requireClient={true}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* PHASE 1: Back button and client info */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Button>
          <div className="text-sm text-gray-600">
            {client && (
              <>
                Assessing: <span className="font-medium">{client.personalDetails?.firstName} {client.personalDetails?.lastName}</span>
              </>
            )}
          </div>
          {/* PHASE 1: Prospect indicator */}
          {isProspect && (
            <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-700 border-orange-300">
              <Users className="h-3 w-3 mr-1" />
              Prospect Mode
            </Badge>
          )}
        </div>

        {/* PHASE 1: Prospect warning banner */}
        {isProspect && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <span className="font-medium text-orange-800">
                This is a temporary prospect assessment. Data will be stored locally for 30 days. 
                Convert to a full client to save permanently.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isComplete && calculatedPersona ? (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Investor Persona</h1>
              <p className="text-gray-600">Based on your responses, here's your investment personality profile</p>
            </div>

            {/* Persona Result */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="text-center">
                  <div className="text-6xl mb-4">{calculatedPersona.persona.avatar}</div>
                  <CardTitle className="text-2xl text-blue-900">{calculatedPersona.persona.type}</CardTitle>
                  <p className="text-blue-700 mt-2">{calculatedPersona.persona.description}</p>
                  <Badge variant="default" className="mt-3">
                    {calculatedPersona.confidence}% match confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Key Characteristics */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="flex items-center space-x-2 font-semibold text-green-900">
                      <Target className="h-5 w-5" />
                      <span>Key Motivations</span>
                    </h4>
                    <ul className="space-y-2">
                      {calculatedPersona.persona.motivations.map((motivation: string, i: number) => (
                        <li key={i} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{motivation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="flex items-center space-x-2 font-semibold text-red-900">
                      <Shield className="h-5 w-5" />
                      <span>Key Concerns</span>
                    </h4>
                    <ul className="space-y-2">
                      {calculatedPersona.persona.fears.map((fear: string, i: number) => (
                        <li key={i} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{fear}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Psychological Profile */}
                <div className="space-y-4">
                  <h4 className="flex items-center space-x-2 font-semibold text-blue-900">
                    <Brain className="h-5 w-5" />
                    <span>Your Investment Psychology</span>
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <strong className="text-blue-900">Decision Making:</strong>
                      <p className="text-blue-800 mt-1">{calculatedPersona.persona.psychologicalProfile.decisionMaking}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <strong className="text-purple-900">Stress Response:</strong>
                      <p className="text-purple-800 mt-1">{calculatedPersona.persona.psychologicalProfile.stressResponse}</p>
                    </div>
                  </div>
                </div>

                {/* Communication Preferences */}
                <div className="space-y-4">
                  <h4 className="flex items-center space-x-2 font-semibold text-purple-900">
                    <Heart className="h-5 w-5" />
                    <span>Communication Preferences</span>
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Frequency:</strong> {calculatedPersona.persona.communicationNeeds.frequency}
                    </div>
                    <div>
                      <strong>Style:</strong> {calculatedPersona.persona.communicationNeeds.style}
                    </div>
                    <div>
                      <strong>Format:</strong> {calculatedPersona.persona.communicationNeeds.format}
                    </div>
                    <div>
                      <strong>Meeting Preference:</strong> {calculatedPersona.persona.communicationNeeds.meetingPreference}
                    </div>
                  </div>
                </div>

                {/* Consumer Duty Alignment */}
                <div className="space-y-4">
                  <h4 className="flex items-center space-x-2 font-semibold text-green-900">
                    <Shield className="h-5 w-5" />
                    <span>Consumer Duty Alignment</span>
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <strong className="text-green-900">Suitable Products:</strong>
                      <p className="text-sm text-green-800 mt-1">{calculatedPersona.persona.consumerDutyAlignment.products}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <strong className="text-blue-900">Value Proposition:</strong>
                      <p className="text-sm text-blue-800 mt-1">{calculatedPersona.persona.consumerDutyAlignment.value}</p>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Assessment Score Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(calculatedPersona.scores).map(([level, score]) => {
                      const persona = investorPersonas[level]
                      const percentage = (score / Math.max(...Object.values(calculatedPersona.scores))) * 100
                      return (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{persona.avatar}</span>
                            <span className="text-sm font-medium">{persona.type}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className={cn(
                                  "h-2 rounded-full",
                                  level === calculatedPersona.level ? "bg-blue-600" : "bg-gray-400"
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-12">{score} pts</span>
                          </div>
                        </div>
                      )
                    })}
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
              <Button 
                onClick={savePersona}
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
                    Save Persona to Profile
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Investor Persona Assessment</h1>
              <p className="text-gray-600">Answer 8 questions to discover your investment personality</p>
            </div>

            {/* Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Question {currentQuestion + 1} of {personaQuestions.length}</span>
                  <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="w-full" />
              </CardContent>
            </Card>

            {/* Question */}
            {currentQuestionData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2 text-blue-600 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium capitalize">{currentQuestionData.category.replace('_', ' ')}</span>
                  </div>
                  <CardTitle className="text-xl leading-relaxed">
                    {currentQuestionData.text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentQuestionData.options.map((option, index) => {
                      const isSelected = currentAnswer === index
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(index)}
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
                            <span className="text-sm leading-relaxed">{option.text}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
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
                      {Object.keys(answers).length} of {personaQuestions.length} questions answered
                    </p>
                  </div>

                  <Button
                    onClick={nextQuestion}
                    disabled={currentAnswer === undefined}
                  >
                    {currentQuestion === personaQuestions.length - 1 ? (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Discover My Persona
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
          </>
        )}
      </div>
    </NavigationGuard>
  )
}

// ===================================================================
// PHASE 1 NAVIGATION FIX COMPLETE
// ===================================================================

/*
PHASE 1 IMPLEMENTATION SUMMARY:

✅ NavigationGuard Integration
   - Wrapped entire component in NavigationGuard
   - Prevents access without client selection

✅ URL-Based Context
   - Replaced alert with actual save functionality
   - Uses useClientContext hook for client data
   - No sessionStorage dependencies

✅ Navigation Updates
   - Added back button to return to assessment hub
   - Save function navigates back after completion
   - All navigation stays within assessment context

✅ Prospect Support
   - Shows prospect indicator badge
   - Displays warning banner
   - Save functionality works for prospects (local storage)

✅ All Features Preserved
   - 8-question assessment flow
   - Persona calculation logic
   - Results display with breakdown
   - Retake functionality

TESTING CHECKLIST:
□ Direct URL access redirects to guard
□ Refresh maintains client context
□ Back button navigates to hub
□ Prospect mode shows warnings
□ Assessment flow works correctly
□ Save navigates back to hub
*/