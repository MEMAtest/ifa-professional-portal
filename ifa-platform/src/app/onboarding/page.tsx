'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useFirm, FIRM_QUERY_KEY } from '@/modules/firm/hooks/useFirm'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, loading: authLoading } = useAuth()
  const { firm, updateFirmAsync, isLoading: firmLoading } = useFirm()
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleComplete = async () => {
    setSaveError(false)
    setSaving(true)
    try {
      // Mark onboarding as completed in firm settings
      // Only send the onboarding and billing settings - the API will deep-merge
      // with existing settings so we don't overwrite other nested properties
      const updatedFirm = await updateFirmAsync({
        settings: {
          onboarding: {
            completed: true,
            completedAt: new Date().toISOString(),
            completedBy: user?.id || '',
          },
          // Preserve existing billing settings - maxSeats comes from Stripe subscription
          billing: (firm?.settings as any)?.billing ?? {},
        } as any,
      })

      // Ensure the query cache is updated with the new firm data
      // before navigating, so SmartLayoutWrapper sees the updated onboarding status
      queryClient.setQueryData(FIRM_QUERY_KEY, updatedFirm)

      // Send welcome email (non-blocking — don't fail onboarding if email fails)
      fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcome',
          recipient: user?.email,
          data: {
            userName: user?.firstName || user?.email?.split('@')[0] || '',
            firmName: firm?.name || '',
          },
          firmId: firm?.id,
        }),
      }).catch(() => {})

      router.replace('/dashboard')
    } catch {
      // Do NOT redirect on failure — SmartLayoutWrapper checks onboarding.completed
      // and would redirect back here, causing an infinite loop
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || firmLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    router.replace('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {saveError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg px-6 py-3 shadow-lg flex items-center gap-3">
          <p className="text-sm text-red-700">Failed to save onboarding progress. Please try again.</p>
          <button
            onClick={handleComplete}
            disabled={saving}
            className="text-sm font-medium text-red-700 underline hover:text-red-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Retry'}
          </button>
        </div>
      )}
      <OnboardingWizard onComplete={handleComplete} saving={saving} />
    </div>
  )
}
