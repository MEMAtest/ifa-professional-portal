import React from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, Save, Send, Shield, Sparkles, Users, WifiOff } from 'lucide-react'

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
  breadcrumbs?: Array<{ label: string; href?: string }>

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

  loadingState?: {
    message: string
    hint?: string
  }
}

export function SuitabilityHeaderBar(props: Props) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        {props.breadcrumbs && props.breadcrumbs.length > 0 && (
          <nav className="mb-3 flex flex-wrap items-center text-xs text-gray-500">
            {props.breadcrumbs.map((crumb, index) => {
              const isLast = index === props.breadcrumbs!.length - 1
              return (
                <div key={`${crumb.label}-${index}`} className="flex items-center">
                  {index > 0 && <ChevronRight className="mx-1 h-3.5 w-3.5 text-gray-300" />}
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="hover:text-gray-700 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-gray-800 font-medium' : ''}>{crumb.label}</span>
                  )}
                </div>
              )
            })}
          </nav>
        )}
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

        {props.loadingState && (
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{props.loadingState.message}</span>
              {props.loadingState.hint && <span className="text-blue-600">{props.loadingState.hint}</span>}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div className="h-1 w-1/2 animate-pulse rounded-full bg-blue-600" />
            </div>
          </div>
        )}

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
