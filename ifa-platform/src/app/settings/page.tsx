// app/settings/page.tsx
// ✅ FIXED VERSION - Uses correct database columns
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Settings,
  User,
  Shield,
  Briefcase,
  Save,
  Info,
  Users,
  Building2,
  BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
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
import { CaseloadDashboard } from '@/modules/firm/components/CaseloadDashboard/CaseloadDashboard'
import { usePermissions } from '@/modules/firm/hooks/usePermissions'
import clientLogger from '@/lib/logging/clientLogger'
import { applyThemePreference, persistThemePreference, type ThemePreference } from '@/lib/theme/themePreference'

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
    }
  }
  created_at: string
  updated_at?: string
}

const DEFAULT_PREFERENCES = {
  theme: 'light' as ThemePreference,
  language: 'en-GB',
  timezone: 'Europe/London',
  currency: 'GBP',
  date_format: 'DD/MM/YYYY',
  notifications: {
    email: true,
    sms: false,
    push: true
  }
}

const InfoHint = ({ content }: { content: string }) => (
  <Tooltip content={content}>
    <span className="ml-2 inline-flex h-4 w-4 items-center justify-center text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200">
      <Info className="h-4 w-4" />
    </span>
  </Tooltip>
)

const fieldLabelClass = 'block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1'
const fieldInputClass = 'w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-400 dark:focus:ring-blue-400'
const fieldSelectClass = fieldInputClass


