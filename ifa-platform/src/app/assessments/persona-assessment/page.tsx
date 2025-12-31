// ================================================================
// File: src/app/assessments/persona-assessment/page.tsx
// FIXED VERSION - No auto-navigation, includes document generation
// ================================================================

'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/use-toast'

// Navigation components
import { NavigationGuard } from '@/components/ui/NavigationGuard'
import { useClientContext } from '@/hooks/useClientContext'

// Import document generation - ADDED
import DocumentGenerationButton from '@/components/documents/DocumentGenerationButton'

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
  AlertTriangle,
  Loader2,
  Info,
  FileText  // ADDED for document generation
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { investorPersonas } from '@/data/investorPersonas'

// ================================================================
// PERSONA ASSESSMENT QUESTIONS
// ================================================================

interface PersonaQuestion {
  id: string
  text: string
  category: 'motivation' | 'fear' | 'communication' | 'decision_making' | 'emotional'
  options: {
    text: string
    scores: { [personaLevel: string]: number }
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
// MAIN PERSONA ASSESSMENT COMPONENT
// ================================================================

export default function PersonaAssessmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  
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
  const [hasTrackedStart, setHasTrackedStart] = useState(false)
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null)
  const [showDocumentGeneration, setShowDocumentGeneration] = useState(false) // ADDED

