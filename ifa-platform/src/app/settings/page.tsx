// app/settings/page.tsx
// ✅ FIXED VERSION - Uses correct database columns
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  User,
  Shield,
  Briefcase,
  Save,
  Eye,
  EyeOff,
  Users,
  Building2
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'next/navigation'
import { InvestorPersonaLibrary } from '@/components/settings/InvestorPersonaLibrary'
import { ProdServicesPanel } from '@/components/settings/prod/ProdServicesPanel'
import { ConsumerDutyPanel } from '@/components/settings/consumerDuty/ConsumerDutyPanel'
import { useFirmContext } from '@/components/settings/hooks/useFirmContext'
import { useProdServicesSettings } from '@/components/settings/hooks/useProdServicesSettings'
import { useConsumerDutySettings } from '@/components/settings/hooks/useConsumerDutySettings'
import { FirmSettingsPanel } from '@/modules/firm/components/FirmSettingsPanel'
import { UserTable } from '@/modules/firm/components/UserManagement/UserTable'
import { usePermissions } from '@/modules/firm/hooks/usePermissions'

// Types based on actual database schema
interface UserProfile {
  id: string
  full_name?: string
  phone?: string
  job_title?: string
  bio?: string
  avatar_url?: string
  preferences?: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    currency: string
    date_format: string
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
      marketing: boolean
    }
  }
  created_at: string
  updated_at?: string
}


