'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useFirm } from '@/modules/firm/hooks/useFirm'
import { useToast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'

interface SignatureSetupStepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export default function SignatureSetupStep({ onNext, onBack, onSkip }: SignatureSetupStepProps) {
  const { firm, updateFirmAsync, isUpdating } = useFirm()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    phone: '',
    email: '',
  })

  // Pre-populate from existing firm/user data
  useEffect(() => {
    const branding = firm?.settings?.branding as Record<string, any> | undefined
    if (branding?.emailSignature) {
      // Try to parse existing signature HTML to extract values
      // Otherwise leave defaults
    }
    setFormData((prev) => ({
      name: prev.name || firm?.name || '',
      jobTitle: prev.jobTitle || '',
      phone: prev.phone || '',
      email: prev.email || '',
    }))
  }, [firm])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const escapeHtml = (text: string) =>
    text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m))

  const generateSignatureHtml = () => {
    const parts: string[] = []
    if (formData.name) parts.push(`<strong>${escapeHtml(formData.name)}</strong>`)
    if (formData.jobTitle) parts.push(escapeHtml(formData.jobTitle))
    if (formData.phone) parts.push(`Tel: ${escapeHtml(formData.phone)}`)
    if (formData.email) parts.push(escapeHtml(formData.email))
    return `<p>${parts.join('<br/>')}</p>`
  }

  const handleSave = async () => {
    if (!formData.name.trim() && !formData.email.trim()) {
      toast({
        title: 'Details required',
        description: 'Please enter at least a name or email, or skip this step.',
        variant: 'destructive',
      })
      return
    }

    try {
      const emailSignature = generateSignatureHtml()

      await updateFirmAsync({
        settings: {
          ...firm?.settings,
          branding: {
            ...firm?.settings?.branding,
            emailSignature,
          },
          compliance: {
            ...firm?.settings?.compliance,
            tr241Enabled: firm?.settings?.compliance?.tr241Enabled ?? true,
            consumerDutyEnabled: firm?.settings?.compliance?.consumerDutyEnabled ?? true,
            autoReviewReminders: firm?.settings?.compliance?.autoReviewReminders ?? true,
            reviewFrequencyMonths: firm?.settings?.compliance?.reviewFrequencyMonths ?? 12,
          },
          billing: {
            ...firm?.settings?.billing,
            maxSeats: firm?.settings?.billing?.maxSeats ?? 3,
            currentSeats: firm?.settings?.billing?.currentSeats ?? 0,
          },
          features: {
            ...firm?.settings?.features,
            cashFlowModeling: firm?.settings?.features?.cashFlowModeling ?? false,
            aiInsights: firm?.settings?.features?.aiInsights ?? false,
            advancedAnalytics: firm?.settings?.features?.advancedAnalytics ?? false,
          },
        } as any,
      })

      toast({
        title: 'Email signature saved',
        description: 'Your email signature has been configured.',
      })
      onNext()
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save email signature.',
        variant: 'destructive',
      })
    }
  }

  const hasContent = formData.name.trim() || formData.jobTitle.trim() || formData.phone.trim() || formData.email.trim()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Email Signature</h2>
        <p className="text-gray-600 mt-1">
          Configure the signature appended to client emails.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Signature Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sigName">Name</Label>
            <Input
              id="sigName"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. John Smith"
            />
          </div>

          <div>
            <Label htmlFor="sigJobTitle">Job Title</Label>
            <Input
              id="sigJobTitle"
              value={formData.jobTitle}
              onChange={(e) => handleChange('jobTitle', e.target.value)}
              placeholder="e.g. Senior Financial Adviser"
            />
          </div>

          <div>
            <Label htmlFor="sigPhone">Phone</Label>
            <Input
              id="sigPhone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. 020 1234 5678"
            />
          </div>

          <div>
            <Label htmlFor="sigEmail">Email</Label>
            <Input
              id="sigEmail"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. john@yourfirm.co.uk"
            />
          </div>
        </CardContent>
      </Card>

      {hasContent && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="text-sm text-gray-800 space-y-0.5">
                {formData.name && <p className="font-semibold">{formData.name}</p>}
                {formData.jobTitle && <p className="text-gray-600">{formData.jobTitle}</p>}
                {formData.phone && <p className="text-gray-600">Tel: {formData.phone}</p>}
                {formData.email && <p className="text-gray-600">{formData.email}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          <Button
            onClick={handleSave}
            disabled={isUpdating || !hasContent}
            loading={isUpdating}
            className="gap-2"
          >
            Save &amp; Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
