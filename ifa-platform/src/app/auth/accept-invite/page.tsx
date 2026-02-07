'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Loader2, CheckCircle, XCircle, UserPlus, Eye, EyeOff } from 'lucide-react'

interface InvitationDetails {
  email: string
  role: string
  firmName: string
  inviterName: string
  expiresAt: string
}

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'submitting' | 'success' | 'error'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  // Verify token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setPageState('invalid')
        setErrorMessage('No invitation token provided')
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-invite?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (!response.ok) {
          if (data.code === 'EXPIRED') {
            setPageState('expired')
            setErrorMessage('This invitation has expired. Please contact your administrator for a new invitation.')
          } else if (data.code === 'ACCEPTED') {
            setPageState('accepted')
            setErrorMessage('This invitation has already been accepted.')
          } else {
            setPageState('invalid')
            setErrorMessage(data.error || 'Invalid invitation link')
          }
          return
        }

        setInvitation(data)
        setPageState('valid')
      } catch (err) {
        setPageState('invalid')
        setErrorMessage('Unable to verify invitation. Please try again.')
      }
    }

    verifyToken()
  }, [token])

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setFormError('First name is required')
      return false
    }
    if (!lastName.trim()) {
      setFormError('Last name is required')
      return false
    }
    if (password.length < 12) {
      setFormError('Password must be at least 12 characters')
      return false
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match')
      return false
    }
    // Check password strength
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setFormError('Password must contain uppercase, lowercase, number, and special character')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!validateForm()) return

    setPageState('submitting')

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setPageState('valid')
        setFormError(data.error || 'Failed to create account')
        return
      }

      setPageState('success')
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setPageState('valid')
      setFormError('An error occurred. Please try again.')
    }
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  // Error states (invalid, expired, accepted)
  if (['invalid', 'expired', 'accepted'].includes(pageState)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
            pageState === 'expired' ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            <XCircle className={`h-8 w-8 ${
              pageState === 'expired' ? 'text-amber-600' : 'text-red-600'
            }`} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {pageState === 'expired' ? 'Invitation Expired' :
             pageState === 'accepted' ? 'Already Accepted' : 'Invalid Invitation'}
          </h1>
          <p className="mt-3 text-gray-600">{errorMessage}</p>
          <div className="mt-8">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Account Created!</h1>
          <p className="mt-3 text-gray-600">
            Your account has been created successfully. Redirecting you to login...
          </p>
          <div className="mt-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  // Valid invitation - show form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-blue-100">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Accept Invitation</h1>
            {invitation && (
              <div className="mt-2 text-gray-600">
                <p>
                  You&apos;ve been invited to join <strong>{invitation.firmName}</strong>
                </p>
                <p className="text-sm mt-1">
                  as a <span className="font-medium capitalize">{invitation.role}</span>
                </p>
              </div>
            )}
          </div>

          {/* Invitation details */}
          {invitation && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-900 font-medium">{invitation.email}</span>
                <span className="text-gray-500">Invited by:</span>
                <span className="text-gray-900">{invitation.inviterName}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  disabled={pageState === 'submitting'}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  disabled={pageState === 'submitting'}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  disabled={pageState === 'submitting'}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                At least 12 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={pageState === 'submitting'}
                required
              />
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <Button
              type="submit"
              disabled={pageState === 'submitting'}
              className="w-full"
            >
              {pageState === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
