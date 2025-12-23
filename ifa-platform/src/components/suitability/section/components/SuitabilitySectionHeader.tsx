import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

import { CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'

import { Activity, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, Lock, Sparkles, Unlock } from 'lucide-react'

import type { SectionStatus } from '../sectionFieldUtils'
import type { ValidationError } from '@/types/suitability'

interface SuitabilitySectionHeaderProps {
  variant: 'default' | 'financial'
  title: string
  description?: string
  SectionIcon: React.ElementType
  sectionStatus: SectionStatus
  sectionCompletion: number
  validationErrors: ValidationError[]
  baseFieldsCount: number
  allFieldsCount: number
  collaborators?: string[]
  isSaving?: boolean
  isReadOnly?: boolean
  isLoadingAI?: boolean
  showAIButton?: boolean
  onGetAISuggestion?: () => void
  localExpanded: boolean
  onToggle: () => void
  className?: string
}

export function SuitabilitySectionHeader(props: SuitabilitySectionHeaderProps) {
  const conditionalFieldsCount = Math.max(0, props.allFieldsCount - props.baseFieldsCount)
  const iconColorClassName = cn(
    'h-5 w-5 transition-colors',
    props.sectionStatus === 'complete' && 'text-green-600',
    props.sectionStatus === 'error' && 'text-red-600',
    props.sectionStatus === 'warning' && 'text-yellow-600',
    props.sectionStatus === 'partial' && 'text-blue-600',
    props.sectionStatus === 'incomplete' && 'text-gray-400'
  )

  return (
    <CardHeader className={cn('cursor-pointer', props.className)} onClick={props.onToggle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <props.SectionIcon className={iconColorClassName} />
          <div>
            <h3 className="text-lg font-semibold">{props.title}</h3>
            {props.description && <p className="text-sm text-gray-500 mt-1">{props.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {props.variant === 'default' && props.collaborators && props.collaborators.length > 0 && (
            <div className="flex -space-x-2">
              {props.collaborators.slice(0, 3).map((user, index) => (
                <div
                  key={index}
                  className="h-6 w-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white"
                  title={user}
                >
                  {user[0]?.toUpperCase()}
                </div>
              ))}
              {props.collaborators.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white">
                  +{props.collaborators.length - 3}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {conditionalFieldsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {props.variant === 'financial' ? `+${conditionalFieldsCount} conditional` : `+${conditionalFieldsCount} fields`}
              </Badge>
            )}

            {props.sectionStatus === 'complete' && (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Complete
              </Badge>
            )}

            {props.sectionStatus === 'error' && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {props.variant === 'financial'
                  ? `${props.validationErrors.length} Error${props.validationErrors.length !== 1 ? 's' : ''}`
                  : props.validationErrors.length}
              </Badge>
            )}

            {props.sectionStatus === 'partial' && (
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3" />
                {props.sectionCompletion}%
              </Badge>
            )}

            {props.variant === 'default' && props.isSaving && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving
              </Badge>
            )}
          </div>

          {props.showAIButton && props.onGetAISuggestion && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation()
                props.onGetAISuggestion?.()
              }}
              disabled={props.isLoadingAI}
              title={props.variant === 'default' ? 'Get AI suggestions' : undefined}
            >
              {props.isLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
            </Button>
          )}

          {props.variant === 'default' && (props.isReadOnly ? <Lock className="h-4 w-4 text-gray-400" /> : <Unlock className="h-4 w-4 text-gray-300" />)}

          {props.variant === 'financial' ? (
            props.localExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )
          ) : (
            <motion.div animate={{ rotate: props.localExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </motion.div>
          )}
        </div>
      </div>

      {props.sectionCompletion < 100 && <Progress value={props.sectionCompletion} className="mt-3 h-2" />}
    </CardHeader>
  )
}

