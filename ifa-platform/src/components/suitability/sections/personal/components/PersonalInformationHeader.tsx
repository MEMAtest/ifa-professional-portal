import React from 'react'

import { AlertTriangle, CheckCircle, Clock, Eye, EyeOff, Loader2, Lock, Save, Sparkles, Unlock, User } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CardHeader } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'

type SaveState = {
  isSaving: boolean
  lastSaved: Date | string | null
  lastError: string | null
}

interface PersonalInformationHeaderProps {
  completionScore: number
  effectiveSaveState: SaveState
  hasUnsavedChanges: boolean
  autoSaveEnabled: boolean
  onManualSave?: () => void
  collaborators: string[]
  isProspect: boolean
  showSensitiveData: boolean
  onToggleSensitiveData: () => void
  showAI: boolean
  isReadOnly: boolean
  isLoadingAI: boolean
  onAiAssistClick: () => void
}

export function PersonalInformationHeader(props: PersonalInformationHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Personal Information</h3>
          {props.completionScore > 0 && (
            <Badge variant={props.completionScore === 100 ? 'success' : 'default'} className="ml-2">
              {props.completionScore}% Complete
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            {props.effectiveSaveState.isSaving && (
              <div className="flex items-center gap-1 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}

            {!props.effectiveSaveState.isSaving && props.effectiveSaveState.lastSaved && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Saved {new Date(props.effectiveSaveState.lastSaved).toLocaleTimeString()}</span>
              </div>
            )}

            {props.effectiveSaveState.lastError && (
              <div className="flex items-center gap-1 text-red-600" title={props.effectiveSaveState.lastError}>
                <AlertTriangle className="h-4 w-4" />
                <span>Save failed</span>
              </div>
            )}

            {props.hasUnsavedChanges && !props.effectiveSaveState.isSaving && (
              <div className="flex items-center gap-1 text-yellow-600">
                <Clock className="h-4 w-4" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>

          {!props.autoSaveEnabled && props.onManualSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={props.onManualSave}
              disabled={!props.hasUnsavedChanges || props.effectiveSaveState.isSaving}
            >
              <Save className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Save</span>
            </Button>
          )}

          {props.collaborators.length > 0 && (
            <div className="flex -space-x-2">
              {props.collaborators.slice(0, 3).map((collaborator, idx) => (
                <div
                  key={idx}
                  className="h-8 w-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                  title={collaborator}
                >
                  {collaborator[0]?.toUpperCase()}
                </div>
              ))}
              {props.collaborators.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                  +{props.collaborators.length - 3}
                </div>
              )}
            </div>
          )}

          {props.isProspect && (
            <Button size="sm" variant="ghost" onClick={props.onToggleSensitiveData}>
              {props.showSensitiveData ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span className="sr-only">Hide sensitive data</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Show sensitive data</span>
                </>
              )}
            </Button>
          )}

          {props.showAI && !props.isReadOnly && (
            <Button size="sm" variant="outline" onClick={props.onAiAssistClick} disabled={props.isLoadingAI}>
              {props.isLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">AI Assist</span>
            </Button>
          )}

          <div>
            {props.isReadOnly ? <Lock className="h-4 w-4 text-gray-400" /> : <Unlock className="h-4 w-4 text-green-500" />}
            <span className="sr-only">{props.isReadOnly ? 'Read-only' : 'Editable'}</span>
          </div>
        </div>
      </div>

      {props.completionScore < 100 && <Progress value={props.completionScore} className="mt-2 h-2" />}
    </CardHeader>
  )
}

