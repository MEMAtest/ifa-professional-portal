'use client'

import React from 'react'
import { Building2, Users } from 'lucide-react'
import { investorPersonas } from '@/data/investorPersonas'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function InvestorPersonaLibrary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Investor Persona Library
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Consumer Duty aligned investor personality profiles. These personas help match client
          communication styles and investment approaches.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(investorPersonas).map(([riskLevel, persona]) => (
            <div
              key={riskLevel}
              className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{persona.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{persona.type}</h4>
                    <Badge variant="outline">Risk Level {riskLevel}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{persona.description}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Key Motivations</h5>
                  <div className="flex flex-wrap gap-1">
                    {persona.motivations.slice(0, 3).map((motivation, i) => (
                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        {motivation}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Key Fears</h5>
                  <div className="flex flex-wrap gap-1">
                    {persona.fears.slice(0, 3).map((fear, i) => (
                      <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        {fear}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Suitable Strategies</h5>
                  <div className="flex flex-wrap gap-1">
                    {persona.suitableStrategies.slice(0, 3).map((strategy, i) => (
                      <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {strategy}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Consumer Duty Alignment</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Products:</span>
                      <p className="text-gray-700">{persona.consumerDutyAlignment.products}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Support:</span>
                      <p className="text-gray-700">{persona.consumerDutyAlignment.support}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Firm Personas</p>
              <p className="mt-1">
                These investor personas are used during client assessments to match communication
                styles and investment approaches. The Investor Persona assessment tool assigns
                clients to these profiles based on their questionnaire responses.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
