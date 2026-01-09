import React, { useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

type Allocation = {
  equities: number
  bonds: number
  cash: number
  alternatives: number
}

interface RecommendationAllocationChartProps {
  allocation: Allocation
  portfolioLabel?: string
  className?: string
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444']

export const RecommendationAllocationChart: React.FC<RecommendationAllocationChartProps> = ({
  allocation,
  portfolioLabel,
  className
}) => {
  const data = useMemo(() => {
    return [
      { name: 'Equities', value: allocation.equities },
      { name: 'Bonds', value: allocation.bonds },
      { name: 'Cash', value: allocation.cash },
      { name: 'Alternatives', value: allocation.alternatives }
    ].filter((entry) => entry.value > 0)
  }, [allocation])

  const total = useMemo(() => {
    return allocation.equities + allocation.bonds + allocation.cash + allocation.alternatives
  }, [allocation])

  const totalDelta = total - 100

  if (total === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500', className)}>
        Add allocation percentages to see the portfolio breakdown.
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-gray-50 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Allocation Preview</p>
          {portfolioLabel && (
            <p className="text-xs text-gray-500">Portfolio: {portfolioLabel}</p>
          )}
        </div>
        <span
          className={cn(
            'text-xs font-medium',
            total === 100 ? 'text-green-600' : total > 100 ? 'text-red-600' : 'text-orange-600'
          )}
        >
          Total: {total}%
          {total !== 100 && (
            <span className="ml-1">
              ({totalDelta > 0 ? `+${totalDelta}%` : `${totalDelta}%`})
            </span>
          )}
        </span>
      </div>

      {total !== 100 && (
        <div
          className={cn(
            'mb-3 rounded-md border px-3 py-2 text-xs',
            total > 100 ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
          )}
        >
          Allocation should total 100%. Adjust percentages to balance the portfolio.
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={72}
              innerRadius={40}
              paddingAngle={2}
              labelLine={false}
              label={false}
            >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 text-xs text-gray-600">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{entry.name}</span>
              </div>
              <span className="text-gray-900">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
