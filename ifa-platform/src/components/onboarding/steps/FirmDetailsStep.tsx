'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useFirm } from '@/modules/firm/hooks/useFirm'
import type { FirmUpdateInput } from '@/modules/firm/types/firm.types'
import { useToast } from '@/hooks/use-toast'
import { Building2, ArrowLeft, ArrowRight, Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface FCAResult {
  frn: string
  name: string
  status: string
  address?: {
    line1?: string
    line2?: string
    town?: string
    postcode?: string
  } | null
}

interface FCALookupState {
  status: 'idle' | 'loading' | 'found' | 'not_found' | 'error'
  data?: FCAResult
  results?: FCAResult[]
}

interface FirmDetailsStepProps {
  onNext: () => void
  onBack: () => void
}

export default function FirmDetailsStep({ onNext, onBack }: FirmDetailsStepProps) {
  const { firm, updateFirmAsync, isUpdating } = useFirm()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: firm?.name ?? '',
    fcaNumber: firm?.fcaNumber ?? '',
    postcode: firm?.address?.postcode ?? '',
    addressLine1: firm?.address?.line1 ?? '',
    addressLine2: firm?.address?.line2 ?? '',
    city: firm?.address?.city ?? '',
  })

  const [fcaLookup, setFcaLookup] = useState<FCALookupState>({ status: 'idle' })

  // Sync form data when firm changes (e.g. after login or cache refresh)
  useEffect(() => {
    if (firm) {
      setFormData({
        name: firm.name ?? '',
        fcaNumber: firm.fcaNumber ?? '',
        postcode: firm.address?.postcode ?? '',
        addressLine1: firm.address?.line1 ?? '',
        addressLine2: firm.address?.line2 ?? '',
        city: firm.address?.city ?? '',
      })
    }
  }, [firm?.id, firm?.name, firm?.updatedAt])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Reset FCA lookup when FRN changes
    if (field === 'fcaNumber') {
      setFcaLookup({ status: 'idle' })
    }
  }

  const [fcaQuery, setFcaQuery] = useState('')

  const handleFCASearch = async () => {
    const q = fcaQuery.trim()
    if (!q || q.length < 2) {
      toast({
        title: 'Search too short',
        description: 'Enter at least 2 characters (firm name or FRN)',
        variant: 'destructive',
      })
      return
    }

    setFcaLookup({ status: 'loading' })

    try {
      const isNumeric = /^\d+$/.test(q)

      if (isNumeric) {
        // Direct FRN lookup
        const response = await fetch(`/api/firm/fca-lookup/${q}`)
        if (response.status === 404) {
          setFcaLookup({ status: 'not_found' })
          return
        }
        if (!response.ok) {
          setFcaLookup({ status: 'error' })
          return
        }
        const data = await response.json()
        setFcaLookup({ status: 'found', data: data.firm, results: [data.firm] })
      } else {
        // Name search
        const response = await fetch(`/api/firm/fca-search?q=${encodeURIComponent(q)}`)
        if (!response.ok) {
          setFcaLookup({ status: 'error' })
          return
        }
        const data = await response.json()
        if (!data.results?.length) {
          setFcaLookup({ status: 'not_found' })
          return
        }
        if (data.results.length === 1) {
          setFcaLookup({ status: 'found', data: data.results[0], results: data.results })
        } else {
          setFcaLookup({ status: 'found', results: data.results })
        }
      }
    } catch {
      setFcaLookup({ status: 'error' })
    }
  }

  const selectFCAResult = async (result: FCAResult) => {
    let finalResult = result
    // If we have a result without address, fetch full details
    if (!result.address && result.frn) {
      setFcaLookup({ status: 'loading' })
      try {
        const response = await fetch(`/api/firm/fca-lookup/${result.frn}`)
        if (response.ok) {
          const data = await response.json()
          finalResult = data.firm
        }
      } catch {
        // Use the result as-is
      }
    }
    setFcaLookup({ status: 'found', data: finalResult })

    // Auto-fill form fields immediately on selection
    setFormData((prev) => ({
      ...prev,
      name: finalResult.name || prev.name,
      fcaNumber: finalResult.frn || prev.fcaNumber,
      addressLine1: finalResult.address?.line1 || prev.addressLine1,
      city: finalResult.address?.town || prev.city,
      postcode: finalResult.address?.postcode || prev.postcode,
    }))
    toast({ title: 'Details auto-filled from FCA Register' })
  }

  const handleSave = async () => {
    try {
      const input: FirmUpdateInput = {
        name: formData.name,
        fcaNumber: formData.fcaNumber || undefined,
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2 || undefined,
          city: formData.city,
          postcode: formData.postcode,
        },
      }

      await updateFirmAsync(input)
      toast({ title: 'Firm details saved', description: 'Your firm information has been updated.' })
      onNext()
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save firm details.',
        variant: 'destructive',
      })
    }
  }

  const isSaving = isUpdating

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Firm Details</h2>
        <p className="text-gray-600 mt-1">
          Enter your firm&apos;s basic information.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="firmName">Firm Name</Label>
            <Input
              id="firmName"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Acme Financial Planning"
            />
          </div>

          <div>
            <Label htmlFor="fcaSearch">FCA Register Lookup</Label>
            <p className="text-xs text-gray-500 mb-1.5">Search by firm name or FRN number</p>
            <div className="flex gap-2">
              <Input
                id="fcaSearch"
                value={fcaQuery}
                onChange={(e) => {
                  setFcaQuery(e.target.value)
                  if (fcaLookup.status !== 'idle') setFcaLookup({ status: 'idle' })
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFCASearch() } }}
                placeholder="e.g. 123456 or Acme Financial"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFCASearch}
                disabled={fcaLookup.status === 'loading' || !fcaQuery.trim()}
                className="gap-1.5 shrink-0"
              >
                {fcaLookup.status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>
            </div>

            {/* Multiple search results */}
            {fcaLookup.status === 'found' && fcaLookup.results && fcaLookup.results.length > 1 && !fcaLookup.data && (
              <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {fcaLookup.results.map((result) => (
                  <button
                    key={result.frn}
                    type="button"
                    onClick={() => selectFCAResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{result.name}</p>
                    <p className="text-xs text-gray-500">
                      FRN: {result.frn}
                      {result.status === 'Authorised' ? (
                        <span className="ml-2 text-green-700">Authorised</span>
                      ) : (
                        <span className="ml-2 text-orange-700">{result.status}</span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Single selected result */}
            {fcaLookup.status === 'found' && fcaLookup.data && (
              <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">{fcaLookup.data.name}</p>
                    <p className="text-green-700">
                      FRN: {fcaLookup.data.frn}
                      {fcaLookup.data.status === 'Authorised' ? (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Authorised
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          {fcaLookup.data.status}
                        </span>
                      )}
                    </p>
                    {fcaLookup.data.status !== 'Authorised' && (
                      <div className="mt-1 flex items-center gap-1 text-orange-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">FCA status: {fcaLookup.data.status}</span>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-green-700">
                      Details auto-filled from FCA Register
                    </p>
                  </div>
                </div>
              </div>
            )}

            {fcaLookup.status === 'not_found' && (
              <p className="mt-2 text-sm text-yellow-600">
                No firms found on FCA Register
              </p>
            )}

            {fcaLookup.status === 'error' && (
              <p className="mt-2 text-sm text-gray-500">
                FCA Register unavailable — you can enter details manually
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fcaNumber">FCA Number</Label>
              <Input
                id="fcaNumber"
                value={formData.fcaNumber}
                onChange={(e) => handleChange('fcaNumber', e.target.value)}
                placeholder="e.g. 123456"
              />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleChange('postcode', e.target.value)}
                placeholder="e.g. SW1A 1AA"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => handleChange('addressLine1', e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div>
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => handleChange('addressLine2', e.target.value)}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="City"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !formData.name} loading={isSaving} className="gap-2">
          Save &amp; Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
