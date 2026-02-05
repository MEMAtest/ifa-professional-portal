'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useUserInvitations } from '@/modules/firm/hooks/useFirmUsers'
import { useFirmSeats } from '@/modules/firm/hooks/useFirm'
import { useToast } from '@/hooks/use-toast'
import type { UserRole } from '@/modules/firm/types/user.types'
import {
  Users,
  Mail,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Loader2,
  X,
  Info,
} from 'lucide-react'

interface TeamSetupStepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export default function TeamSetupStep({ onNext, onBack, onSkip }: TeamSetupStepProps) {
  const {
    invitations,
    isLoading: isLoadingInvitations,
    inviteUserAsync,
    isInviting,
    cancelInvitation,
    isCancelling,
  } = useUserInvitations()
  const { currentSeats, maxSeats, canAddUser } = useFirmSeats()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('advisor')

  const handleInvite = async () => {
    if (!email.trim()) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      })
      return
    }

    if (!canAddUser) {
      toast({
        title: 'Seat limit reached',
        description: `You have used all ${maxSeats} available seats. Upgrade your plan to invite more team members.`,
        variant: 'destructive',
      })
      return
    }

    try {
      const invitation = await inviteUserAsync({ email: email.trim(), role: role as UserRole })

      if (invitation?.emailSent === false && invitation.inviteUrl) {
        try {
          await navigator.clipboard.writeText(invitation.inviteUrl)
          toast({
            title: 'Invite link copied',
            description: 'Email delivery failed. The invite link has been copied so you can share it manually.',
          })
        } catch {
          toast({
            title: 'Email failed',
            description: `Email delivery failed. Share this invite link manually: ${invitation.inviteUrl}`,
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Invitation sent',
          description: `An invitation has been sent to ${email}.`,
        })
      }
      setEmail('')
      setRole('advisor')
    } catch (err) {
      toast({
        title: 'Invitation failed',
        description: err instanceof Error ? err.message : 'Could not send invitation.',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = (invitationId: string) => {
    cancelInvitation(invitationId)
    toast({
      title: 'Invitation cancelled',
      description: 'The pending invitation has been removed.',
    })
  }

  const roleLabels: Record<string, string> = {
    advisor: 'Advisor',
    supervisor: 'Compliance',
    admin: 'Admin',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Team Setup</h2>
        <p className="text-gray-600 mt-1">
          Invite your team members to join the platform.
        </p>
      </div>

      {/* Seat Count */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700 font-medium">
          {currentSeats} of {maxSeats} seats used
        </span>
        {!canAddUser && (
          <span className="text-amber-600 font-medium ml-2">
            (No seats available)
          </span>
        )}
      </div>

      {/* Invite Form + Role Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Invite Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label htmlFor="inviteEmail">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  disabled={!canAddUser}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="inviteRole">Role</Label>
                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={!canAddUser}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advisor">Advisor</SelectItem>
                    <SelectItem value="supervisor">Compliance</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleInvite}
                disabled={isInviting || !email.trim() || !canAddUser}
                loading={isInviting}
                className="w-full"
              >
                Send Invite
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-blue-50/50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <Info className="w-4 h-4" />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-gray-900">Advisor</p>
              <p className="text-gray-600">
                Manages their own clients, creates suitability reviews, and generates reports.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Compliance</p>
              <p className="text-gray-600">
                Reviews and approves suitability assessments, monitors Consumer Duty obligations, and accesses all client records.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Admin</p>
              <p className="text-gray-600">
                Full access — manage firm settings, invite and remove team members, and configure billing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInvitations ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No pending invitations. Use the form above to invite team members.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {inv.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Role: {roleLabels[inv.role] ?? inv.role}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(inv.id)}
                    disabled={isCancelling}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
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
          <Button onClick={onNext} className="gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
