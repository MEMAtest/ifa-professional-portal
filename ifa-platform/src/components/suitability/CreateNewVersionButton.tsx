// =====================================================
// FILE: src/components/suitability/CreateNewVersionButton.tsx
// COMPLETE VERSIONING BUTTON WITH MODAL & ERROR HANDLING
// =====================================================

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  FileText,
  Copy,
  History,
  Lock,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { SuitabilityDataService } from '@/services/suitability/SuitabilityDataService'
import { createClient } from '@/lib/supabase/client'  // Use your browser client
import type { Database } from '@/types/database.types'

// =====================================================
// TYPES - Based on database schema
// =====================================================

// Define the type based on the suitability_assessments table structure
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

interface CreateNewVersionButtonProps {
  clientId: string
  currentAssessmentId?: string
  currentVersion?: AssessmentVersionInfo
  onVersionCreated?: (newVersion: AssessmentVersionInfo) => void
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  showHistory?: boolean
}

interface VersionCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  currentVersion?: AssessmentVersionInfo
  isLoading?: boolean
}

// =====================================================
// VERSION CREATION MODAL
// =====================================================

const VersionCreationModal: React.FC<VersionCreationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentVersion,
  isLoading = false
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for creating a new version')
      return
    }

    try {
      setError(null)
      await onConfirm(reason)
      setReason('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Create New Version
          </CardTitle>
          <CardDescription>
            Create a new draft version based on the current assessment
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Version Info */}
          {currentVersion && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Version:</span>
                <Badge variant="outline">v{currentVersion.version_number || 1}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <Badge variant={currentVersion.is_final ? 'default' : 'secondary'}>
                  {currentVersion.is_final ? 'Final' : 'Draft'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Completion:</span>
                <span className="font-medium">{currentVersion.completion_percentage || 0}%</span>
              </div>
              {currentVersion.created_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span>{format(new Date(currentVersion.created_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for New Version <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Annual review, change in circumstances, regulatory update..."
              rows={3}
              className={cn(error && "border-red-500")}
            />
            <p className="text-sm text-gray-600">
              This will be recorded in the version history for audit purposes
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              A new draft will be created with all current data. The current version will be preserved and marked as the parent.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Version
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const CreateNewVersionButton: React.FC<CreateNewVersionButtonProps> = ({
  clientId,
  currentAssessmentId,
  currentVersion,
  onVersionCreated,
  className,
  variant = 'outline',
  size = 'default',
  disabled = false,
  showHistory = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [versionHistory, setVersionHistory] = useState<AssessmentVersionInfo[]>([])
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()  // Create client instance

  // Load version history directly from database
  const loadVersionHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('version_number', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        setVersionHistory(data as AssessmentVersionInfo[])
      }
    } catch (err) {
      console.error('Failed to load version history:', err)
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive'
      })
    }
  }, [clientId, toast, supabase])

  // Create new version
  const handleCreateVersion = useCallback(async (reason: string) => {
    if (!currentAssessmentId) {
      toast({
        title: 'No Assessment',
        description: 'No current assessment to create a version from',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const dataService = new SuitabilityDataService()
      
      // Get current assessment data
      const { data: currentAssessment, error: fetchError } = await supabase
        .from('suitability_assessments')
        .select('*')
        .eq('id', currentAssessmentId)
        .single()

      if (fetchError || !currentAssessment) {
        throw new Error('Failed to fetch current assessment')
      }

      // Create new version with proper parameters
      const result = await dataService.createNewVersion(
        clientId,
        currentAssessmentId,
        reason
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create new version')
      }

      // Transform the response to match our type
      const newVersion: AssessmentVersionInfo = {
        id: result.data.id,
        client_id: clientId,
        version_number: result.data.versionNumber,
        parent_assessment_id: result.data.parentVersionId,
        created_at: result.data.createdAt,
        updated_at: result.data.updatedAt,
        completion_percentage: result.data.completionPercentage,
        status: result.data.status,
        is_final: false,
        is_draft: true,
        is_current: true,
        assessment_reason: reason,
        created_by: result.data.createdBy
      }

      toast({
        title: 'Version Created',
        description: `Version ${newVersion.version_number} has been created successfully`,
        variant: 'default'
      })

      if (onVersionCreated) {
        onVersionCreated(newVersion)
      }

      // Navigate to the new version
      router.push(`/assessments/suitability?clientId=${clientId}&assessmentId=${newVersion.id}`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version'
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
      setIsModalOpen(false)
    }
  }, [clientId, currentAssessmentId, router, toast, onVersionCreated, supabase])

  // Check if can create new version
  const canCreateVersion = currentVersion 
    ? (currentVersion.is_final || (currentVersion.completion_percentage && currentVersion.completion_percentage >= 100))
    : false

  // Handle button click
  const handleClick = () => {
    if (!canCreateVersion && currentVersion) {
      toast({
        title: 'Cannot Create Version',
        description: 'Complete or finalize the current assessment first',
        variant: 'destructive'
      })
      return
    }
    setIsModalOpen(true)
  }

  // Load history on mount if needed
  React.useEffect(() => {
    if (showHistory && clientId) {
      loadVersionHistory()
    }
  }, [showHistory, clientId, loadVersionHistory])

  return (
    <>
      <div className={cn("relative", className)}>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={disabled || isCreating || !currentAssessmentId}
          className={cn(
            !canCreateVersion && "opacity-50 cursor-not-allowed"
          )}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              New Version
            </>
          )}
        </Button>

        {/* Version History Dropdown */}
        {showHistory && versionHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            className="ml-2"
          >
            <History className="h-4 w-4" />
          </Button>
        )}

        {/* History Dropdown Content */}
        {showHistoryDropdown && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-white border rounded-lg shadow-lg z-50">
            <div className="p-3 border-b">
              <h4 className="font-medium text-sm">Version History</h4>
            </div>
            <div className="max-h-64 overflow-auto">
              {versionHistory.map((version) => (
                <button
                  key={version.id}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    router.push(`/assessments/suitability?clientId=${clientId}&assessmentId=${version.id}`)
                    setShowHistoryDropdown(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">v{version.version_number || 1}</div>
                      <div className="text-xs text-gray-500">
                        {version.created_at ? format(new Date(version.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {version.is_final && <Lock className="h-3 w-3 text-gray-400" />}
                    <Badge variant={version.is_final ? 'default' : 'outline'} className="text-xs">
                      {version.completion_percentage || 0}%
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Version Creation Modal */}
      <VersionCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCreateVersion}
        currentVersion={currentVersion}
        isLoading={isCreating}
      />
    </>
  )
}

// Export the type for use in other components
export type { AssessmentVersionInfo }
export default CreateNewVersionButton