  // Get client name for document generation
  const clientName = client ? 
    `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() : 
    ''
  const clientEmail = client?.contactInfo?.email || ''

  // Track progress
  const trackProgress = useCallback(async (status: string, percentage: number, metadata?: any) => {
    if (!clientId) return

    try {
      await fetch(`/api/assessments/progress/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentType: 'persona',
          status,
          progressPercentage: percentage,
          metadata
        })
      })
    } catch (error) {
      console.error('Error tracking progress:', error)
    }
  }, [clientId])

  // Track assessment start
  useEffect(() => {
    if (clientId && !hasTrackedStart) {
      trackProgress('in_progress', 0)
      setHasTrackedStart(true)
    }
  }, [clientId, hasTrackedStart, trackProgress])

  // Calculate persona
  const calculatePersona = () => {
    const scores = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    
    Object.entries(answers).forEach(([questionId, optionIndex]) => {
      const question = personaQuestions.find(q => q.id === questionId)
      if (question && question.options[optionIndex]) {
        const optionScores = question.options[optionIndex].scores
        Object.entries(optionScores).forEach(([level, points]) => {
          scores[level as keyof typeof scores] += points
        })
      }
    })

    const maxScore = Math.max(...Object.values(scores))
    const winningLevel = Object.entries(scores).find(([level, score]) => score === maxScore)?.[0] || '3'
    
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
    
    const answeredCount = Object.keys(answers).length + 1
    const progressPercentage = Math.round((answeredCount / personaQuestions.length) * 100)
    trackProgress('in_progress', progressPercentage)
  }

  const nextQuestion = () => {
    if (currentQuestion < personaQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      const result = calculatePersona()
      setCalculatedPersona(result)
      setIsComplete(true)
      
      trackProgress('in_progress', 100, {
        personaLevel: result.level,
        personaType: result.persona.type,
        confidence: result.confidence
      })
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
    setSavedAssessmentId(null)
    setShowDocumentGeneration(false) // ADDED
    trackProgress('in_progress', 0)
  }

  const handleBack = () => {
    router.push(`/assessments/client/${clientId}${isProspect ? '?isProspect=true' : ''}`)
  }

  // UPDATED SAVE FUNCTION - NO AUTO NAVIGATION
  const savePersona = async () => {
    if (!calculatedPersona || !clientId) {
      toast({
        title: 'Error',
        description: 'Missing required data for saving',
        variant: 'destructive'
      })
      return
    }
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/assessments/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          personaLevel: calculatedPersona.level,
          personaType: calculatedPersona.persona.type,
          scores: calculatedPersona.scores,
          confidence: calculatedPersona.confidence,
          answers: answers,
          motivations: calculatedPersona.persona.motivations,
          fears: calculatedPersona.persona.fears,
          psychologicalProfile: calculatedPersona.persona.psychologicalProfile,
          communicationNeeds: calculatedPersona.persona.communicationNeeds,
          consumerDutyAlignment: calculatedPersona.persona.consumerDutyAlignment
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save persona assessment')
      }

      const result = await response.json()
      setSavedAssessmentId(result.data?.id)
      setShowDocumentGeneration(true) // ADDED - Show document generation after save
      
      await trackProgress('completed', 100, {
        assessmentId: result.data?.id,
        personaLevel: calculatedPersona.level,
        personaType: calculatedPersona.persona.type,
        confidence: calculatedPersona.confidence,
        version: result.version
      })
      
      toast({
        title: 'Success',
        description: `${calculatedPersona.persona.type} profile saved successfully (Version ${result.version || 1})`,
        variant: 'default'
      })
      
      // REMOVED AUTO-NAVIGATION
      // setTimeout(() => {
      //   handleBack()
      // }, 1500)
      
    } catch (error) {
      console.error('Error saving persona:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save persona assessment',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ADDED - Document generation success handler
  const handleDocumentGenerationSuccess = (docId: string, docUrl?: string) => {
    toast({
      title: 'Document Generated',
      description: 'Your persona assessment report has been created successfully',
      variant: 'default'
    })
  }

  const progress = ((currentQuestion + 1) / personaQuestions.length) * 100
  const currentQuestionData = personaQuestions[currentQuestion]
  const currentAnswer = answers[currentQuestionData?.id]

  return (
    <NavigationGuard requireClient={true}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Investor Persona Assessment</h1>
              {client && (
                <p className="text-gray-600 mt-1">
                  For: {clientName}
                  {isProspect && (
                    <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-300">
                      Prospect
                    </Badge>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Prospect warning */}
        {isProspect && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <span className="font-medium text-orange-800">
                Prospect Mode: This assessment will be saved temporarily. Convert to client to persist data.
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="max-w-4xl mx-auto">
          {isComplete && calculatedPersona ? (
            // Results display
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Investor Persona</h2>
                <p className="text-gray-600">Investment personality profile based on your responses</p>
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">{calculatedPersona.persona.avatar}</div>
                    <CardTitle className="text-2xl text-indigo-900">{calculatedPersona.persona.type}</CardTitle>
                    <p className="text-indigo-700 mt-2">{calculatedPersona.persona.description}</p>
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
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
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
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
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
                                    level === calculatedPersona.level ? "bg-indigo-600" : "bg-gray-400"
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

                  {/* ADDED - Success Message & Document Generation */}
                  {savedAssessmentId && showDocumentGeneration && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="font-medium text-green-800">Assessment saved successfully!</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <DocumentGenerationButton
                          assessmentType="persona"
                          assessmentId={savedAssessmentId}
                          clientId={clientId!}
                          clientName={clientName}
                          clientEmail={clientEmail}
                          onSuccess={handleDocumentGenerationSuccess}
                        />
                      </div>
                    </div>
                  )}

                  {/* UPDATED Actions - Better button layout after save */}
                  <div className="flex justify-center space-x-4">
                    {!savedAssessmentId ? (
                      <>
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
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Persona
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={handleBack} variant="outline">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Return to Hub
                        </Button>
                        <Button onClick={resetAssessment} variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retake Assessment
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Question flow
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Question {currentQuestion + 1} of {personaQuestions.length}</span>
                    <span className="text-sm font-medium">{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>

              {currentQuestionData && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100">
                        <span className="font-bold">{currentQuestion + 1}</span>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{currentQuestionData.text}</CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {currentQuestionData.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentQuestionData.options.map((option, index) => (
                        <label
                          key={index}
                          className={cn(
                            "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
                            currentAnswer === index
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name={currentQuestionData.id}
                            value={index}
                            checked={currentAnswer === index}
                            onChange={() => handleAnswer(index)}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 mr-3",
                            currentAnswer === index
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-gray-300"
                          )}>
                            {currentAnswer === index && (
                              <div className="w-full h-full rounded-full bg-white scale-50" />
                            )}
                          </div>
                          <span className="text-gray-700">{option.text}</span>
                        </label>
                      ))}
                    </div>

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
                        {currentQuestion === personaQuestions.length - 1 ? 'Complete' : 'Next'}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </NavigationGuard>
  )
}
