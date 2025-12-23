// app/inbox/page.tsx
// Redirects to Communication Hub (Overview tab = unified inbox)
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InboxPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/communication?tab=overview')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
