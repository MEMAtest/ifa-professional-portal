// File: src/components/documents/DocumentNavigation.tsx
// Navigation component for document system

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FileText, 
  BarChart3, 
  Edit3, 
  Clock,
  Send,
  Settings
} from 'lucide-react'

const navItems = [
  {
    href: '/documents',
    label: 'Generate Documents',
    icon: FileText,
    description: 'Create and send documents'
  },
  {
    href: '/documents/status',
    label: 'Document Status',
    icon: Clock,
    description: 'Track signature status'
  },
  {
    href: '/templates/editor',
    label: 'Template Editor',
    icon: Edit3,
    description: 'Create & edit templates'
  },
  {
    href: '/documents/analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Performance metrics'
  }
]

export function DocumentNavigation() {
  const pathname = usePathname()

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 transition-colors
                  ${isActive 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs hidden sm:block">{item.description}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Quick Stats Widget
export function DocumentQuickStats() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600">Today&apos;s Sent</p>
            <p className="text-2xl font-bold text-blue-900">12</p>
          </div>
          <Send className="h-8 w-8 text-blue-400" />
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-600">Signed Today</p>
            <p className="text-2xl font-bold text-green-900">8</p>
          </div>
          <FileText className="h-8 w-8 text-green-400" />
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">15</p>
          </div>
          <Clock className="h-8 w-8 text-yellow-400" />
        </div>
      </div>
      
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-600">Success Rate</p>
            <p className="text-2xl font-bold text-purple-900">89%</p>
          </div>
          <BarChart3 className="h-8 w-8 text-purple-400" />
        </div>
      </div>
    </div>
  )
}
