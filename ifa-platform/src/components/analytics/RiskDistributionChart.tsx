'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Shield, AlertTriangle } from 'lucide-react'
import type { RiskDistribution } from '@/services/FirmAnalyticsService'

interface RiskDistributionChartProps {
  distribution: RiskDistribution
  onProfileClick?: (profile: number) => void
}

const RISK_PROFILES = [
  { key: 'profile1', label: 'Cautious', level: 1, color: '#22c55e', description: 'Capital preservation focus' },
  { key: 'profile2', label: 'Conservative', level: 2, color: '#84cc16', description: 'Low risk tolerance' },
  { key: 'profile3', label: 'Balanced', level: 3, color: '#f59e0b', description: 'Moderate risk/return' },
  { key: 'profile4', label: 'Growth', level: 4, color: '#f97316', description: 'Higher growth focus' },
  { key: 'profile5', label: 'Aggressive', level: 5, color: '#ef4444', description: 'Maximum growth' },
]

export function RiskDistributionChart({
  distribution,
  onProfileClick
}: RiskDistributionChartProps) {
  const chartData = RISK_PROFILES.map(profile => ({
    name: profile.label,
    level: profile.level,
    count: distribution[profile.key as keyof RiskDistribution] as number,
    color: profile.color,
    description: profile.description
  }))

  const totalClients = Object.values(distribution).reduce((sum, val) => sum + val, 0)
  const unassigned = distribution.unassigned

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = totalClients > 0 ? ((data.count / totalClients) * 100).toFixed(1) : '0'
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{data.description}</p>
          <p className="text-sm font-bold mt-1" style={{ color: data.color }}>
            {data.count} clients ({percentage}%)
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
              <Shield className="h-5 w-5 text-blue-600" />
              Client Risk Distribution
            </CardTitle>
            <CardDescription>
              Risk profile allocation across your client base
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
            <p className="text-sm text-gray-500">Total Clients</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Unassigned Warning */}
        {unassigned > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {unassigned} client{unassigned > 1 ? 's' : ''} without risk profile
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Complete risk assessments to ensure appropriate recommendations
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  cursor={onProfileClick ? 'pointer' : 'default'}
                  onClick={(data) => onProfileClick?.(data.level)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Profile Cards */}
          <div className="space-y-2">
            {RISK_PROFILES.map((profile, index) => {
              const count = distribution[profile.key as keyof RiskDistribution] as number
              const percentage = totalClients > 0 ? ((count / totalClients) * 100).toFixed(1) : '0'

              return (
                <button
                  key={profile.key}
                  onClick={() => onProfileClick?.(profile.level)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    onProfileClick
                      ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
                      : ''
                  }`}
                  style={{
                    backgroundColor: `${profile.color}10`,
                    borderColor: `${profile.color}40`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.level}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{profile.label}</p>
                      <p className="text-xs text-gray-500">{profile.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Risk Profile Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Conservative</p>
              <p className="text-lg font-bold text-green-600">
                {distribution.profile1 + distribution.profile2}
              </p>
              <p className="text-xs text-gray-400">
                {totalClients > 0
                  ? (((distribution.profile1 + distribution.profile2) / totalClients) * 100).toFixed(0)
                  : 0}%
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Balanced</p>
              <p className="text-lg font-bold text-amber-600">{distribution.profile3}</p>
              <p className="text-xs text-gray-400">
                {totalClients > 0
                  ? ((distribution.profile3 / totalClients) * 100).toFixed(0)
                  : 0}%
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Growth</p>
              <p className="text-lg font-bold text-orange-600">
                {distribution.profile4 + distribution.profile5}
              </p>
              <p className="text-xs text-gray-400">
                {totalClients > 0
                  ? (((distribution.profile4 + distribution.profile5) / totalClients) * 100).toFixed(0)
                  : 0}%
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Unassigned</p>
              <p className={`text-lg font-bold ${unassigned > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {unassigned}
              </p>
              <p className="text-xs text-gray-400">
                {totalClients > 0 ? ((unassigned / totalClients) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RiskDistributionChart
