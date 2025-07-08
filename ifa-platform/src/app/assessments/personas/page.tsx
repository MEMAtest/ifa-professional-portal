// ================================================================
// FIXED PERSONAS PAGE - Complete working version  
// File: ifa-platform/src/app/assessments/personas/page.tsx
// ================================================================

'use client'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Users, Brain, Heart, Target, TrendingUp, Shield } from 'lucide-react'
import { investorPersonas, type InvestorPersona } from '@/data/investorPersonas'

export default function PersonasPage() {
  const [selectedPersona, setSelectedPersona] = useState<InvestorPersona | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Investor Personas</h1>
        <p className="text-gray-600">Consumer Duty aligned investor personality profiles</p>
      </div>

      {/* Persona Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(investorPersonas).map(([riskLevel, persona]: [string, InvestorPersona]) => (
          <Card
            key={riskLevel}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPersona?.type === persona.type ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedPersona(persona)}
          >
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">{persona.avatar}</div>
              <CardTitle className="text-lg">{persona.type}</CardTitle>
              <CardDescription>{persona.description}</CardDescription>
              <Badge variant="outline">Risk Level {riskLevel}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-green-900 mb-1">Key Motivations</h4>
                  <div className="flex flex-wrap gap-1">
                    {persona.motivations.slice(0, 2).map((motivation: string, i: number) => (
                      <Badge key={i} variant="success" className="text-xs">
                        {motivation}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-900 mb-1">Key Fears</h4>
                  <div className="flex flex-wrap gap-1">
                    {persona.fears.slice(0, 2).map((fear: string, i: number) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        {fear}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed View */}
      {selectedPersona && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <span className="text-3xl">{selectedPersona.avatar}</span>
              <div>
                <h3 className="text-xl">{selectedPersona.type}</h3>
                <p className="text-gray-600">{selectedPersona.description}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Psychological Profile */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="flex items-center space-x-2 font-semibold">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <span>Psychological Profile</span>
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Decision Making:</strong> {selectedPersona.psychologicalProfile.decisionMaking}
                  </div>
                  <div>
                    <strong>Stress Response:</strong> {selectedPersona.psychologicalProfile.stressResponse}
                  </div>
                  <div>
                    <strong>Trust Building:</strong> {selectedPersona.psychologicalProfile.trustBuilding}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="flex items-center space-x-2 font-semibold">
                  <Heart className="h-5 w-5 text-red-600" />
                  <span>Emotional Drivers</span>
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Primary:</strong> {selectedPersona.emotionalDrivers.primary}
                  </div>
                  <div>
                    <strong>Secondary:</strong> {selectedPersona.emotionalDrivers.secondary}
                  </div>
                  <div>
                    <strong>Deep Fear:</strong> {selectedPersona.emotionalDrivers.deepFear}
                  </div>
                </div>
              </div>
            </div>

            {/* Communication Strategy */}
            <div>
              <h4 className="flex items-center space-x-2 font-semibold mb-3">
                <Target className="h-5 w-5 text-purple-600" />
                <span>Communication Strategy</span>
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Frequency:</strong> {selectedPersona.communicationNeeds.frequency}
                </div>
                <div>
                  <strong>Style:</strong> {selectedPersona.communicationNeeds.style}
                </div>
                <div>
                  <strong>Format:</strong> {selectedPersona.communicationNeeds.format}
                </div>
                <div>
                  <strong>Meeting Preference:</strong> {selectedPersona.communicationNeeds.meetingPreference}
                </div>
              </div>
            </div>

            {/* Consumer Duty Alignment */}
            <div>
              <h4 className="flex items-center space-x-2 font-semibold mb-3">
                <Shield className="h-5 w-5 text-green-600" />
                <span>Consumer Duty Alignment</span>
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <strong className="text-blue-900">Products & Services:</strong>
                  <p className="text-sm text-blue-800 mt-1">{selectedPersona.consumerDutyAlignment.products}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <strong className="text-green-900">Fair Value:</strong>
                  <p className="text-sm text-green-800 mt-1">{selectedPersona.consumerDutyAlignment.value}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <strong className="text-purple-900">Consumer Outcomes:</strong>
                  <p className="text-sm text-purple-800 mt-1">{selectedPersona.consumerDutyAlignment.outcome}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <strong className="text-orange-900">Consumer Support:</strong>
                  <p className="text-sm text-orange-800 mt-1">{selectedPersona.consumerDutyAlignment.support}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
