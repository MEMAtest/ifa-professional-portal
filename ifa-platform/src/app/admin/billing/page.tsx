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

export default function AdminBillingPage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<BillingConfig>(DEFAULT_CONFIG)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const isPlatformAdmin = useMemo(
    () => isPlatformAdminUser({ email: user?.email, role: user?.role }),
    [user?.email, user?.role]
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
