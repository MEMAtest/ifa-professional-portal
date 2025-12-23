'use client'

import { createContext, useContext } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

type NotificationsContextValue = ReturnType<typeof useNotifications>

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // Fetch a superset so consumers can slice for their needs.
  const value = useNotifications({ limit: 50 })
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotificationsContext(): NotificationsContextValue {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotificationsContext must be used within <NotificationsProvider>')
  }
  return context
}

