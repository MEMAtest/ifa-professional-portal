// =====================================================
// FILE: src/components/suitability/VersionComparison.tsx
// COMPLETE VERSION COMPARISON WITH DIFF VISUALIZATION
// =====================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertCircle, GitCompare, Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { createClient } from '@/lib/supabase/client'
import type { AssessmentVersionInfo } from '@/types/suitability-version'

import { ComparisonSummaryTab } from './version-comparison/components/ComparisonSummaryTab'
import { SectionComparison } from './version-comparison/components/SectionComparison'
import { VersionSelectors } from './version-comparison/components/VersionSelectors'
import { calculateDifferences, groupDifferencesBySection, summarizeDifferences } from './version-comparison/diffUtils'
import type { ComparisonTab, SimpleFormData, VersionComparisonProps, VersionDifference } from './version-comparison/types'

// =====================================================
// MAIN COMPONENT
// =====================================================

export const VersionComparison: React.FC<VersionComparisonProps> = ({
  clientId,
  currentVersionId,
  onVersionSelect,
  className,
  showFullComparison = true,
  autoLoad = true
}) => {
  const [versions, setVersions] = useState<AssessmentVersionInfo[]>([])
  const [selectedVersions, setSelectedVersions] = useState<[string | undefined, string | undefined]>([undefined, undefined])
  const [versionData, setVersionData] = useState<Record<string, SimpleFormData>>({})
  const [differences, setDifferences] = useState<VersionDifference[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ComparisonTab>('summary')
  
  const supabase = useMemo(() => createClient(), [])

  // Load versions from database
  const loadVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load version history directly from database
      const { data, error } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('version_number', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      const history = (data || []) as AssessmentVersionInfo[]
      setVersions(history)

      // Auto-select versions if provided
      if (currentVersionId && history.length > 0) {
        const currentIndex = history.findIndex(v => v.id === currentVersionId)
        if (currentIndex >= 0 && currentIndex < history.length - 1) {
          setSelectedVersions([history[currentIndex + 1].id, currentVersionId])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, currentVersionId, supabase])

  // Load version data
  const loadVersionData = useCallback(async (versionId: string) => {
    if (versionData[versionId]) return // Already loaded

    try {
      // Load specific version from database directly
      const { data, error } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('id', versionId)
        .single()

      if (error) throw error
      
      // Transform database data to our simplified format
      const formData: SimpleFormData = {
        id: data.id,
        client_id: data.client_id,
        personal_information: data.personal_circumstances || {},
        financial_situation: data.financial_situation || {},
        objectives: data.objectives || data.investment_objectives || {},
        risk_assessment: data.risk_assessment || data.risk_profile || {},
        knowledge_experience: data.knowledge_experience || {},
        existing_arrangements: data.existing_arrangements || {},
        vulnerability_assessment: data.vulnerability || {},
        regulatory_compliance: data.regulatory || {},
        recommendations: data.recommendations || {},
        metadata: data.metadata || {}
      }
      
      setVersionData(prev => ({ ...prev, [versionId]: formData }))
    } catch (err) {
      console.error(`Failed to load version ${versionId}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load version data')
    }
  }, [versionData, supabase])

  const summary = useMemo(
    () => summarizeDifferences({ differences, versions, selectedVersions }),
    [differences, selectedVersions, versions]
  )

  const differencesBySection = useMemo(() => groupDifferencesBySection(differences), [differences])

  // Handle version selection
  const handleVersionSelect = (versionId: string, position: 0 | 1) => {
    const selectedId = versionId || undefined
    const newSelection: [string | undefined, string | undefined] = [...selectedVersions]
    newSelection[position] = selectedId
    setSelectedVersions(newSelection)

    if (selectedId) {
      void loadVersionData(selectedId)
      if (position === 1) onVersionSelect?.(selectedId)
    }
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Update differences when selections change
  useEffect(() => {
    if (selectedVersions[0] && selectedVersions[1] && 
        versionData[selectedVersions[0]] && versionData[selectedVersions[1]]) {
      const diffs = calculateDifferences(
        versionData[selectedVersions[0]], 
        versionData[selectedVersions[1]]
      )
      setDifferences(diffs)
    }
  }, [selectedVersions, versionData, calculateDifferences])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadVersions()
    }
  }, [autoLoad, loadVersions])

  if (isLoading && versions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Version Comparison
        </CardTitle>
        <CardDescription>
          Compare changes between different assessment versions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <VersionSelectors versions={versions} selected={selectedVersions} onSelect={handleVersionSelect} />

        {/* Comparison Results */}
        {selectedVersions[0] && selectedVersions[1] && (
          showFullComparison ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ComparisonTab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="details">Detailed Changes</TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <ComparisonSummaryTab summary={summary} />
              </TabsContent>

              <TabsContent value="details" className="space-y-3 mt-4">
                {Object.entries(differencesBySection).map(([section, sectionDiffs]) => (
                  <SectionComparison
                    key={section}
                    sectionName={section}
                    differences={sectionDiffs}
                    isExpanded={expandedSections.has(section)}
                    onToggle={() => toggleSection(section)}
                  />
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <ComparisonSummaryTab summary={summary} />
          )
        )}
      </CardContent>
    </Card>
  )
}

export default VersionComparison
