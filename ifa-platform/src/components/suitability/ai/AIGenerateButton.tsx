import React, { useCallback, useMemo, useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { generateSuitabilityFieldText } from '@/services/suitability/aiFieldGeneration'
import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'

type GenerateStatus = 'idle' | 'loading' | 'success' | 'error'

type AIGenerateButtonProps = {
  clientId?: string
  assessmentId?: string
  fieldId: string
  formData: SuitabilityFormData
  pulledData?: PulledPlatformData
  onGenerated: (text: string) => void
  disabled?: boolean
}

export function AIGenerateButton(props: AIGenerateButtonProps) {
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isReady = Boolean(props.clientId && props.assessmentId)
  const isDisabled = props.disabled || !isReady || status === 'loading'

  const buttonLabel = useMemo(() => {
    if (status === 'loading') return 'Generating...'
    if (status === 'success') return 'Generated'
    if (status === 'error') return 'Try again'
    return 'Generate'
  }, [status])

  const handleGenerate = useCallback(async () => {
    if (isDisabled || !props.clientId || !props.assessmentId) return
    setStatus('loading')
    setErrorMessage(null)
    try {
      const generatedText = await generateSuitabilityFieldText({
        clientId: props.clientId,
        assessmentId: props.assessmentId,
        fieldId: props.fieldId,
        formData: props.formData,
        pulledData: props.pulledData
      })
      props.onGenerated(generatedText)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 1500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      setErrorMessage(message)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }, [isDisabled, props])

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={handleGenerate}
        disabled={isDisabled}
      >
        {status === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === 'success' && <Check className="h-3 w-3 text-green-600" />}
        {status === 'error' && <X className="h-3 w-3 text-red-600" />}
        {status === 'idle' && <Sparkles className="h-3 w-3 text-blue-600" />}
        {buttonLabel}
      </Button>
      {!isReady && <span className="text-[11px] text-gray-400">Save draft to enable AI</span>}
      {errorMessage && status === 'error' && <span className="text-[11px] text-red-600">{errorMessage}</span>}
    </div>
  )
}
