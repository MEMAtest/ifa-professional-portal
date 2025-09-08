// =====================================================
// FILE: /components/suitability/charts/ProjectionLineChart.tsx
// =====================================================

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { TrendingUp } from 'lucide-react'

interface ProjectionLineChartProps {
  data?: any
  title?: string
}

export const ProjectionLineChart: React.FC<ProjectionLineChartProps> = ({ 
  data, 
  title = 'Growth Projection' 
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <TrendingUp className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Projection Timeline</p>
            <p className="text-xs text-gray-400 mt-1">Chart will display here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}