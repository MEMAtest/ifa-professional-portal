// =====================================================
// FILE: src/components/suitability/VersionComparison.tsx
// COMPLETE VERSION COMPARISON WITH DIFF VISUALIZATION
// =====================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  GitCompare, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  ArrowRight,
  Clock,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { SuitabilityDataService } from '@/services/suitability/SuitabilityDataService'
import type { SuitabilityFormData } from '@/types/suitability'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// Define the AssessmentVersionInfo type based on database schema
interface AssessmentVersionInfo {
  id: string
  client_id: string
  version_number: number | null
  parent_assessment_id: string | null
  created_at: string | null
  updated_at: string | null
  completion_percentage: number | null
  status: string | null
  is_final: boolean | null
  is_draft: boolean | null
  is_current: boolean | null
  assessment_reason?: string | null
  created_by?: string | null
}

// =====================================================
// TYPES
// =====================================================

interface VersionComparisonProps {
  clientId: string
  currentVersionId?: string
  onVersionSelect?: (versionId: string) => void
  className?: string
  showFullComparison?: boolean
  autoLoad?: boolean
}

interface VersionDifference {
  section: string
  field: string
  oldValue: any
  newValue: any
  changeType: 'added' | 'removed' | 'modified' | 'unchanged'
  importance: 'critical' | 'important' | 'minor'
}

interface ComparisonSummary {
  totalChanges: number
  addedFields: number
  removedFields: number
  modifiedFields: number
  completionChange: number
  criticalChanges: string[]
}

