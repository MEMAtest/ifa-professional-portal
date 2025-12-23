import { useCallback, useState } from 'react'

import type { NotificationOptions } from '@/components/suitability/SuitabilityFormModals'

export function useSuitabilityNotifications() {
  const [notifications, setNotifications] = useState<NotificationOptions[]>([])

  const showNotification = useCallback((options: NotificationOptions) => {
    console.log(`[${options.type?.toUpperCase() || 'INFO'}] ${options.title}: ${options.description}`)

    setNotifications((prev) => [...prev, { ...options, duration: options.duration || 5000 }])

    setTimeout(() => {
      setNotifications((prev) => prev.slice(1))
    }, options.duration || 5000)
  }, [])

  return { notifications, showNotification }
}

