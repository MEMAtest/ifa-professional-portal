// components/compliance/RegistersDashboard.tsx
// ================================================================
// Registers Dashboard - Complaints, Breaches, Vulnerability tabs
// ================================================================

'use client'

import React, { useState } from 'react'
import {
  MessageSquareWarning,
  AlertOctagon,
  UserX,
  Plus
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import ComplaintsRegister from './ComplaintsRegister'
import BreachesRegister from './BreachesRegister'
import VulnerabilityRegister from './VulnerabilityRegister'

interface Props {
  onStatsChange?: () => void
  initialTab?: string
}

type RegisterTab = 'complaints' | 'breaches' | 'vulnerability'

export default function RegistersDashboard({ onStatsChange, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<RegisterTab>(
    (initialTab as RegisterTab) || 'complaints'
  )

  const tabs = [
    {
      key: 'complaints' as RegisterTab,
      label: 'Complaints',
      icon: MessageSquareWarning,
      description: 'Track and resolve client complaints'
    },
    {
      key: 'breaches' as RegisterTab,
      label: 'Breaches',
      icon: AlertOctagon,
      description: 'Log regulatory and procedural breaches'
    },
    {
      key: 'vulnerability' as RegisterTab,
      label: 'Vulnerability',
      icon: UserX,
      description: 'Monitor vulnerable client status'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex space-x-2 border-b pb-4">
        {tabs.map(({ key, label, icon: Icon, description }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
              activeTab === key
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            <Icon className={`h-5 w-5 ${activeTab === key ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className="font-medium">{label}</p>
              <p className="text-xs opacity-75">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'complaints' && (
          <ComplaintsRegister onStatsChange={onStatsChange} />
        )}
        {activeTab === 'breaches' && (
          <BreachesRegister onStatsChange={onStatsChange} />
        )}
        {activeTab === 'vulnerability' && (
          <VulnerabilityRegister onStatsChange={onStatsChange} />
        )}
      </div>
    </div>
  )
}
