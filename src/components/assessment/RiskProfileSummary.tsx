// ================================================================
// FILE 3: Create RiskProfileSummary Component
// Path: ifa-platform/src/components/assessment/RiskProfileSummary.tsx
// ================================================================

'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, Shield, AlertTriangle, Target } from 'lucide-react'

interface RiskMetrics {
  atrScore: number
  atrCategory: string
  behavioralBias: 'conservative' | 'neutral' | 'aggressive'
  finalRiskProfile: number
  confidenceLevel: number
}

interface InvestorPersona {
  avatar: string
  type: string
  description: string
  motivations: string[]
  fears: string[]
}

interface RiskProfileSummaryProps {
  riskMetrics: RiskMetrics
  persona?: InvestorPersona
}

const getRiskLevelColor = (level: number): string => {
  const colors = {
    1: 'bg-green-100 text-green-800 border-green-200',
    2: 'bg-blue-100 text-blue-800 border-blue-200', 
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    4: 'bg-orange-100 text-orange-800 border-orange-200',
    5: 'bg-red-100 text-red-800 border-red-200'
  }
  return colors[level as keyof typeof colors] || colors[3]
}

export function RiskProfileSummary({ riskMetrics, persona }: RiskProfileSummaryProps) {
  const getRiskIcon = (level: number) => {
    if (level <= 2) return <Shield className="h-5 w-5" />
    if (level <= 3) return <Target className="h-5 w-5" />
    if (level <= 4) return <TrendingUp className="h-5 w-5" />
    return <AlertTriangle className="h-5 w-5" />
  }

  const getRiskLabel = (level: number) => {
    const labels = {
      1: 'Conservative',
      2: 'Cautious', 
      3: 'Balanced',
      4: 'Growth',
      5: 'Aggressive'
    }
    return labels[level as keyof typeof labels] || 'Unknown'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getRiskIcon(riskMetrics.finalRiskProfile)}
          <span>Risk Profile Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Risk Level:</span>
          <Badge className={getRiskLevelColor(riskMetrics.finalRiskProfile)}>
            {riskMetrics.finalRiskProfile}/5 - {getRiskLabel(riskMetrics.finalRiskProfile)}
          </Badge>
        </div>

        {/* ATR Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">ATR Score:</span>
          <span className="text-sm text-gray-600">
            {riskMetrics.atrScore} ({riskMetrics.atrCategory})
          </span>
        </div>

        {/* Behavioral Bias */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Behavioral Bias:</span>
          <Badge 
            variant={
              riskMetrics.behavioralBias === 'conservative' ? 'secondary' :
              riskMetrics.behavioralBias === 'aggressive' ? 'destructive' : 'outline'
            }
          >
            {riskMetrics.behavioralBias}
          </Badge>
        </div>

        {/* Confidence Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Confidence:</span>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${riskMetrics.confidenceLevel}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{riskMetrics.confidenceLevel}%</span>
          </div>
        </div>

        {/* Persona Summary */}
        {persona && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{persona.avatar}</span>
              <div>
                <h4 className="font-medium">{persona.type}</h4>
                <p className="text-sm text-gray-600">{persona.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-green-900 mb-1">Key Motivations</h5>
                <p className="text-xs text-green-800">
                  {persona.motivations.slice(0, 2).join(', ')}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-red-900 mb-1">Key Fears</h5>
                <p className="text-xs text-red-800">
                  {persona.fears.slice(0, 2).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}