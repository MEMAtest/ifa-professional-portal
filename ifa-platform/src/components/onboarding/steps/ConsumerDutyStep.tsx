'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useFirm } from '@/modules/firm/hooks/useFirm'
import { useToast } from '@/hooks/use-toast'
import { ShieldCheck, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'

interface ConsumerDutyStepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export default function ConsumerDutyStep({ onNext, onBack, onSkip }: ConsumerDutyStepProps) {
  const { firm, updateFirmAsync, isUpdating } = useFirm()
  const { toast } = useToast()

  const [consumerDutyEnabled, setConsumerDutyEnabled] = useState(
    firm?.settings?.compliance?.consumerDutyEnabled ?? true
  )
  const [autoReviewReminders, setAutoReviewReminders] = useState(
    firm?.settings?.compliance?.autoReviewReminders ?? true
  )
  const [reviewFrequencyMonths, setReviewFrequencyMonths] = useState(
    String(firm?.settings?.compliance?.reviewFrequencyMonths ?? 12)
  )

  const handleSave = async () => {
    try {
      await updateFirmAsync({
        settings: {
          compliance: {
            tr241Enabled: firm?.settings?.compliance?.tr241Enabled ?? true,
            consumerDutyEnabled,
            autoReviewReminders,
            reviewFrequencyMonths: Number(reviewFrequencyMonths),
          },
        },
      })

      toast({
        title: 'Compliance settings saved',
        description: 'Consumer duty preferences have been updated.',
      })
      onNext()
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save compliance settings.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Consumer Duty</h2>
        <p className="text-gray-600 mt-1">
          Configure your compliance settings for FCA Consumer Duty obligations.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Compliance Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Consumer Duty Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Consumer Duty Enabled</Label>
              <p className="text-sm text-gray-500 mt-0.5">
                Track and evidence Consumer Duty compliance across all client interactions.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={consumerDutyEnabled}
              onClick={() => setConsumerDutyEnabled(!consumerDutyEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                consumerDutyEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  consumerDutyEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto Review Reminders Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Automatic Review Reminders</Label>
              <p className="text-sm text-gray-500 mt-0.5">
                Automatically schedule client review reminders based on the review frequency.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoReviewReminders}
              onClick={() => setAutoReviewReminders(!autoReviewReminders)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                autoReviewReminders ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoReviewReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Review Frequency Select */}
          <div>
            <Label className="text-base font-medium">Review Frequency</Label>
            <p className="text-sm text-gray-500 mt-0.5 mb-2">
              How often should client reviews be scheduled?
            </p>
            <Select
              value={reviewFrequencyMonths}
              onValueChange={setReviewFrequencyMonths}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Every 6 months</SelectItem>
                <SelectItem value="12">Every 12 months</SelectItem>
                <SelectItem value="24">Every 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onSkip} className="gap-2 text-gray-500">
            <SkipForward className="w-4 h-4" />
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={isUpdating} loading={isUpdating} className="gap-2">
            Save &amp; Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
