// =====================================================
// FILE: /components/suitability/charts/RiskRadarChart.tsx
// =====================================================

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Shield } from 'lucide-react'

interface RiskRadarChartProps {
  data?: any
  title?: string
}

export const RiskRadarChart: React.FC<RiskRadarChartProps> = ({ 
  data, 
  title = 'Risk Profile' 
}) => {
  // Mock data for display
  const riskCategories = [
    { category: 'Market Risk', score: 7 },
    { category: 'Liquidity Risk', score: 5 },
    { category: 'Credit Risk', score: 3 },
    { category: 'Inflation Risk', score: 6 },
    { category: 'Currency Risk', score: 4 }
  ]
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Shield className="h-5 w-5 text-red-600" />
        <h3 className="font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Risk Analysis</p>
            <p className="text-xs text-gray-400 mt-1">Chart will display here</p>
            
            {/* Simple placeholder visualization */}
            <div className="mt-4 space-y-1">
              {riskCategories.map((risk, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-left text-gray-600">{risk.category}:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${risk.score * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}