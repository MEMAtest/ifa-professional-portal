'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { ChevronLeft, Lock } from 'lucide-react'
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

type BillingConfig = {
  stripeBasePrice12mId: string
  stripeBasePrice24mId: string
  stripeBasePrice36mId: string
  stripeSeatPriceId: string
  seatPrice: number | null
  currency: string
}

const DEFAULT_CONFIG: BillingConfig = {
  stripeBasePrice12mId: '',
  stripeBasePrice24mId: '',
  stripeBasePrice36mId: '',
  stripeSeatPriceId: '',
  seatPrice: 85,
  currency: 'GBP'
}

type AdminFirmSummary = {
  id: string
  name: string
  subscriptionTier: string
  createdAt: string
  updatedAt: string
  activeUsers: number
  billableSeats: number
  includedSeats: number
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

function resolveSeatPrice(firm: AdminFirmSummary, defaultSeatPrice: number): number {
  if (typeof firm.seatPrice === 'number') return firm.seatPrice
  return defaultSeatPrice
}

export default function AdminBillingPage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<BillingConfig>(DEFAULT_CONFIG)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [firms, setFirms] = useState<AdminFirmSummary[]>([])
  const [firmError, setFirmError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
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

    const fetchConfig = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/billing-config')
        if (!response.ok) {
          throw new Error('Failed to load billing config')
        }
        const data = await response.json()
        if (data.config) {
          setConfig({
            stripeBasePrice12mId: data.config.stripe_base_price_12m_id ?? '',
            stripeBasePrice24mId: data.config.stripe_base_price_24m_id ?? '',
            stripeBasePrice36mId: data.config.stripe_base_price_36m_id ?? '',
            stripeSeatPriceId: data.config.stripe_seat_price_id ?? '',
            seatPrice: data.config.seat_price ?? 85,
            currency: data.config.currency ?? 'GBP'
          })
        }
        setMessage(null)
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load config'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [authLoading, isPlatformAdmin])

  useEffect(() => {
    if (authLoading || !isPlatformAdmin) return
    const fetchFirms = async () => {
      try {
        const response = await fetch('/api/admin/firms')
        if (!response.ok) {
          throw new Error('Failed to load firm data')
        }
        const data = await response.json()
        setFirms(data.firms ?? [])
        setFirmError(null)
      } catch (err) {
        setFirmError(err instanceof Error ? err.message : 'Failed to load firm data')
      }
    }
    fetchFirms()
  }, [authLoading, isPlatformAdmin])

  const seatPrice = config.seatPrice ?? 85

  const metrics = useMemo(() => {
    let totalFirms = 0
    let totalUsers = 0
    let totalBillableSeats = 0
    let totalIncludedSeats = 0
    let totalMrrBase = 0
    let totalMrrSeat = 0

    for (const firm of firms) {
      totalFirms += 1
      totalUsers += firm.activeUsers
      totalBillableSeats += firm.billableSeats
      totalIncludedSeats += firm.includedSeats
      const base = resolveBasePrice(firm)
      if (base !== null) totalMrrBase += base
      totalMrrSeat += resolveSeatPrice(firm, seatPrice) * firm.billableSeats
    }

    const mrrByTerm = [12, 24, 36].map((term) => {
      const firmsForTerm = firms.filter((f) => f.termMonths === term)
      const base = firmsForTerm.reduce((sum, f) => sum + (resolveBasePrice(f) ?? 0), 0)
      const seat = firmsForTerm.reduce(
        (sum, f) => sum + resolveSeatPrice(f, seatPrice) * f.billableSeats,
        0
      )
      return {
        termLabel: `${term}m`,
        base,
        seat,
        firms: firmsForTerm.length
      }
    })

    return {
      totalFirms,
      totalUsers,
      totalBillableSeats,
      totalIncludedSeats,
      totalMrrBase,
      totalMrrSeat,
      totalMrr: totalMrrBase + totalMrrSeat,
      mrrByTerm
    }
  }, [firms, seatPrice])

  const seatUtilisationChartData = useMemo(() => {
    if (!metrics.totalIncludedSeats && !metrics.totalBillableSeats) return []
    return [
      {
        name: 'Seats',
        Included: metrics.totalIncludedSeats,
        Billable: metrics.totalBillableSeats
      }
    ]
  }, [metrics.totalIncludedSeats, metrics.totalBillableSeats])

  const planMixChartData = useMemo(() => {
    if (!firms.length) return []
    const counts = new Map<string, number>()
    firms.forEach((f) => {
      const tier = (f.subscriptionTier || 'starter').toLowerCase()
      counts.set(tier, (counts.get(tier) ?? 0) + 1)
    })
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [firms])

  const filteredFirms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return firms.filter((f) => {
      const matchesSearch =
        !term ||
        f.name.toLowerCase().includes(term) ||
        (f.subscriptionTier ?? '').toLowerCase().includes(term)

      const termLabel = f.termMonths ? String(f.termMonths) : 'other'
      const matchesTerm =
        termFilter === 'all' ||
        (termFilter === 'other' && !['12', '24', '36'].includes(termLabel)) ||
        termFilter === termLabel

      const autoRenewStatus = f.autoRenew === true ? 'yes' : f.autoRenew === false ? 'no' : 'all'
      const matchesAutoRenew =
        autoRenewFilter === 'all' || autoRenewFilter === autoRenewStatus

      return matchesSearch && matchesTerm && matchesAutoRenew
    })
  }, [firms, searchTerm, termFilter, autoRenewFilter])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: config.currency || 'GBP',
      minimumFractionDigits: 0
    }).format(value)

  const exportCsv = () => {
    if (!filteredFirms.length) return
    const headers = [
      'Name',
      'Subscription Tier',
      'Term (months)',
      'Active Users',
      'Included Seats',
      'Billable Seats',
      'Base MRR',
      'Seat MRR',
      'Auto Renew',
      'Created',
      'Updated'
    ]
    const rows = filteredFirms.map((f) => {
      const base = resolveBasePrice(f) ?? 0
      const seatRev = resolveSeatPrice(f, seatPrice) * f.billableSeats
      return [
        f.name,
        f.subscriptionTier ?? 'starter',
        f.termMonths ?? '',
        f.activeUsers,
        f.includedSeats,
        f.billableSeats,
        base,
        seatRev,
        f.autoRenew === true ? 'Yes' : f.autoRenew === false ? 'No' : '',
        f.createdAt,
        f.updatedAt
      ]
    })
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plannetic_firm_billing.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      const response = await fetch('/api/admin/billing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeBasePrice12mId: config.stripeBasePrice12mId,
          stripeBasePrice24mId: config.stripeBasePrice24mId,
          stripeBasePrice36mId: config.stripeBasePrice36mId,
          stripeSeatPriceId: config.stripeSeatPriceId,
          seatPrice: config.seatPrice,
          currency: config.currency
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to save config')
      }

      setMessage({ type: 'success', text: 'Billing config saved.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Back to Admin
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">Plans & Rates</h1>
          <p className="text-sm text-gray-600">
            Manage Stripe price IDs and the default seat price. Base plan pricing is fixed.
          </p>
        </div>

        {!!firmError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {firmError}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Firms</CardTitle>
              <CardDescription>Active tenants</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {metrics.totalFirms}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
              <CardDescription>Active profiles</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {metrics.totalUsers}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Seats (Billable)</CardTitle>
              <CardDescription>Above included seats</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {metrics.totalBillableSeats}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Est. MRR</CardTitle>
              <CardDescription>Base + seat revenue</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-gray-900">
              {formatCurrency(metrics.totalMrr)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>MRR by Term</CardTitle>
              <CardDescription>Base vs seat revenue split</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              {metrics.mrrByTerm.some((d) => d.base || d.seat) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.mrrByTerm} stackOffset="expand" margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
              <CardTitle>Seat Utilisation</CardTitle>
              <CardDescription>Included vs billable seats</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              {seatUtilisationChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seatUtilisationChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Included" stackId="seats" fill="#94a3b8" />
                    <Bar dataKey="Billable" stackId="seats" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">Seat data will appear once firms are provisioned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Plan Mix</CardTitle>
              <CardDescription>Firms by subscription tier</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              {planMixChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planMixChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Firm Drilldown</CardTitle>
              <CardDescription>Search, filter, and export firm billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  label="Search firm, email, or tier"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                />
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Term</label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value as typeof termFilter)}
                  >
                    <option value="all">All terms</option>
                    <option value="12">12m</option>
                    <option value="24">24m</option>
                    <option value="36">36m</option>
                    <option value="other">Other / unset</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Auto-renew</label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={autoRenewFilter}
                    onChange={(e) => setAutoRenewFilter(e.target.value as typeof autoRenewFilter)}
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  <Button type="button" variant="secondary" onClick={exportCsv} disabled={!filteredFirms.length}>
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Firm</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Tier</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Term</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Users</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Billable</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Base MRR</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Seat MRR</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Auto-renew</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFirms.map((f) => {
                      const base = resolveBasePrice(f) ?? 0
                      const seatRev = resolveSeatPrice(f, seatPrice) * f.billableSeats
                      const termLabel = f.termMonths ? `${f.termMonths}m` : '—'
                      return (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">{f.name}</td>
                          <td className="px-3 py-2 text-gray-700">{f.subscriptionTier ?? 'starter'}</td>
                          <td className="px-3 py-2 text-gray-700">{termLabel}</td>
                          <td className="px-3 py-2 text-gray-700">{f.activeUsers}</td>
                          <td className="px-3 py-2 text-gray-700">{f.billableSeats}</td>
                          <td className="px-3 py-2 text-gray-700">{formatCurrency(base)}</td>
                          <td className="px-3 py-2 text-gray-700">{formatCurrency(seatRev)}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {f.autoRenew === true ? 'Yes' : f.autoRenew === false ? 'No' : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    {!filteredFirms.length && (
                      <tr>
                        <td className="px-3 py-4 text-gray-500" colSpan={8}>
                          No firms match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Price IDs</CardTitle>
            <CardDescription>Use the bootstrap script to create prices, then paste IDs here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Base Price 12-month (£500/mo)"
                value={config.stripeBasePrice12mId}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, stripeBasePrice12mId: event.target.value }))
                }
                placeholder="price_..."
              />
              <Input
                label="Base Price 24-month (£415/mo)"
                value={config.stripeBasePrice24mId}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, stripeBasePrice24mId: event.target.value }))
                }
                placeholder="price_..."
              />
              <Input
                label="Base Price 36-month (£350/mo)"
                value={config.stripeBasePrice36mId}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, stripeBasePrice36mId: event.target.value }))
                }
                placeholder="price_..."
              />
              <Input
                label="Seat Price ID"
                value={config.stripeSeatPriceId}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, stripeSeatPriceId: event.target.value }))
                }
                placeholder="price_..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seat Pricing</CardTitle>
            <CardDescription>Single seat price applied across all terms.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input
              label="Seat Price (£/user/mo)"
              type="number"
              value={config.seatPrice ?? ''}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, seatPrice: Number(event.target.value) }))
              }
            />
            <Input
              label="Currency"
              value={config.currency}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
              }
            />
          </CardContent>
        </Card>

        {message && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Pricing'}
          </Button>
        </div>
      </div>
    </Layout>
  )
}
