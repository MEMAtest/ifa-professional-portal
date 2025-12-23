// src/components/assessments/ShareAssessmentModal.tsx
// Modal for sharing assessments with clients via secure link

'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/use-toast'
import {
  Send,
  Copy,
  Mail,
  Clock,
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react'

interface ShareAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  clientEmail?: string
  onShareCreated?: (share: any) => void
}

type AssessmentType = 'atr' | 'cfl' | 'investor_persona'

const ASSESSMENT_OPTIONS: { value: AssessmentType; label: string; description: string }[] = [
  {
    value: 'atr',
    label: 'Attitude to Risk (ATR)',
    description: 'Measures client\'s comfort with investment risk'
  },
  {
    value: 'cfl',
    label: 'Capacity for Loss (CFL)',
    description: 'Evaluates financial ability to absorb losses'
  },
  {
    value: 'investor_persona',
    label: 'Investor Persona',
    description: 'Determines investment personality and preferences'
  }
]

export default function ShareAssessmentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail: initialEmail = '',
  onShareCreated
}: ShareAssessmentModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)

  // Form state
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('atr')
  const [clientEmail, setClientEmail] = useState(initialEmail)
  const [expiryDays, setExpiryDays] = useState('7')
  const [customMessage, setCustomMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(true)

  // Success state
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter the client\'s email address',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/assessments/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          assessmentType,
          clientEmail,
          clientName,
          expiryDays: parseInt(expiryDays),
          customMessage: customMessage || undefined,
          sendEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link')
      }

      setShareUrl(data.share.shareUrl)
      setStep('success')

      if (onShareCreated) {
        onShareCreated(data.share)
      }

      toast({
        title: 'Assessment Link Created',
        description: sendEmail
          ? `Invitation sent to ${clientEmail}`
          : 'Link ready to share',
      })

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create share link',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: 'Link Copied',
        description: 'Share link copied to clipboard'
      })
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Please copy the link manually',
        variant: 'destructive'
      })
    }
  }

  const handleClose = () => {
    setStep('form')
    setShareUrl('')
    setCopied(false)
    setCustomMessage('')
    onClose()
  }

  const selectedAssessment = ASSESSMENT_OPTIONS.find(a => a.value === assessmentType)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Send Assessment to Client
              </DialogTitle>
              <DialogDescription>
                Send {clientName} a secure link to complete an assessment questionnaire.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {/* Assessment Type */}
              <div className="space-y-2">
                <Label htmlFor="assessmentType">Assessment Type</Label>
                <Select
                  value={assessmentType}
                  onValueChange={(val) => setAssessmentType(val as AssessmentType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAssessment && (
                  <p className="text-xs text-gray-500">{selectedAssessment.description}</p>
                )}
              </div>

              {/* Client Email */}
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="client@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label htmlFor="expiryDays">Link Expires In</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger className="pl-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="customMessage">Personal Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Add a personal note to include in the email..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Send Email Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="sendEmail" className="text-sm">
                  <span className="font-medium text-gray-900">Send email invitation</span>
                  <p className="text-gray-500 text-xs">
                    Client will receive an email with the assessment link
                  </p>
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Assessment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Assessment Link Created
              </DialogTitle>
              <DialogDescription>
                {sendEmail
                  ? `An invitation has been sent to ${clientEmail}`
                  : 'Share this link with your client'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Link display */}
              <div className="space-y-2">
                <Label>Assessment Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="bg-gray-50 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-blue-900 text-sm">What happens next?</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Client clicks the link and sees the assessment questions</li>
                  <li>• They complete the questionnaire at their own pace</li>
                  <li>• You receive a notification when they finish</li>
                  <li>• Results are saved to the client's profile</li>
                </ul>
              </div>

              {/* Open link button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.open(shareUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Assessment Link
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
