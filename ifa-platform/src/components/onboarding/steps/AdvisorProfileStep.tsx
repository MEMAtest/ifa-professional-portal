'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { UserCircle, ArrowLeft, ArrowRight } from 'lucide-react'

interface AdvisorProfileStepProps {
  onNext: () => void
  onBack: () => void
}

export default function AdvisorProfileStep({ onNext, onBack }: AdvisorProfileStepProps) {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    jobRole: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      })

      if (result?.error) {
        toast({
          title: 'Update failed',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Profile updated',
        description: 'Your advisor profile has been saved.',
      })
      onNext()
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update profile.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = formData.firstName.trim() !== '' && formData.lastName.trim() !== ''

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Advisor Profile</h2>
        <p className="text-gray-600 mt-1">
          Set up your personal details so clients and colleagues can identify you.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-blue-600" />
            Your Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. 07700 900000"
            />
          </div>

          <div>
            <Label htmlFor="jobRole">Title / Job Role</Label>
            <Input
              id="jobRole"
              value={formData.jobRole}
              onChange={(e) => handleChange('jobRole', e.target.value)}
              placeholder="e.g. Senior Financial Advisor"
            />
            <p className="text-xs text-gray-500 mt-1">
              This appears on reports and client-facing documents.
            </p>
          </div>

          {user?.email && (
            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !isValid}
          loading={isSaving}
          className="gap-2"
        >
          Save &amp; Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
