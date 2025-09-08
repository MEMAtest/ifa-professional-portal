// =====================================================
// FILE: /components/suitability/charts/FinancialPieChart.tsx
// =====================================================

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { PieChart } from 'lucide-react'

interface FinancialPieChartProps {
  data?: any
  title?: string
}

export const FinancialPieChart: React.FC<FinancialPieChartProps> = ({ 
  data, 
  title = 'Financial Breakdown' 
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <PieChart className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-center">
            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Financial Distribution</p>
            <p className="text-xs text-gray-400 mt-1">Chart will display here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}