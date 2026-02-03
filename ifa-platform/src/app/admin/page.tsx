'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { formatCurrency } from '@/lib/utils'
import { Lock } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

type AdminFirmSummary = {
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

function resolveBasePrice(firm: AdminFirmSummary): number | null {
  if (typeof firm.basePrice === 'number') return firm.basePrice
  if (firm.termMonths && BASE_PRICE_BY_TERM[firm.termMonths]) {
    return BASE_PRICE_BY_TERM[firm.termMonths]
  }
  return null
}

function resolveSeatPrice(firm: AdminFirmSummary): number | null {
  if (typeof firm.seatPrice === 'number') return firm.seatPrice
  return null
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [firms, setFirms] = useState<AdminFirmSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [termFilter, setTermFilter] = useState<'all' | '12' | '24' | '36' | 'other'>('all')
  const [autoRenewFilter, setAutoRenewFilter] = useState<'all' | 'yes' | 'no'>('all')

  const isPlatformAdmin = useMemo(
    () => isPlatformAdminUser({ email: user?.email, role: user?.role, isPlatformAdmin: user?.isPlatformAdmin }),
    [user?.email, user?.role, user?.isPlatformAdmin]
  )

  useEffect(() => {
    if (authLoading) return
    if (!isPlatformAdmin) {
      setLoading(false)
      return
    }

    const fetchFirms = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/firms')
        if (!response.ok) {
          throw new Error('Failed to load admin firms')
        }
        const data = await response.json()
        setFirms(data.firms ?? [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin firms')
      } finally {
        setLoading(false)
      }
    }

    fetchFirms()
  }, [authLoading, isPlatformAdmin])

  const filteredFirms = useMemo(() => {
    const term = query.trim().toLowerCase()
    return firms.filter((firm) => {
      const matchesSearch =
        !term ||
        firm.name.toLowerCase().includes(term) ||
        (firm.billingEmail ?? '').toLowerCase().includes(term)

      const termLabel = firm.termMonths ? String(firm.termMonths) : 'other'
      const matchesTerm =
        termFilter === 'all' ||
        (termFilter === 'other' && !['12', '24', '36'].includes(termLabel)) ||
        termFilter === termLabel

      const autoRenewStatus = firm.autoRenew === true ? 'yes' : firm.autoRenew === false ? 'no' : 'all'
      const matchesAutoRenew =
        autoRenewFilter === 'all' || autoRenewFilter === autoRenewStatus

      return matchesSearch && matchesTerm && matchesAutoRenew
    })
  }, [firms, query, termFilter, autoRenewFilter])

  const totals = useMemo(() => {
    let totalUsers = 0
    let totalBillableSeats = 0
    let totalMrr = 0

    for (const firm of firms) {
      totalUsers += firm.activeUsers
      totalBillableSeats += firm.billableSeats
      const basePrice = resolveBasePrice(firm)
      const seatPrice = resolveSeatPrice(firm)
      if (basePrice !== null) {
        totalMrr += basePrice
      }
      if (seatPrice !== null) {
        totalMrr += seatPrice * firm.billableSeats
      }
    }

    return {
      totalFirms: firms.length,
      totalUsers,
      totalBillableSeats,
      totalMrr
    }
  }, [firms])

  const mrrByTerm = useMemo(() => {
    return [12, 24, 36].map((term) => {
      const firmsForTerm = firms.filter((f) => f.termMonths === term)
      const base = firmsForTerm.reduce((sum, f) => sum + (resolveBasePrice(f) ?? 0), 0)
      const seat = firmsForTerm.reduce(
        (sum, f) => sum + (resolveSeatPrice(f) ?? 0) * f.billableSeats,
        0
      )
      return {
        termLabel: `${term}m`,
        base,
        seat,
        firms: firmsForTerm.length
      }
    })
  }, [firms])

  const planMix = useMemo(() => {
    if (!firms.length) return []
    const counts = new Map<string, number>()
    firms.forEach((f) => {
      const tier = (f.subscriptionTier || 'starter').toLowerCase()
      counts.set(tier, (counts.get(tier) ?? 0) + 1)
    })
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [firms])

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">Owner Admin Hub</h1>
          <p className="text-sm text-gray-600">
            Platform-wide overview of firms, subscriptions, and seat usage.
          </p>
        </div>

        {error && (
          <Card>
            <CardContent className="py-4 text-sm text-red-600">{error}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Firms</CardTitle>
              <CardDescription>Active tenants</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {totals.totalFirms}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
              <CardDescription>Active profiles</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {totals.totalUsers}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Billable Seats</CardTitle>
              <CardDescription>Above included seats</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {totals.totalBillableSeats}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estimated MRR</CardTitle>
              <CardDescription>Base + seats</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totals.totalMrr)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>MRR by Term</CardTitle>
              <CardDescription>Base vs seat revenue split</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              {mrrByTerm.some((d) => d.base || d.seat) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mrrByTerm} stackOffset="expand" margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="termLabel" />
                    <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip formatter={(value: number, name) => [`${formatCurrency(value)}`, name === 'base' ? 'Base' : 'Seat']} />
                    <Legend />
                    <Bar dataKey="base" name="Base MRR" stackId="mrr" fill="#2563eb" />
                    <Bar dataKey="seat" name="Seat MRR" stackId="mrr" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">No firm data available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Plan Mix</CardTitle>
              <CardDescription>Firms by subscription tier</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              {planMix.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planMix} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Firms" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">Plan data will appear once firms are provisioned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plans & Rates</CardTitle>
            <CardDescription>Manage Stripe price IDs and seat pricing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/billing" className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Open Pricing Settings
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Firms</CardTitle>
              <CardDescription>Subscription terms, seats, and billing</CardDescription>
            </div>
            <div className="w-full md:w-96 flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
              <Input
                placeholder="Search firm or billing email..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value as typeof termFilter)}
              >
                <option value="all">All terms</option>
                <option value="12">12m</option>
                <option value="24">24m</option>
                <option value="36">36m</option>
                <option value="other">Other / unset</option>
              </select>
              <select
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={autoRenewFilter}
                onChange={(e) => setAutoRenewFilter(e.target.value as typeof autoRenewFilter)}
              >
                <option value="all">Auto-renew: All</option>
                <option value="yes">Auto-renew: Yes</option>
                <option value="no">Auto-renew: No</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firm</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Seat Price</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFirms.map((firm) => {
                  const basePrice = resolveBasePrice(firm)
                  const seatPrice = resolveSeatPrice(firm)
                  const hasStripe = Boolean(firm.stripeSubscriptionId || firm.stripeCustomerId)

                  return (
                    <TableRow key={firm.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{firm.name}</span>
                          <span className="text-xs text-gray-500">{firm.billingEmail ?? 'Billing email not set'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {firm.termMonths ? `${firm.termMonths} mo` : '—'}
                      </TableCell>
                      <TableCell>
                        {basePrice !== null ? formatCurrency(basePrice) : '—'}
                      </TableCell>
                      <TableCell>
                        {seatPrice !== null ? formatCurrency(seatPrice) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">
                          {firm.activeUsers} / {firm.includedSeats} incl
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {firm.billableSeats}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasStripe ? 'default' : 'outline'}>
                          {hasStripe ? 'Connected' : 'Not linked'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/firms/${firm.id}`}
                          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
