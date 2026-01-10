'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformAdminEmail } from '@/lib/auth/platformAdmin'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, Lock } from 'lucide-react'

type FirmUser = {
  id: string
  first_name: string
  last_name: string
  role: string
  last_login_at: string | null
}

type FirmDetail = {
  id: string
  name: string
  subscriptionTier: string
  createdAt: string
  updatedAt: string
  activeUsers: number
  billableSeats: number
  includedSeats: number
  billingEmail: string | null
  maxSeats: number | null
  currentSeats: number | null
  termMonths: number | null
  basePrice: number | null
  seatPrice: number | null
  contractStart: string | null
  contractEnd: string | null
  autoRenew: boolean | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeScheduleId: string | null
}

const BASE_PRICE_BY_TERM: Record<number, number> = {
  12: 500,
  24: 415,
  36: 350
}

function resolveBasePrice(firm: FirmDetail): number | null {
  if (typeof firm.basePrice === 'number') return firm.basePrice
  if (firm.termMonths && BASE_PRICE_BY_TERM[firm.termMonths]) {
    return BASE_PRICE_BY_TERM[firm.termMonths]
  }
  return null
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB')
}

export default function AdminFirmDetailPage() {
  const params = useParams()
  const firmId = params?.firmId as string | undefined
  const { user, loading: authLoading } = useAuth()
  const [firm, setFirm] = useState<FirmDetail | null>(null)
  const [users, setUsers] = useState<FirmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [termMonths, setTermMonths] = useState<number>(36)
  const [seatPrice, setSeatPrice] = useState<number>(85)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const isPlatformAdmin = useMemo(() => isPlatformAdminEmail(user?.email), [user?.email])

  const fetchFirm = useCallback(async () => {
    if (!firmId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/firms/${firmId}`)
      if (!response.ok) {
        throw new Error('Failed to load firm details')
      }
      const data = await response.json()
      setFirm(data.firm ?? null)
      setUsers(data.users ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load firm details')
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => {
    if (authLoading) return
    if (!isPlatformAdmin) {
      setLoading(false)
      return
    }
    fetchFirm()
  }, [authLoading, fetchFirm, isPlatformAdmin])

  useEffect(() => {
    if (!firm) return
    if (firm.termMonths) setTermMonths(firm.termMonths)
    if (typeof firm.seatPrice === 'number') setSeatPrice(firm.seatPrice)
  }, [firm])

  const handleProvision = async () => {
    if (!firmId) return
    try {
      setActionLoading(true)
      setActionMessage(null)
      const response = await fetch(`/api/admin/stripe/firm/${firmId}/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termMonths, seatPrice })
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to provision Stripe subscription')
      }
      await fetchFirm()
      setActionMessage({ type: 'success', text: 'Stripe subscription provisioned.' })
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Stripe provisioning failed.'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncSeats = async () => {
    if (!firmId) return
    try {
      setActionLoading(true)
      setActionMessage(null)
      const response = await fetch(`/api/admin/stripe/firm/${firmId}/sync-seats`, {
        method: 'POST'
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to sync seats')
      }
      await fetchFirm()
      setActionMessage({ type: 'success', text: 'Seat counts synced.' })
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Seat sync failed.'
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  if (!isPlatformAdmin) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-500" />
              Owner Admin Access
            </CardTitle>
            <CardDescription>
              This area is restricted to platform owners.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              If you need access, contact support.
            </p>
          </CardContent>
        </Card>
      </Layout>
    )
  }

  if (!firm) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-6 text-sm text-gray-600">
            {error ?? 'Firm not found.'}
          </CardContent>
        </Card>
      </Layout>
    )
  }

  const basePrice = resolveBasePrice(firm)
  const seatPrice = typeof firm.seatPrice === 'number' ? firm.seatPrice : null
  const hasStripe = Boolean(firm.stripeSubscriptionId || firm.stripeCustomerId)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">{firm.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>Tier: {firm.subscriptionTier}</span>
            <span>•</span>
            <span>Created: {formatDate(firm.createdAt)}</span>
            <span>•</span>
            <span>Updated: {formatDate(firm.updatedAt)}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Profiles in firm</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {firm.activeUsers}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Billable Seats</CardTitle>
              <CardDescription>Above included</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {firm.billableSeats}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contract Term</CardTitle>
              <CardDescription>Months</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {firm.termMonths ?? '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stripe Status</CardTitle>
              <CardDescription>Subscription link</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={hasStripe ? 'default' : 'outline'}>
                {hasStripe ? 'Connected' : 'Not linked'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
            <CardDescription>Base price, seats, and contract dates</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Base Price</span>
                <span className="font-medium">{basePrice !== null ? formatCurrency(basePrice) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Seat Price</span>
                <span className="font-medium">{seatPrice !== null ? formatCurrency(seatPrice) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Included Seats</span>
                <span className="font-medium">{firm.includedSeats}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Billing Email</span>
                <span className="font-medium">{firm.billingEmail ?? '—'}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Contract Start</span>
                <span className="font-medium">{formatDate(firm.contractStart)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Contract End</span>
                <span className="font-medium">{formatDate(firm.contractEnd)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Renew</span>
                <span className="font-medium">{firm.autoRenew === null ? '—' : firm.autoRenew ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Max Seats</span>
                <span className="font-medium">{firm.maxSeats ?? '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Actions</CardTitle>
            <CardDescription>Provision or sync Stripe subscription data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Contract Term</label>
                <select
                  value={termMonths}
                  onChange={(event) => setTermMonths(Number(event.target.value))}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value={12}>12 months</option>
                  <option value={24}>24 months</option>
                  <option value={36}>36 months</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Seat Price (£/mo)</label>
                <input
                  type="number"
                  min={0}
                  value={seatPrice}
                  onChange={(event) => setSeatPrice(Number(event.target.value))}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleProvision} disabled={actionLoading}>
                  {actionLoading ? 'Working…' : 'Provision Stripe'}
                </Button>
                <Button variant="outline" onClick={handleSyncSeats} disabled={actionLoading}>
                  Sync Seats
                </Button>
              </div>
            </div>
            {actionMessage && (
              <div
                className={`rounded-md px-3 py-2 text-sm ${
                  actionMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {actionMessage.text}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Active profiles in the firm</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell>
                      {userItem.first_name} {userItem.last_name}
                    </TableCell>
                    <TableCell className="capitalize">{userItem.role}</TableCell>
                    <TableCell>{formatDate(userItem.last_login_at)}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-gray-500">
                      No users found for this firm.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
