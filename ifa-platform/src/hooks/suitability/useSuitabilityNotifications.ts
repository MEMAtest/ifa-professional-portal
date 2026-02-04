import { useCallback, useState } from 'react'

import type { NotificationOptions } from '@/components/suitability/SuitabilityFormModals'

export function useSuitabilityNotifications() {
  const [notifications, setNotifications] = useState<NotificationOptions[]>([])

  const showNotification = useCallback((options: NotificationOptions) => {

    setNotifications((prev) => [...prev, { ...options, duration: options.duration || 5000 }])

    setTimeout(() => {
      setNotifications((prev) => prev.slice(1))
    }, options.duration || 5000)
  }, [])

  return { notifications, showNotification }
}

