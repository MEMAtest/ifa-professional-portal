// src/components/forms/steps/ReviewStep.tsx - Final review and submission step
'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, AlertTriangle, User, DollarSign, Shield, FileText } from 'lucide-react'

interface Assessment {
  id: string;
  clientProfile: {
    firstName: string;
    lastName: string;
    clientRef: string;
    age: number;
    occupation: string;
  };
  financialProfile: {
    investmentAmount: number;
    timeHorizon: number;
    primaryObjective: string;
    netWorth: number;
  };
  riskProfile: {
    attitudeToRisk: number;
    capacityForLoss: number;
    finalRiskProfile: number;
  };
  vulnerabilityAssessment: {
    is_vulnerable: boolean;
    vulnerabilityTypes: string[];
  };
  knowledgeExperience: {
    investmentKnowledge: string;
    investmentExperience: number;
  };
  suitabilityAssessment: {
    meetsObjectives: boolean;
    suitableForRisk: boolean;
    affordabilityConfirmed: boolean;
    recommendationSuitable: boolean;
    suitabilityScore: number;
  };
  status: string;
  completionPercentage: number;
  adviceType: string;
}

interface ReviewStepProps {
  assessment: Assessment
  onSubmit: () => Promise<void>
  isSubmitting: boolean
}

export const ReviewStep = ({ assessment, onSubmit, isSubmitting }: ReviewStepProps) => {
  const getSuitabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSuitabilityStatus = (score: number) => {
    if (score >= 80) return 'Highly Suitable'
    if (score >= 60) return 'Suitable'
    return 'Requires Review'
  }

  const isReadyForSubmission = () => {
    return assessment.suitabilityAssessment.recommendationSuitable && 
           assessment.completionPercentage >= 90
  }

  return (
    <div className="space-y-6">
      {/* Assessment Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Assessment Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <User className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-semibold">{assessment.clientProfile.firstName} {assessment.clientProfile.lastName}</p>
                <p className="text-xs text-gray-500">{assessment.clientProfile.clientRef}</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Investment</p>
                <p className="font-semibold">£{assessment.financialProfile.investmentAmount?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{assessment.financialProfile.timeHorizon} years</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-3">
                <Shield className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Risk Level</p>
                <p className="font-semibold">{assessment.riskProfile.finalRiskProfile}/7</p>
                <p className="text-xs text-gray-500">Final Profile</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-50 rounded-lg p-3">
                <CheckCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Suitability</p>
                <p className={`font-semibold ${getSuitabilityColor(assessment.suitabilityAssessment.suitabilityScore)}`}>
                  {assessment.suitabilityAssessment.suitabilityScore}%
                </p>
                <p className="text-xs text-gray-500">
                  {getSuitabilityStatus(assessment.suitabilityAssessment.suitabilityScore)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Profile Review */}
      <Card>
        <CardHeader>
          <CardTitle>Client Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Name:</p>
              <p className="font-medium">{assessment.clientProfile.firstName} {assessment.clientProfile.lastName}</p>
            </div>
            <div>
              <p className="text-gray-600">Age:</p>
              <p className="font-medium">{assessment.clientProfile.age} years</p>
            </div>
            <div>
              <p className="text-gray-600">Occupation:</p>
              <p className="font-medium">{assessment.clientProfile.occupation}</p>
            </div>
            <div>
              <p className="text-gray-600">Advice Type:</p>
              <p className="font-medium">{assessment.adviceType}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Investment Amount:</p>
              <p className="font-medium">£{assessment.financialProfile.investmentAmount?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Time Horizon:</p>
              <p className="font-medium">{assessment.financialProfile.timeHorizon} years</p>
            </div>
            <div>
              <p className="text-gray-600">Net Worth:</p>
              <p className="font-medium">£{assessment.financialProfile.netWorth?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Primary Objective:</p>
              <p className="font-medium">{assessment.financialProfile.primaryObjective}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Review */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">Attitude to Risk</p>
              <p className="text-2xl font-bold text-blue-600">{assessment.riskProfile.attitudeToRisk}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Capacity for Loss</p>
              <p className="text-2xl font-bold text-green-600">{assessment.riskProfile.capacityForLoss}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Final Risk Profile</p>
              <p className="text-2xl font-bold text-purple-600">{assessment.riskProfile.finalRiskProfile}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vulnerability Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            {assessment.vulnerabilityAssessment.is_vulnerable ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Vulnerabilities Identified</p>
                  <p className="text-sm text-gray-600">
                    Types: {assessment.vulnerabilityAssessment.vulnerabilityTypes.join(', ')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">No Vulnerabilities Identified</p>
                  <p className="text-sm text-gray-600">Standard review procedures apply</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Knowledge & Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge & Experience</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Investment Knowledge:</p>
              <p className="font-medium capitalize">{assessment.knowledgeExperience.investmentKnowledge}</p>
            </div>
            <div>
              <p className="text-gray-600">Investment Experience:</p>
              <p className="font-medium">{assessment.knowledgeExperience.investmentExperience} years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suitability Decision */}
      <Card>
        <CardHeader>
          <CardTitle>Final Suitability Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                {assessment.suitabilityAssessment.meetsObjectives ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">Meets Objectives</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {assessment.suitabilityAssessment.suitableForRisk ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">Suitable for Risk</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {assessment.suitabilityAssessment.affordabilityConfirmed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">Affordable</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {assessment.suitabilityAssessment.recommendationSuitable ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">Overall Suitable</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Final Suitability Score</p>
              <p className={`text-3xl font-bold ${getSuitabilityColor(assessment.suitabilityAssessment.suitabilityScore)}`}>
                {assessment.suitabilityAssessment.suitabilityScore}%
              </p>
              <p className="text-sm text-gray-600">
                {getSuitabilityStatus(assessment.suitabilityAssessment.suitabilityScore)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isReadyForSubmission() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">Assessment Not Ready</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Please complete all sections and ensure the recommendation is suitable before submitting.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                onClick={onSubmit}
                loading={isSubmitting}
                disabled={!isReadyForSubmission() || isSubmitting}
                size="lg"
                className="px-8"
              >
                {isSubmitting ? 'Submitting Assessment...' : 'Submit Assessment'}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By submitting this assessment, you confirm that all information is accurate and 
              the recommendation meets FCA suitability requirements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}