export default function SettingsPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'services' | 'consumer-duty' | 'personas' | 'firm' | 'users' | 'caseload'>('profile')
  const { isAdmin, canManageUsers } = usePermissions()
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
    preferences: { ...DEFAULT_PREFERENCES },
    created_at: '',
    updated_at: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'preferences') {
      setActiveTab('preferences')
    } else if (tab === 'security') {
      setActiveTab('security')
    } else if (tab === 'services') {
      setActiveTab('services')
    } else if (tab === 'consumer-duty') {
      setActiveTab('consumer-duty')
    } else if (tab === 'personas') {
      setActiveTab('personas')
    } else if (tab === 'firm') {
      setActiveTab('firm')
    } else if (tab === 'users') {
      setActiveTab('users')
    } else if (tab === 'caseload') {
      setActiveTab('caseload')
    }
  }, [searchParams])

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'No user email found for password update.',
        variant: 'destructive'
      })
      return
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all password fields.',
        variant: 'destructive'
      })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 8 characters.',
        variant: 'destructive'
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please confirm the new password.',
        variant: 'destructive'
      })
      return
    }

    try {
      setPasswordSaving(true)

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      })

      if (reauthError) {
        throw new Error('Current password is incorrect.')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.'
      })
    } catch (error) {
      clientLogger.error('Error updating password:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive'
      })
    } finally {
      setPasswordSaving(false)
    }
  }

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

  const loadUserProfile = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null

    // ✅ FIXED: Use actual profiles table schema
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      clientLogger.error('Error loading user profile:', error)
      // Create default profile if none exists
      createDefaultProfile()
      return firmContext.resolveFirmId(user?.firmId || null)
    }

    if (profileData) {
      const profileFirmId = (profileData as any).firm_id || null
      const resolvedFirmId = firmContext.resolveFirmId(profileFirmId)
      const mergedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...((profileData as any).preferences || {}),
        notifications: {
          email: ((profileData as any).preferences?.notifications?.email) ?? DEFAULT_PREFERENCES.notifications.email,
          sms: ((profileData as any).preferences?.notifications?.sms) ?? DEFAULT_PREFERENCES.notifications.sms,
          push: ((profileData as any).preferences?.notifications?.push) ?? DEFAULT_PREFERENCES.notifications.push
        }
      }

      setUserProfile(prev => ({
        ...prev,
        ...(profileData as any),
        phone: (profileData as any).phone || '',
        preferences: mergedPreferences
      }))

      persistThemePreference((mergedPreferences.theme || 'light') as ThemePreference)
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
      clientLogger.error('Error loading settings:', error)
      createDefaultProfile()
    } finally {
      setLoading(false)
    }
  }, [createDefaultProfile, loadFirmSettings, loadConsumerDutySettings, loadUserProfile])

  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      hasLoadedRef.current = null
      return
    }
    if (hasLoadedRef.current === user.id) return
    hasLoadedRef.current = user.id
    loadSettings()
  }, [user?.id, loadSettings])

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

      if (userProfile.preferences?.theme) {
        persistThemePreference(userProfile.preferences.theme as ThemePreference)
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        variant: 'default'
      })

    } catch (error) {
      clientLogger.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings…</p>
          <p className="text-sm text-gray-500 mt-2">
            Preparing your profile and firm configuration options.
          </p>
        </div>
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
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-500'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
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
                  ...(canManageUsers ? [{ key: 'caseload', label: 'Caseload Dashboard', icon: BarChart3 }] : []),
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
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-500'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
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
                    <label className={fieldLabelClass}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={userProfile.full_name || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })}
                      className={fieldInputClass}
                    />
                  </div>

                  <div>
                    <label className={fieldLabelClass}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className={`${fieldInputClass} bg-gray-50 dark:bg-slate-900`}
                      disabled
                    />
                  </div>

                  <div>
                    <label className={fieldLabelClass}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={userProfile.phone || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                      className={fieldInputClass}
                    />
                  </div>

                  <div>
                    <label className={fieldLabelClass}>
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={userProfile.job_title || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, job_title: e.target.value })}
                      className={fieldInputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={fieldLabelClass}>
                    Bio
                  </label>
                  <textarea
                    value={userProfile.bio || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                    rows={4}
                    className={fieldInputClass}
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
                    <label className={`flex items-center ${fieldLabelClass}`}>
                      Theme
                      <InfoHint content="Choose light, dark, or follow your system preference." />
                    </label>
                    <select
                      value={userProfile.preferences?.theme || 'light'}
                      onChange={(e) => {
                        const nextTheme = e.target.value as ThemePreference
                        setUserProfile({
                          ...userProfile,
                          preferences: { 
                            ...userProfile.preferences!, 
                            theme: nextTheme 
                          }
                        })
                        persistThemePreference(nextTheme)
                      }}
                      className={fieldSelectClass}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div>
                    <label className={`flex items-center ${fieldLabelClass}`}>
                      Language
                      <InfoHint content="Controls UI language for menus and labels." />
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
                      className={fieldSelectClass}
                    >
                      <option value="en-GB">English (UK)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`flex items-center ${fieldLabelClass}`}>
                      Currency
                      <InfoHint content="Default currency formatting across reports and dashboards." />
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
                      className={fieldSelectClass}
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`flex items-center ${fieldLabelClass}`}>
                      Date Format
                      <InfoHint content="Default date format used across the platform." />
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
                      className={fieldSelectClass}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-3">Notifications</h3>
                    <InfoHint content="Control how you receive system notifications." />
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'email', label: 'Email notifications' },
                      { key: 'sms', label: 'SMS notifications' },
                      { key: 'push', label: 'Push notifications' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={Boolean(userProfile.preferences?.notifications?.[key as 'email' | 'sms' | 'push'])}
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
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                          {label}
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
                  <label className={fieldLabelClass}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    autoComplete="current-password"
                    className={fieldInputClass}
                  />
                </div>

                <div>
                  <label className={fieldLabelClass}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    autoComplete="new-password"
                    className={fieldInputClass}
                  />
                </div>

                <div>
                  <label className={fieldLabelClass}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                    className={fieldInputClass}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={passwordSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </Button>
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

          {activeTab === 'caseload' && canManageUsers && (
            <CaseloadDashboard />
          )}
        </div>
      </div>
    </div>
  )
}
