import React from 'react'
import { Loader2, Save, Send, Shield, Sparkles, Users, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { SaveStatusIndicator } from '@/components/suitability/SaveStatusIndicator'
import { SuitabilityFormProgress, type SectionDefinition } from './SuitabilityFormProgress'
import type { SaveStatus } from '@/hooks/suitability/useSaveMutex'

type Props = {
  mode: 'create' | 'edit' | 'view'
  isProspect: boolean
  isOnline: boolean
  allowAI: boolean

  onCancel?: () => void

  saveStatus: {
    status: SaveStatus
    lastSaved: Date | null
    lastError: string | null
    pendingChanges?: boolean
    onRetry?: () => void
  }

  isSaving: boolean
  onSaveDraft: () => Promise<void>

  isSubmitting: boolean
  completionScore: number
  onSubmit: () => void

  validationIssueCount: number
  onToggleValidation: () => void

  onToggleAI: () => void

  progress: {
    sections: SectionDefinition[]
    currentSection: string
    completedSections: string[]
    completionPercentage: number
    sectionProgress: Record<string, number>
    sectionErrors: Record<string, boolean>
  }
}

export function SuitabilityHeaderBar(props: Props) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Suitability Assessment</h1>
            <Badge variant={props.mode === 'view' ? 'secondary' : 'default'}>
              {props.mode === 'view' ? 'Read Only' : props.mode === 'edit' ? 'Editing' : 'Creating'}
            </Badge>
            {props.isProspect && (
              <Badge variant="outline" className="bg-orange-50">
                <Users className="h-3 w-3 mr-1" />
                Prospect
              </Badge>
            )}
            {!props.isOnline && (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <SaveStatusIndicator
              status={props.saveStatus.status}
              lastSaved={props.saveStatus.lastSaved}
              lastError={props.saveStatus.lastError}
              pendingChanges={props.saveStatus.pendingChanges}
              onRetry={props.saveStatus.onRetry}
              showTimestamp={true}
            />

            {props.onCancel && (
              <Button variant="ghost" size="sm" onClick={props.onCancel}>
                Cancel
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={props.onToggleValidation}
              className={cn(props.validationIssueCount > 0 && 'border-red-500 text-red-600')}
            >
              <Shield className="h-4 w-4" />
              {props.validationIssueCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {props.validationIssueCount}
                </Badge>
              )}
            </Button>

            {props.allowAI && (
              <Button variant="outline" size="sm" onClick={props.onToggleAI}>
                <Sparkles className="h-4 w-4" />
                AI Helper
              </Button>
            )}

            {props.mode !== 'view' && (
              <Button variant="outline" size="sm" onClick={props.onSaveDraft} disabled={props.isSaving}>
                {props.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </Button>
            )}

            {props.mode !== 'view' && (
              <Button size="sm" onClick={props.onSubmit} disabled={props.completionScore < 80 || props.isSubmitting}>
                {props.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <SuitabilityFormProgress
            sections={props.progress.sections}
            currentSection={props.progress.currentSection}
            completedSections={props.progress.completedSections}
            completionPercentage={props.progress.completionPercentage}
            sectionProgress={props.progress.sectionProgress}
            sectionErrors={props.progress.sectionErrors}
          />
        </div>
      </div>
    </div>
  )
}
