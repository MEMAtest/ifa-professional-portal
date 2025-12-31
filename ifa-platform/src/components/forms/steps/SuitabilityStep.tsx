// src/components/forms/steps/SuitabilityStep.tsx - Suitability assessment step
'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface Assessment {
  id: string;
  clientProfile: any;
  financialProfile: any;
  riskProfile: any;
  vulnerabilityAssessment: any;
  knowledgeExperience: any;
  suitabilityAssessment: {
    meetsObjectives: boolean;
    objectivesExplanation: string;
    suitableForRisk: boolean;
    riskExplanation: string;
    affordabilityConfirmed: boolean;
    affordabilityNotes: string;
    recommendationSuitable: boolean;
    suitabilityScore: number;
    complianceFlags: string[];
    consumerDutyOutcomes: any[];
  };
  status: string;
  completionPercentage: number;
  adviceType: string;
  adviserId: string;
  createdAt: string;
  updatedAt: string;
}

interface SuitabilityStepProps {
  assessment: Assessment
  onChange: (updates: Partial<Assessment>) => void
  errors: string[]
}

export const SuitabilityStep = ({ assessment, onChange, errors }: SuitabilityStepProps) => {
  const [localSuitability, setLocalSuitability] = useState(assessment.suitabilityAssessment)

  const handleChange = (field: string, value: any) => {
    const updates = { ...localSuitability, [field]: value }
    setLocalSuitability(updates)
    onChange({
      suitabilityAssessment: updates
    })
  }

  const calculateSuitabilityScore = () => {
    let score = 100
    
    // Deduct points for negative assessments
    if (!localSuitability.meetsObjectives) score -= 30
    if (!localSuitability.suitableForRisk) score -= 25
    if (!localSuitability.affordabilityConfirmed) score -= 25
    if (!localSuitability.recommendationSuitable) score -= 20
    
    return Math.max(0, score)
  }

  const getSuitabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const currentScore = calculateSuitabilityScore()

  return (
    <div className="space-y-6">
      {/* Suitability Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-blue-600" />
            <span>Suitability Assessment Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Risk Profile</p>
              <p className="text-2xl font-bold text-blue-600">{assessment.riskProfile?.finalRiskProfile || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Investment Amount</p>
              <p className="text-lg font-semibold">£{assessment.financialProfile?.investmentAmount?.toLocaleString() || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Suitability Score</p>
              <p className={`text-2xl font-bold ${getSuitabilityColor(currentScore)}`}>
                {currentScore}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Objectives Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Does the recommendation meet client objectives?
              </label>
              <div className="space-y-2">
                {[
                  { value: true, label: 'Yes - Recommendation fully meets objectives' },
                  { value: false, label: 'No - Recommendation does not meet objectives' }
                ].map((option) => (
                  <div
                    key={option.value.toString()}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      localSuitability.meetsObjectives === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleChange('meetsObjectives', option.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={localSuitability.meetsObjectives === option.value}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objectives Explanation
              </label>
              <textarea
                value={localSuitability.objectivesExplanation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  handleChange('objectivesExplanation', e.target.value)
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Explain how the recommendation meets or does not meet client objectives..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Suitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Is the recommendation suitable for the client&apos;s risk profile?
              </label>
              <div className="space-y-2">
                {[
                  { value: true, label: 'Yes - Risk level is appropriate' },
                  { value: false, label: 'No - Risk level is inappropriate' }
                ].map((option) => (
                  <div
                    key={option.value.toString()}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      localSuitability.suitableForRisk === option.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleChange('suitableForRisk', option.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={localSuitability.suitableForRisk === option.value}
                        onChange={() => {}}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk Explanation
              </label>
              <textarea
                value={localSuitability.riskExplanation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  handleChange('riskExplanation', e.target.value)
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Explain the risk suitability assessment..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affordability Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Affordability Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Is the investment affordable for the client?
              </label>
              <div className="space-y-2">
                {[
                  { value: true, label: 'Yes - Investment is affordable' },
                  { value: false, label: 'No - Investment may cause financial strain' }
                ].map((option) => (
                  <div
                    key={option.value.toString()}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      localSuitability.affordabilityConfirmed === option.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleChange('affordabilityConfirmed', option.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={localSuitability.affordabilityConfirmed === option.value}
                        onChange={() => {}}
                        className="h-4 w-4 text-purple-600"
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Affordability Notes
              </label>
              <textarea
                value={localSuitability.affordabilityNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  handleChange('affordabilityNotes', e.target.value)
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Explain the affordability assessment..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Suitability */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Suitability Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall, is this recommendation suitable?
              </label>
              <div className="space-y-2">
                {[
                  { value: true, label: 'Yes - Recommendation is suitable', icon: CheckCircle, color: 'green' },
                  { value: false, label: 'No - Recommendation is not suitable', icon: AlertTriangle, color: 'red' }
                ].map((option) => {
                  const IconComponent = option.icon
                  return (
                    <div
                      key={option.value.toString()}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        localSuitability.recommendationSuitable === option.value
                          ? `border-${option.color}-500 bg-${option.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleChange('recommendationSuitable', option.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          checked={localSuitability.recommendationSuitable === option.value}
                          onChange={() => {}}
                          className={`h-4 w-4 text-${option.color}-600`}
                        />
                        <IconComponent className={`h-5 w-5 text-${option.color}-600`} />
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Suitability Score Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Calculated Suitability Score</h4>
                  <p className="text-xs text-gray-600 mt-1">Based on assessment responses</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${getSuitabilityColor(currentScore)}`}>
                    {currentScore}%
                  </p>
                  <p className="text-xs text-gray-600">
                    {currentScore >= 80 ? 'Highly Suitable' : 
                     currentScore >= 60 ? 'Suitable' : 'Review Required'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please correct the following errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
