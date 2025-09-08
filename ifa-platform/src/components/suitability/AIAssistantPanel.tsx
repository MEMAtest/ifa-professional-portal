// =====================================================
// FILE: src/components/suitability/AIAssistantPanel.tsx
// =====================================================

import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react'
import { AISuggestion, SuitabilityFormData, PulledPlatformData } from '@/types/suitability'

interface AIAssistantPanelProps {
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  suggestions: Record<string, AISuggestion>
  onApplySuggestion: (sectionId: string, fieldId: string, value: any) => void
  onGenerateSuggestions: (sectionId: string) => Promise<void>
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  formData,
  pulledData,
  suggestions,
  onApplySuggestion,
  onGenerateSuggestions
}) => {
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({})
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  
  const handleGenerateSuggestions = async (sectionId: string) => {
    setIsGenerating({ ...isGenerating, [sectionId]: true })
    await onGenerateSuggestions(sectionId)
    setIsGenerating({ ...isGenerating, [sectionId]: false })
  }
  
  const handleApplySuggestion = (sectionId: string, fieldId: string, value: any) => {
    onApplySuggestion(sectionId, fieldId, value)
    setAppliedSuggestions(new Set([...appliedSuggestions, `${sectionId}.${fieldId}`]))
  }
  
  const sections = [
    'personal_information',
    'financial_situation',
    'objectives',
    'risk_assessment'
  ]
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold">AI Assistant</h3>
      </div>
      
      {sections.map(sectionId => {
        const suggestion = suggestions[sectionId]
        const isLoading = isGenerating[sectionId]
        
        return (
          <Card key={sectionId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium capitalize">
                  {sectionId.replace(/_/g, ' ')}
                </h4>
                {suggestion && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!suggestion && !isLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateSuggestions(sectionId)}
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Suggestions
                </Button>
              )}
              
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                </div>
              )}
              
              {suggestion && (
                <div className="space-y-3">
                  {/* Field Suggestions */}
                  {Object.entries(suggestion.fieldSuggestions || {}).map(([fieldId, value]) => {
                    const key = `${sectionId}.${fieldId}`
                    const isApplied = appliedSuggestions.has(key)
                    
                    return (
                      <div key={fieldId} className="p-2 bg-purple-50 rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-purple-900">
                              {fieldId.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-purple-700 mt-1">
                              {JSON.stringify(value)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={isApplied ? "default" : "ghost"}
                            onClick={() => handleApplySuggestion(sectionId, fieldId, value)}
                            disabled={isApplied}
                          >
                            {isApplied ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              'Apply'
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Insights */}
                  {suggestion.insights.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-1">Insights</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {suggestion.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {suggestion.warnings && suggestion.warnings.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-yellow-900">Warnings</p>
                          <ul className="text-xs text-yellow-700 space-y-1 mt-1">
                            {suggestion.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
