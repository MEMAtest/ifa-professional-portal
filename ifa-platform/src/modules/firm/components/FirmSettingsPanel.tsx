/**
 * Firm Settings Panel Component
 * Admin-only panel for managing firm settings and branding
 */

'use client'

import React, { useState } from 'react'
import { Building2, Save, Palette, AlertCircle, Search, Loader2, CheckCircle2 } from 'lucide-react'
import { useFirm } from '../hooks/useFirm'
import { usePermissions } from '../hooks/usePermissions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useToast } from '@/hooks/use-toast'

export function FirmSettingsPanel() {
  const { firm, isLoading, updateFirmAsync, isUpdating, uploadLogoAsync } = useFirm()
  const { canEditFirm, isAdmin } = usePermissions()
  const { toast } = useToast()

  // FCA Lookup state
  const [fcaLookup, setFcaLookup] = useState<{
    status: 'idle' | 'loading' | 'found' | 'not_found' | 'error'
    data?: { frn: string; name: string; status: string; address?: { line1?: string; town?: string; postcode?: string } | null }
  }>({ status: 'idle' })

  const handleFCALookup = async () => {
    const frn = formData.fcaNumber.trim()
    if (!frn || !/^\d{4,10}$/.test(frn)) return
    setFcaLookup({ status: 'loading' })
    try {
      const response = await fetch(`/api/firm/fca-lookup/${frn}`)
      if (response.status === 404) { setFcaLookup({ status: 'not_found' }); return }
      if (!response.ok) { setFcaLookup({ status: 'error' }); return }
      const data = await response.json()
      setFcaLookup({ status: 'found', data: data.firm })
    } catch {
      setFcaLookup({ status: 'error' })
    }
  }

  const handleFCAAutoFill = () => {
    if (!fcaLookup.data) return
    setFormData((prev) => ({
      ...prev,
      name: fcaLookup.data!.name || prev.name,
      address: {
        ...prev.address,
        line1: fcaLookup.data!.address?.line1 || prev.address.line1,
        city: fcaLookup.data!.address?.town || prev.address.city,
        postcode: fcaLookup.data!.address?.postcode || prev.address.postcode,
      },
    }))
    toast({ title: 'Details auto-filled from FCA Register' })
  }

  // Local form state
  const [formData, setFormData] = useState({
    name: firm?.name ?? '',
    fcaNumber: firm?.fcaNumber ?? '',
    address: {
      line1: firm?.address?.line1 ?? '',
      line2: firm?.address?.line2 ?? '',
      city: firm?.address?.city ?? '',
      postcode: firm?.address?.postcode ?? '',
    },
    branding: {
      emailSignature: firm?.settings?.branding?.emailSignature ?? '',
    },
  })

  // Update form when firm data loads
  React.useEffect(() => {
    if (firm) {
      setFormData({
        name: firm.name ?? '',
        fcaNumber: firm.fcaNumber ?? '',
        address: {
          line1: firm.address?.line1 ?? '',
          line2: firm.address?.line2 ?? '',
          city: firm.address?.city ?? '',
          postcode: firm.address?.postcode ?? '',
        },
        branding: {
          emailSignature: firm.settings?.branding?.emailSignature ?? '',
        },
      })
    }
  }, [firm])

  const handleSave = async () => {
    try {
      await updateFirmAsync({
        name: formData.name,
        fcaNumber: formData.fcaNumber,
        address: formData.address,
        settings: {
          branding: {
            ...(firm?.settings?.branding ?? {}),
            emailSignature: formData.branding.emailSignature,
          },
        },
      })
      toast({
        title: 'Success',
        description: 'Firm settings saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Logo must be less than 2MB',
        variant: 'destructive',
      })
      return
    }

    try {
      await uploadLogoAsync(file)
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'destructive',
      })
    }
  }

  if (!canEditFirm) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <p>Only administrators can edit firm settings.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Firm Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Firm Details
          </CardTitle>
          <CardDescription>
            Basic information about your firm
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firm Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FCA Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.fcaNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, fcaNumber: e.target.value })
                    setFcaLookup({ status: 'idle' })
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123456"
                />
                <button
                  type="button"
                  onClick={handleFCALookup}
                  disabled={fcaLookup.status === 'loading' || !formData.fcaNumber.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {fcaLookup.status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Lookup
                </button>
              </div>
              {fcaLookup.status === 'found' && fcaLookup.data && (
                <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-green-800">{fcaLookup.data.name}</p>
                      <p className="text-green-700">
                        Status: {fcaLookup.data.status}
                      </p>
                      <button
                        type="button"
                        onClick={handleFCAAutoFill}
                        className="mt-1 text-blue-600 hover:text-blue-800 underline text-xs font-medium"
                      >
                        Auto-fill from FCA Register?
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {fcaLookup.status === 'not_found' && (
                <p className="mt-2 text-sm text-yellow-600">FRN not found on FCA Register</p>
              )}
              {fcaLookup.status === 'error' && (
                <p className="mt-2 text-sm text-gray-500">FCA Register unavailable</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              value={formData.address.line1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, line1: e.target.value },
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address.line2}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, line2: e.target.value },
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <input
                type="text"
                value={formData.address.postcode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, postcode: e.target.value },
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Email Signature
          </CardTitle>
          <CardDescription>
            This signature is appended to client emails sent from the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Signature (HTML)
            </label>
            <textarea
              value={formData.branding.emailSignature}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  branding: { ...formData.branding, emailSignature: e.target.value },
                })
              }
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="<p>Kind regards,<br/>The Team</p>"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating}>
          <Save className="h-4 w-4 mr-2" />
          {isUpdating ? 'Saving...' : 'Save Firm Settings'}
        </Button>
      </div>
    </div>
  )
}
