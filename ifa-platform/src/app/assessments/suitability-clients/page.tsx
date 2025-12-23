'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuitabilityClientsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main suitability assessment page
    router.replace('/assessments/suitability')
  }, [router])

  return null
}