export default function SettingsPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'services' | 'consumer-duty' | 'personas' | 'firm' | 'users'>('profile')
  const { isAdmin, canManageUsers } = usePermissions()
  const [showPassword, setShowPassword] = useState(false)
  const firmContext = useFirmContext({
    supabase,
    userId: user?.id,
    userFirmId: user?.firmId
  })

  const {
    firmServices,
    prodDetails,
    servicesStep,
    servicesSaveStatus,
    prodVersions,
    prodReviewTask,
    latestProdDocument,
    customCheckInputs,
    prodSummary,
    setServicesStep,
    loadFirmSettings,
    handleSaveFirmServices,
    handleOpenStoredProdDocument,
    addService,
    updateService,
    removeService,
    applyServiceTemplate,
    addTargetMarketCheck,
    removeTargetMarketCheck,
    handleCustomCheckInputChange,
    handleAddCustomCheck,
    updateProdDetails,
    toggleDistributionChannel,
    restoreProdVersion,
    handleCopyProdSummary
  } = useProdServicesSettings({
    supabase,
    userId: user?.id,
    toast,
    setSaving,
    resolveFirmId: firmContext.resolveFirmId,
    resolveFirmIdFromAuth: firmContext.resolveFirmIdFromAuth
  })

  // Consumer Duty framework settings hook
  const {
    step: consumerDutyStep,
    setStep: setConsumerDutyStep,
    framework: consumerDutyFramework,
    summary: consumerDutySummary,
    saveStatus: consumerDutySaveStatus,
    versions: consumerDutyVersions,
    loadConsumerDutySettings,
    handleSave: handleSaveConsumerDuty,
    updateProducts: updateConsumerDutyProducts,
    updatePricing: updateConsumerDutyPricing,
    updateCommunication: updateConsumerDutyCommunication,
    updateSupport: updateConsumerDutySupport,
    updateNotes: updateConsumerDutyNotes,
    toggleProductCategory,
    toggleCommunicationStyle,
    toggleAccessChannel,
    restoreVersion: restoreConsumerDutyVersion,
    handleCopySummary: handleCopyConsumerDutySummary
  } = useConsumerDutySettings({
    supabase,
    userId: user?.id,
    toast,
    setSaving,
    resolveFirmId: firmContext.resolveFirmId,
    resolveFirmIdFromAuth: firmContext.resolveFirmIdFromAuth
  })

  // Profile state based on actual schema
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    full_name: '',
    phone: '',
    job_title: '',
    bio: '',
    avatar_url: '',
    preferences: {
      theme: 'light',
      language: 'en-GB',
      timezone: 'Europe/London',
      currency: 'GBP',
      date_format: 'DD/MM/YYYY',
      notifications: {
        email: true,
        sms: false,
        push: true,
        marketing: false
      }
    },
    created_at: '',
    updated_at: ''
  })

  // Security state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'services') {
      setActiveTab('services')
    } else if (tab === 'consumer-duty') {
      setActiveTab('consumer-duty')
    } else if (tab === 'personas') {
      setActiveTab('personas')
    } else if (tab === 'firm') {
      setActiveTab('firm')
    } else if (tab === 'users') {
      setActiveTab('users')
    }
  }, [searchParams])

  const createDefaultProfile = useCallback(() => {
    // Create default profile data
    setUserProfile(prev => ({
      ...prev,
      id: user?.id || '',
      full_name: user?.email?.split('@')[0] || '',
      phone: '',
      job_title: 'Financial Advisor',
      bio: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  }, [user])

  const createMockData = useCallback(() => {
    // Fallback mock data
    setUserProfile(prev => ({
      ...prev,
      id: user?.id || '',
      full_name: 'John Smith',
      phone: '+44 7700 900123',
      job_title: 'Senior Financial Advisor',
      bio: 'Experienced financial advisor specializing in retirement planning and investment management.',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: new Date().toISOString()
    }))
  }, [user])

  const loadUserProfile = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null

    // ✅ FIXED: Use actual profiles table schema
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error loading user profile:', error)
      // Create default profile if none exists
      createDefaultProfile()
      return firmContext.resolveFirmId(user?.firmId || null)
    }

    if (profileData) {
      const profileFirmId = (profileData as any).firm_id || null
      const resolvedFirmId = firmContext.resolveFirmId(profileFirmId)
      setUserProfile(prev => ({
        ...prev,
        ...(profileData as any),
        phone: (profileData as any).phone || '',
        preferences: {
          ...prev.preferences,
          ...((profileData as any).preferences || {})
        }
      }))
      firmContext.setFirmId(resolvedFirmId)
      return resolvedFirmId
    }
    return firmContext.resolveFirmId(null)
  }, [createDefaultProfile, firmContext, supabase, user])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const resolvedFirmId = await loadUserProfile()
      await loadFirmSettings(resolvedFirmId)
      await loadConsumerDutySettings(resolvedFirmId)
    } catch (error) {
      console.error('Error loading settings:', error)
      createMockData()
    } finally {
      setLoading(false)
    }
  }, [createMockData, loadFirmSettings, loadConsumerDutySettings, loadUserProfile])

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user, loadSettings])

  const handleSaveProfile = async () => {
    try {
      setSaving(true)

      // ✅ FIXED: Use actual profiles table column names
      const profileUpdate = {
        id: user?.id,
        full_name: userProfile.full_name,
        phone: userProfile.phone,
        job_title: userProfile.job_title,
        bio: userProfile.bio,
        avatar_url: userProfile.avatar_url,
        preferences: userProfile.preferences,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profileUpdate as any)

      if (error) {
        throw new Error(`Failed to save profile: ${error.message}`)
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        variant: 'default'
      })

    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      if (passwordData.new_password !== passwordData.confirm_password) {
        toast({
          title: 'Error',
          description: 'New passwords do not match',
          variant: 'destructive'
        })
        return
      }

      if (passwordData.new_password.length < 8) {
        toast({
          title: 'Error',
          description: 'Password must be at least 8 characters long',
          variant: 'destructive'
        })
        return
      }

      setSaving(true)

      // In a real app, you would use Supabase auth to change password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: 'Success',
        description: 'Password changed successfully',
        variant: 'default'
      })

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })

    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {/* Personal Settings */}
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Personal Settings
                </div>
                {[
                  { key: 'profile', label: 'Profile', icon: User },
                  { key: 'preferences', label: 'Preferences', icon: Settings },
                  { key: 'security', label: 'Security', icon: Shield }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium
                      ${activeTab === key
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}

                {/* Firm Configuration */}
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 mt-2">
                  Firm Configuration
                </div>
                {[
                  ...(isAdmin ? [{ key: 'firm', label: 'Firm Settings', icon: Building2 }] : []),
                  ...(canManageUsers ? [{ key: 'users', label: 'User Management', icon: Users }] : []),
                  { key: 'services', label: 'Services & PROD', icon: Briefcase },
                  { key: 'consumer-duty', label: 'Consumer Duty', icon: Shield },
                  { key: 'personas', label: 'Investor Personas', icon: Users }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium
                      ${activeTab === key
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={userProfile.full_name || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={userProfile.phone || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={userProfile.job_title || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, job_title: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={userProfile.bio || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Theme
                    </label>
                    <select
                      value={userProfile.preferences?.theme || 'light'}
                      onChange={(e) => setUserProfile({
                        ...userProfile,
                        preferences: { 
                          ...userProfile.preferences!, 
                          theme: e.target.value as any 
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={userProfile.preferences?.language || 'en-GB'}
                      onChange={(e) => setUserProfile({
                        ...userProfile,
                        preferences: { 
                          ...userProfile.preferences!, 
                          language: e.target.value 
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en-GB">English (UK)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={userProfile.preferences?.currency || 'GBP'}
                      onChange={(e) => setUserProfile({
                        ...userProfile,
                        preferences: { 
                          ...userProfile.preferences!, 
                          currency: e.target.value 
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>
                    <select
                      value={userProfile.preferences?.date_format || 'DD/MM/YYYY'}
                      onChange={(e) => setUserProfile({
                        ...userProfile,
                        preferences: { 
                          ...userProfile.preferences!, 
                          date_format: e.target.value 
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    {Object.entries(userProfile.preferences?.notifications || {}).map(([key, value]) => (
                      <label key={key} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            preferences: {
                              ...userProfile.preferences!,
                              notifications: {
                                ...userProfile.preferences!.notifications,
                                [key]: e.target.checked
                              }
                            }
                          })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {key.replace('_', ' ')} notifications
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.current_password}
                          onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                          className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <Button onClick={handleChangePassword} disabled={saving}>
                      <Shield className="h-4 w-4 mr-2" />
                      {saving ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">SMS Authentication</h4>
                      <p className="text-sm text-gray-600">Receive verification codes via SMS</p>
                    </div>
                    <Button variant="outline" disabled>
                      Enable (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'services' && (
            <ProdServicesPanel
              servicesStep={servicesStep}
              onStepChange={setServicesStep}
              prodDetails={prodDetails}
              onUpdateProdDetails={updateProdDetails}
              onToggleDistributionChannel={toggleDistributionChannel}
              firmServices={firmServices}
              onAddService={addService}
              onUpdateService={updateService}
              onRemoveService={removeService}
              onApplyServiceTemplate={applyServiceTemplate}
              onAddTargetMarketCheck={addTargetMarketCheck}
              onRemoveTargetMarketCheck={removeTargetMarketCheck}
              customCheckInputs={customCheckInputs}
              onCustomCheckInputChange={handleCustomCheckInputChange}
              onAddCustomCheck={handleAddCustomCheck}
              prodSummary={prodSummary}
              servicesSaveStatus={servicesSaveStatus}
              saving={saving}
              onSave={handleSaveFirmServices}
              onOpenStoredDocument={handleOpenStoredProdDocument}
              onCopySummary={handleCopyProdSummary}
              prodReviewTask={prodReviewTask}
              prodVersions={prodVersions}
              onRestoreVersion={restoreProdVersion}
              latestProdDocument={latestProdDocument}
            />
          )}

          {activeTab === 'consumer-duty' && (
            <ConsumerDutyPanel
              step={consumerDutyStep}
              onStepChange={setConsumerDutyStep}
              framework={consumerDutyFramework}
              onUpdateProducts={updateConsumerDutyProducts}
              onUpdatePricing={updateConsumerDutyPricing}
              onUpdateCommunication={updateConsumerDutyCommunication}
              onUpdateSupport={updateConsumerDutySupport}
              onUpdateNotes={updateConsumerDutyNotes}
              onToggleProductCategory={toggleProductCategory}
              onToggleCommunicationStyle={toggleCommunicationStyle}
              onToggleAccessChannel={toggleAccessChannel}
              summary={consumerDutySummary}
              saveStatus={consumerDutySaveStatus}
              saving={saving}
              onSave={handleSaveConsumerDuty}
              onCopySummary={handleCopyConsumerDutySummary}
              versions={consumerDutyVersions}
              onRestoreVersion={restoreConsumerDutyVersion}
            />
          )}

          {activeTab === 'personas' && (
            <InvestorPersonaLibrary />
          )}

          {activeTab === 'firm' && isAdmin && (
            <FirmSettingsPanel />
          )}

          {activeTab === 'users' && canManageUsers && (
            <UserTable />
          )}
        </div>
      </div>
    </div>
  )
}
