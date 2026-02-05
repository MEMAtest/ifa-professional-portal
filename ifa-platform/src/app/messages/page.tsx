// app/messages/page.tsx
// Redirects to Communication Hub
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/communication?tab=messages')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to the Communication Hub…</p>
        <p className="text-sm text-gray-500 mt-2">
          Loading client messages and activity threads.
        </p>
      </div>
    </div>
  )
}