// Simple type for version data storage
interface SimpleFormData {
  id?: string
  client_id?: string
  personal_information?: any
  financial_situation?: any
  objectives?: any
  risk_assessment?: any
  knowledge_experience?: any
  existing_arrangements?: any
  vulnerability_assessment?: any
  regulatory_compliance?: any
  recommendations?: any
  metadata?: any
  [key: string]: any // Allow additional properties
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const compareValues = (oldVal: any, newVal: any): 'added' | 'removed' | 'modified' | 'unchanged' => {
  if (oldVal === newVal) return 'unchanged'
  if (!oldVal && newVal) return 'added'
  if (oldVal && !newVal) return 'removed'
  return 'modified'
}

const getChangeIcon = (changeType: string) => {
  switch (changeType) {
    case 'added':
      return <Plus className="h-4 w-4 text-green-600" />
    case 'removed':
      return <X className="h-4 w-4 text-red-600" />
    case 'modified':
      return <ArrowRight className="h-4 w-4 text-blue-600" />
    default:
      return <Minus className="h-4 w-4 text-gray-400" />
  }
}

const getImportance = (section: string, field: string): 'critical' | 'important' | 'minor' => {
  const criticalFields = ['risk_tolerance', 'capacity_for_loss', 'investment_amount', 'vulnerability']
  const importantFields = ['objectives', 'time_horizon', 'knowledge_experience']
  
  if (criticalFields.some(f => field.includes(f))) return 'critical'
  if (importantFields.some(f => field.includes(f))) return 'important'
  return 'minor'
}

// =====================================================
// SECTION COMPARISON COMPONENT
// =====================================================

interface SectionComparisonProps {
  sectionName: string
  differences: VersionDifference[]
  isExpanded: boolean
  onToggle: () => void
}

const SectionComparison: React.FC<SectionComparisonProps> = ({
  sectionName,
  differences,
  isExpanded,
  onToggle
}) => {
  const changeCount = differences.filter(d => d.changeType !== 'unchanged').length
  const hasChanges = changeCount > 0

  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium capitalize">
            {sectionName.replace(/_/g, ' ')}
          </span>
          {hasChanges && (
            <Badge variant="outline" className="ml-2">
              {changeCount} change{changeCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {differences.some(d => d.importance === 'critical') && (
            <Badge variant="destructive" className="text-xs">Critical</Badge>
          )}
          {!hasChanges && (
            <Badge variant="secondary" className="text-xs">No changes</Badge>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-2">
          {differences.map((diff, index) => (
            <div
              key={`${diff.section}-${diff.field}-${index}`}
              className={cn(
                "flex items-start gap-3 p-2 rounded-md",
                diff.changeType === 'unchanged' && "opacity-50",
                diff.changeType !== 'unchanged' && "bg-gray-50"
              )}
            >
              <div className="mt-1">{getChangeIcon(diff.changeType)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {diff.field.replace(/_/g, ' ')}
                  </span>
                  {diff.importance === 'critical' && (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                </div>
                {diff.changeType !== 'unchanged' && (
                  <div className="text-sm text-gray-600">
                    {diff.changeType === 'added' && (
                      <span className="text-green-600">Added: {JSON.stringify(diff.newValue)}</span>
                    )}
                    {diff.changeType === 'removed' && (
                      <span className="text-red-600">Removed: {JSON.stringify(diff.oldValue)}</span>
                    )}
                    {diff.changeType === 'modified' && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{JSON.stringify(diff.oldValue)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-blue-600">{JSON.stringify(diff.newValue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {differences.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">No data in this section</p>
          )}
        </div>
      )}
    </div>
  )
}

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
  const [selectedVersions, setSelectedVersions] = useState<[string?, string?]>([])
  const [versionData, setVersionData] = useState<Record<string, SimpleFormData>>({})
  const [differences, setDifferences] = useState<VersionDifference[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary')
  
  const supabase = createClient()
  const dataService = new SuitabilityDataService()

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

  // Calculate differences
  const calculateDifferences = useCallback((v1: SimpleFormData, v2: SimpleFormData): VersionDifference[] => {
    const diffs: VersionDifference[] = []
    const sections = [
      'personal_information',
      'financial_situation',
      'objectives',
      'risk_assessment',
      'knowledge_experience',
      'existing_arrangements',
      'vulnerability_assessment',
      'regulatory_compliance'
    ]

    sections.forEach(section => {
      const oldSection = v1[section] || {}
      const newSection = v2[section] || {}
      const allFields = new Set([
        ...Object.keys(oldSection),
        ...Object.keys(newSection)
      ])

      allFields.forEach(field => {
        const oldValue = oldSection[field]
        const newValue = newSection[field]
        const changeType = compareValues(oldValue, newValue)

        diffs.push({
          section,
          field,
          oldValue,
          newValue,
          changeType,
          importance: getImportance(section, field)
        })
      })
    })

    return diffs
  }, [])

  // Generate comparison summary
  const summary = useMemo<ComparisonSummary>(() => {
    const result: ComparisonSummary = {
      totalChanges: 0,
      addedFields: 0,
      removedFields: 0,
      modifiedFields: 0,
      completionChange: 0,
      criticalChanges: []
    }

    differences.forEach(diff => {
      if (diff.changeType !== 'unchanged') {
        result.totalChanges++
        if (diff.changeType === 'added') result.addedFields++
        if (diff.changeType === 'removed') result.removedFields++
        if (diff.changeType === 'modified') result.modifiedFields++
        if (diff.importance === 'critical') {
          result.criticalChanges.push(`${diff.section}.${diff.field}`)
        }
      }
    })

    // Calculate completion change if both versions selected
    if (selectedVersions[0] && selectedVersions[1]) {
      const v1 = versions.find(v => v.id === selectedVersions[0])
      const v2 = versions.find(v => v.id === selectedVersions[1])
      if (v1 && v2) {
        result.completionChange = (v2.completion_percentage || 0) - (v1.completion_percentage || 0)
      }
    }

    return result
  }, [differences, selectedVersions, versions])

  // Group differences by section
  const differencesBySection = useMemo(() => {
    const grouped: Record<string, VersionDifference[]> = {}
    differences.forEach(diff => {
      if (!grouped[diff.section]) {
        grouped[diff.section] = []
      }
      grouped[diff.section].push(diff)
    })
    return grouped
  }, [differences])

  // Handle version selection
  const handleVersionSelect = (version: string, position: 0 | 1) => {
    const newSelection: [string?, string?] = [...selectedVersions]
    newSelection[position] = version
    setSelectedVersions(newSelection)

    // Load data for selected version
    if (version) {
      loadVersionData(version)
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
        {/* Version Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">From Version</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedVersions[0] || ''}
              onChange={(e) => handleVersionSelect(e.target.value, 0)}
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number || 1} - {v.created_at ? format(new Date(v.created_at), 'MMM d, yyyy') : 'Unknown'}
                  {v.is_final && ' (Final)'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To Version</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedVersions[1] || ''}
              onChange={(e) => handleVersionSelect(e.target.value, 1)}
            >
              <option value="">Select version...</option>
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number || 1} - {v.created_at ? format(new Date(v.created_at), 'MMM d, yyyy') : 'Unknown'}
                  {v.is_final && ' (Final)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Results */}
        {selectedVersions[0] && selectedVersions[1] && (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="details">Detailed Changes</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{summary.totalChanges}</div>
                      <div className="text-sm text-gray-600">Total Changes</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        +{summary.addedFields}
                      </div>
                      <div className="text-sm text-gray-600">Added</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {summary.modifiedFields}
                      </div>
                      <div className="text-sm text-gray-600">Modified</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-red-600">
                        -{summary.removedFields}
                      </div>
                      <div className="text-sm text-gray-600">Removed</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Completion Change */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Completion Progress</span>
                      <span className="text-sm text-gray-600">
                        {summary.completionChange > 0 ? '+' : ''}{summary.completionChange}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {summary.completionChange > 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {summary.completionChange < 0 && <TrendingDown className="h-4 w-4 text-red-600" />}
                      {summary.completionChange === 0 && <Minus className="h-4 w-4 text-gray-400" />}
                      <Progress 
                        value={Math.abs(summary.completionChange)} 
                        className="flex-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Changes */}
                {summary.criticalChanges.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{summary.criticalChanges.length} critical changes</strong> detected in:
                      <ul className="mt-2 space-y-1">
                        {summary.criticalChanges.map(change => (
                          <li key={change} className="text-sm">
                            • {change.replace(/_/g, ' ')}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
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
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default VersionComparison