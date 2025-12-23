// =====================================================
// FILE: /src/app/assessments/suitability/page.tsx
// Suitability wrapper page (versioning + form)
// =====================================================

'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Loader2, Lock } from 'lucide-react'

import SuitabilityForm from '@/components/suitability/SuitabilityForm'
import { SuitabilityVersionBar } from '@/components/suitability/SuitabilityVersionBar'
import { SuitabilityVersionHistory } from '@/components/suitability/SuitabilityVersionHistory'
import { NavigationGuard } from '@/components/ui/NavigationGuard'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { safeUUID } from '@/lib/utils'
import type { AssessmentVersionInfo } from '@/types/suitability-version'

export default function SuitabilityAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Params
  const urlClientId = searchParams?.get('clientId')
  const assessmentIdParam = searchParams?.get('assessmentId')
  const versionId = searchParams?.get('versionId')
  const isProspect = searchParams?.get('isProspect') === 'true'

  const sessionClientId =
    typeof window !== 'undefined' ? sessionStorage.getItem('selectedClientId') : null

  const prospectIdRef = useRef<string>(safeUUID())
  const hasLoadedVersionsRef = useRef(false)
  const effectiveClientId = urlClientId || sessionClientId || (isProspect ? prospectIdRef.current : null)

  // Supabase (singleton)
  const supabase = useMemo(() => createClient(), [])

  // Versioning state
  const [currentVersion, setCurrentVersion] = useState<AssessmentVersionInfo | null>(null)
  const [versionHistory, setVersionHistory] = useState<AssessmentVersionInfo[]>([])
  const [canEdit, setCanEdit] = useState(true)
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null)
  const [isLoadingVersion, setIsLoadingVersion] = useState(!isProspect)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showVersionComparison, setShowVersionComparison] = useState(false)

  const loadVersionData = useCallback(async () => {
    if (!effectiveClientId || isProspect) {
      setIsLoadingVersion(false)
      return
    }

    try {
      // Only block the whole page during the initial load. Subsequent refreshes
      // (e.g. after first save) should not unmount/remount the form.
      if (!hasLoadedVersionsRef.current) {
        setIsLoadingVersion(true)
      }

      const { data: versions, error } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', effectiveClientId)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .order('version_number', { ascending: false, nullsFirst: false })

      if (error) throw error

      const list = (versions || []) as AssessmentVersionInfo[]
      setVersionHistory(list)

      const requestedId = assessmentIdParam || versionId
      const selectedVersion = requestedId
        ? list.find((v) => v.id === requestedId) || null
        : (list[0] ?? null)

      setCurrentVersion(selectedVersion)
      setSavedAssessmentId(selectedVersion?.id ?? null)
      setCanEdit(!(selectedVersion?.is_final ?? false))
    } catch (error) {
      console.error('Error loading suitability versions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load suitability assessment versions',
        variant: 'destructive'
      })
      setCurrentVersion(null)
      setSavedAssessmentId(null)
      setCanEdit(true)
    } finally {
      setIsLoadingVersion(false)
      hasLoadedVersionsRef.current = true
    }
  }, [assessmentIdParam, versionId, effectiveClientId, isProspect, supabase, toast])

  // Reset version-loading state when switching client/prospect mode.
  useEffect(() => {
    hasLoadedVersionsRef.current = false
    setIsLoadingVersion(!isProspect)
  }, [effectiveClientId, isProspect])

  useEffect(() => {
    void loadVersionData()
  }, [loadVersionData])

  const handleVersionCreated = useCallback(
    (newVersion: AssessmentVersionInfo) => {
      setCurrentVersion(newVersion)
      setSavedAssessmentId(newVersion.id)
      setCanEdit(true)
      void loadVersionData()
    },
    [loadVersionData]
  )

  const handleAssessmentIdChange = useCallback(
    (assessmentId: string) => {
      if (!assessmentId) return
      setSavedAssessmentId((prev) => (prev === assessmentId ? prev : assessmentId))

      // If the user isn't explicitly viewing a version via URL params,
      // refresh version history so the bar can appear after first save.
      if (!assessmentIdParam && !versionId) {
        void loadVersionData()
      }
    },
    [assessmentIdParam, versionId, loadVersionData]
  )

  // No client selected error
  if (!effectiveClientId && !isProspect) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8 max-w-md">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold">No Client Selected</h2>
            <p className="text-gray-600 text-center">
              Please select a client from the clients page before starting an assessment.
            </p>
            <Button onClick={() => router.push('/clients')} className="mt-4">
              Go to Clients
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Loading state (only for version selection; form has its own skeleton)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Guard */}
      {!isProspect && (
        <NavigationGuard requireClient={true}>
          <></>
        </NavigationGuard>
      )}

      {/* Versioning */}
      {!isProspect && (
        <>
          <SuitabilityVersionBar
            currentVersion={currentVersion}
            versionHistory={versionHistory}
            clientId={effectiveClientId || ''}
            canEdit={canEdit}
            showVersionHistory={showVersionHistory}
            showVersionComparison={showVersionComparison}
            onToggleVersionHistory={() => setShowVersionHistory((s) => !s)}
            onToggleVersionComparison={() => setShowVersionComparison((s) => !s)}
            onVersionCreated={handleVersionCreated}
          />

          <SuitabilityVersionHistory
            versionHistory={versionHistory}
            currentVersion={currentVersion}
            clientId={effectiveClientId || ''}
            show={showVersionHistory}
          />

          {!canEdit && (
            <Alert className="mx-4 mt-4 border-blue-200 bg-blue-50">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                This version is finalized and cannot be edited. Create a new version to make changes.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Main form */}
      <div className="container mx-auto px-4 py-6">
        {isLoadingVersion && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Loading version history…
          </div>
        )}
        <SuitabilityForm
          clientId={effectiveClientId || ''}
          assessmentId={savedAssessmentId || undefined}
          isProspect={isProspect}
          mode={canEdit ? (isProspect ? 'create' : 'edit') : 'view'}
          onCancel={() => router.back()}
          onAssessmentIdChange={handleAssessmentIdChange}
          allowAI={!isProspect && canEdit}
        />
      </div>
    </div>
  )
}
