'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { PoundSterling, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FirmAUM } from '@/lib/financials/aumCalculator'
import type { AssetAllocation } from '@/services/FirmAnalyticsService'

interface AUMBreakdownChartProps {
  firmAUM: FirmAUM
  assetAllocation: AssetAllocation
  view?: 'pie' | 'bar'
}

const COLORS = {
  equities: '#3b82f6',    // Blue
  bonds: '#22c55e',       // Green
  cash: '#f59e0b',        // Amber
  alternatives: '#8b5cf6', // Purple
  property: '#ef4444',     // Red
  other: '#94a3b8'         // Gray
}

export function AUMBreakdownChart({
  firmAUM,
  assetAllocation,
  view = 'pie'
}: AUMBreakdownChartProps) {
  // Prepare data for charts
  const allocationData = [
    { name: 'Equities', value: assetAllocation.equities, color: COLORS.equities },
    { name: 'Bonds', value: assetAllocation.bonds, color: COLORS.bonds },
    { name: 'Cash', value: assetAllocation.cash, color: COLORS.cash },
    { name: 'Alternatives', value: assetAllocation.alternatives, color: COLORS.alternatives },
    { name: 'Property', value: assetAllocation.property, color: COLORS.property },
    { name: 'Other', value: assetAllocation.other, color: COLORS.other },
  ].filter(item => item.value > 0)

  const totalAllocation = allocationData.reduce((sum, item) => sum + item.value, 0)

  // Add percentage to each item
  const chartData = allocationData.map(item => ({
    ...item,
    percentage: totalAllocation > 0 ? ((item.value / totalAllocation) * 100).toFixed(1) : '0'
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.value)}</p>
          <p className="text-sm font-medium" style={{ color: data.color }}>
            {data.percentage}%
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PoundSterling className="h-5 w-5 text-green-600" />
              Assets Under Management
            </CardTitle>
            <CardDescription>
              Aggregate portfolio allocation across {firmAUM.clientCount} clients
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(firmAUM.totalAUM)}
            </p>
            <p className="text-sm text-gray-500">
              Avg: {formatCurrency(firmAUM.averageAUM)} per client
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="h-64">
            {view === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value: string, entry: any) => (
                      <span className="text-sm text-gray-700">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`
                      return `£${value}`
                    }}
                  />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Breakdown List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Asset Class Breakdown</h4>
            {chartData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-gray-500">{item.percentage}%</p>
                </div>
              </div>
            ))}

            {chartData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <PoundSterling className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No asset data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Clients by AUM */}
        {firmAUM.byClient.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Clients by AUM
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {firmAUM.byClient.slice(0, 6).map((client, index) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {client.clientName}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatCurrency(client.aum)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AUMBreakdownChart
