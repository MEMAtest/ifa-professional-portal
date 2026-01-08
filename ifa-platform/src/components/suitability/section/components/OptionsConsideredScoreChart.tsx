import React, { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

type OptionScore = {
  label: string
  score: number | null
}

interface OptionsConsideredScoreChartProps {
  options: OptionScore[]
  className?: string
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b']

export const OptionsConsideredScoreChart: React.FC<OptionsConsideredScoreChartProps> = ({ options, className }) => {
  const data = useMemo(() => {
    return options
      .map((option, index) => {
        const label = option.label?.trim() || `Option ${index + 1}`
        const score = option.score
        if (score === null || score === undefined) return null
        if (!Number.isFinite(score)) return null
        return { name: label, score: Math.max(0, Math.min(score, 10)) }
      })
      .filter((entry): entry is { name: string; score: number } => Boolean(entry))
  }, [options])

  if (data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500', className)}>
        Add option scores to compare side-by-side.
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-gray-50 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Options Score Comparison</p>
          <p className="text-xs text-gray-500">0-10 scale</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 10]} tickCount={6} />
            <Tooltip formatter={(value: number) => `${value}/10`} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
