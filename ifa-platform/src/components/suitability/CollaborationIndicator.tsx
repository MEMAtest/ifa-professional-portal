// =====================================================
// FILE: src/components/suitability/CollaborationIndicator.tsx
// =====================================================

import React from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollaborationIndicatorProps {
  users: string[]
  maxDisplay?: number
}

export const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({
  users,
  maxDisplay = 3
}) => {
  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = Math.max(0, users.length - maxDisplay)
  
  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-gray-500" />
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <div
            key={index}
            className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white"
            title={user}
          >
            {user.charAt(0).toUpperCase()}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium">
            +{remainingCount}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600">
        {users.length} {users.length === 1 ? 'user' : 'users'} editing
      </span>
    </div>
  )
}
