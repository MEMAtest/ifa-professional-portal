/**
 * Firm Settings Panel Component
 * Admin-only panel for managing firm settings and branding
 */

'use client'

import React, { useState } from 'react'
import { Building2, Upload, Save, Palette, FileText, AlertCircle } from 'lucide-react'
import { useFirm, useFirmSeats } from '../hooks/useFirm'
import { usePermissions } from '../hooks/usePermissions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useToast } from '@/hooks/use-toast'

export function FirmSettingsPanel() {
  const { firm, isLoading, updateFirmAsync, isUpdating, uploadLogoAsync, isUploadingLogo } = useFirm()
  const { maxSeats, currentSeats, seatsRemaining } = useFirmSeats()
  const { canEditFirm, isAdmin } = usePermissions()
  const { toast } = useToast()

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
      primaryColor: firm?.settings?.branding?.primaryColor ?? '#2563eb',
      reportFooterText: firm?.settings?.branding?.reportFooterText ?? '',
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
          primaryColor: firm.settings?.branding?.primaryColor ?? '#2563eb',
          reportFooterText: firm.settings?.branding?.reportFooterText ?? '',
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
          branding: formData.branding,
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
              <input
                type="text"
                value={formData.fcaNumber}
                onChange={(e) => setFormData({ ...formData, fcaNumber: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 123456"
              />
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

      {/* Branding for Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Report Branding
          </CardTitle>
          <CardDescription>
            Customize how your firm appears on client-facing reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firm Logo (for PDF reports)
            </label>
            <div className="flex items-center gap-4">
              {firm?.settings?.branding?.logoUrl && (
                <img
                  src={firm.settings.branding.logoUrl}
                  alt="Firm logo"
                  className="h-12 w-auto object-contain border rounded"
                />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
                  <Upload className="h-4 w-4" />
                  {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Recommended: 300px wide PNG with transparent background
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color (for report headers)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.branding.primaryColor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branding: { ...formData.branding, primaryColor: e.target.value },
                  })
                }
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={formData.branding.primaryColor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branding: { ...formData.branding, primaryColor: e.target.value },
                  })
                }
                className="w-32 p-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="#2563eb"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Footer Text
            </label>
            <textarea
              value={formData.branding.reportFooterText}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  branding: { ...formData.branding, reportFooterText: e.target.value },
                })
              }
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Authorised and regulated by the Financial Conduct Authority"
            />
          </div>

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

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Plan</div>
              <div className="text-lg font-semibold capitalize">
                {firm?.subscriptionTier ?? 'Starter'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Users</div>
              <div className="text-lg font-semibold">
                {currentSeats} / {maxSeats}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Available Seats</div>
              <div className="text-lg font-semibold">{seatsRemaining}</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Contact support to upgrade your plan or add more seats.
          </p>
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
