'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Save,
  Clock,
  Bell,
  Shield,
  FileText,
  Percent,
  AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'

interface ComplianceRule {
  id: string
  firm_id: string | null
  rule_name: string
  rule_type: 'review_frequency' | 'qa_threshold' | 'risk_trigger' | 'notification'
  configuration: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function ComplianceSettings() {
  const supabase = createClient()
  const { toast } = useToast()

  const [rules, setRules] = useState<ComplianceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState({
    newBusinessReviewRate: 100,
    ongoingReviewRate: 25,
    highRiskReviewFrequency: 'quarterly',
    overdueAlertDays: 7,
    complaintEscalationDays: 28,
    emailNotifications: true,
    dashboardAlerts: true,
    // AML Settings
    amlLowRiskYears: 5,
    amlMediumRiskYears: 3,
    amlHighRiskYears: 1,
    amlReminderDaysBefore: 60
  })

  const loadRules = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .order('rule_type')

      if (error) {
        clientLogger.error('Error loading rules:', error)
        setRules([])
        return
      }

      setRules(data || [])

      const newBusinessRule = data?.find((r: ComplianceRule) => r.rule_name === 'New Business Review Rate')
      const ongoingRule = data?.find((r: ComplianceRule) => r.rule_name === 'Ongoing File Review Rate')
      const highRiskRule = data?.find((r: ComplianceRule) => r.rule_name === 'High Risk Client Review')
      const overdueRule = data?.find((r: ComplianceRule) => r.rule_name === 'Overdue Review Alert')
      const complaintRule = data?.find((r: ComplianceRule) => r.rule_name === 'Complaint Escalation')
      const amlSettingsRule = data?.find((r: ComplianceRule) => r.rule_name === 'AML Review Settings')

      if (newBusinessRule || ongoingRule || highRiskRule || overdueRule || complaintRule || amlSettingsRule) {
        setSettings(prev => ({
          ...prev,
          newBusinessReviewRate: (newBusinessRule?.configuration as Record<string, number>)?.percentage || 100,
          ongoingReviewRate: (ongoingRule?.configuration as Record<string, number>)?.percentage || 25,
          highRiskReviewFrequency: (highRiskRule?.configuration as Record<string, string>)?.frequency || 'quarterly',
          overdueAlertDays: (overdueRule?.configuration as Record<string, number>)?.days_before || 7,
          complaintEscalationDays: (complaintRule?.configuration as Record<string, number>)?.auto_escalate_days || 28,
          emailNotifications: true,
          dashboardAlerts: true,
          // AML Settings from database
          amlLowRiskYears: (amlSettingsRule?.configuration as Record<string, number>)?.lowRiskYears || 5,
          amlMediumRiskYears: (amlSettingsRule?.configuration as Record<string, number>)?.mediumRiskYears || 3,
          amlHighRiskYears: (amlSettingsRule?.configuration as Record<string, number>)?.highRiskYears || 1,
          amlReminderDaysBefore: (amlSettingsRule?.configuration as Record<string, number>)?.reminderDaysBefore || 60
        }))
      }
    } catch (error) {
      clientLogger.error('Error loading rules:', error)
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const updates = [
        {
          rule_name: 'New Business Review Rate',
          configuration: { percentage: settings.newBusinessReviewRate, description: `Review ${settings.newBusinessReviewRate}% of new business in first year` }
        },
        {
          rule_name: 'Ongoing File Review Rate',
          configuration: { percentage: settings.ongoingReviewRate, description: `Review ${settings.ongoingReviewRate}% of ongoing client files annually` }
        },
        {
          rule_name: 'High Risk Client Review',
          configuration: { frequency: settings.highRiskReviewFrequency, description: `High risk clients reviewed ${settings.highRiskReviewFrequency}` }
        },
        {
          rule_name: 'Overdue Review Alert',
          configuration: { days_before: settings.overdueAlertDays, recipients: ['compliance_officer'], description: `Alert ${settings.overdueAlertDays} days before review due date` }
        },
        {
          rule_name: 'Complaint Escalation',
          configuration: { auto_escalate_days: settings.complaintEscalationDays, description: `Auto-escalate complaints not resolved within ${settings.complaintEscalationDays} days` }
        },
        {
          rule_name: 'AML Review Settings',
          rule_type: 'review_frequency',
          configuration: {
            lowRiskYears: settings.amlLowRiskYears,
            mediumRiskYears: settings.amlMediumRiskYears,
            highRiskYears: settings.amlHighRiskYears,
            reminderDaysBefore: settings.amlReminderDaysBefore,
            description: `AML reviews: Low ${settings.amlLowRiskYears}yr, Med ${settings.amlMediumRiskYears}yr, High ${settings.amlHighRiskYears}yr`
          }
        }
      ]

      for (const update of updates) {
        const existingRule = rules.find(r => r.rule_name === update.rule_name)
        if (existingRule) {
          await supabase
            .from('compliance_rules')
            .update({ configuration: update.configuration })
            .eq('id', existingRule.id)
        } else if (update.rule_name === 'AML Review Settings') {
          // Create the AML settings rule if it doesn't exist
          await supabase
            .from('compliance_rules')
            .insert({
              rule_name: update.rule_name,
              rule_type: 'review_frequency',
              configuration: update.configuration,
              is_active: true
            })
        }
      }

      toast({
        title: 'Settings Saved',
        description: 'Compliance settings have been updated'
      })
      loadRules()
    } catch (error) {
      clientLogger.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRule = async (rule: ComplianceRule) => {
    try {
      const { error } = await supabase
        .from('compliance_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)

      if (error) throw error

      toast({
        title: rule.is_active ? 'Rule Disabled' : 'Rule Enabled',
        description: `"${rule.rule_name}" has been ${rule.is_active ? 'disabled' : 'enabled'}`
      })
      loadRules()
    } catch (error) {
      clientLogger.error('Error toggling rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive'
      })
    }
  }

  const getRuleTypeIcon = (type: ComplianceRule['rule_type']) => {
    const icons = {
      review_frequency: Clock,
      qa_threshold: Percent,
      risk_trigger: AlertTriangle,
      notification: Bell
    }
    return icons[type]
  }

  const getRuleTypeLabel = (type: ComplianceRule['rule_type']): string => {
    const labels = {
      review_frequency: 'Review Frequency',
      qa_threshold: 'QA Threshold',
      risk_trigger: 'Risk Trigger',
      notification: 'Notification'
    }
    return labels[type]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>QA Review Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">New Business Review Rate</h3>
              <p className="text-sm text-gray-500">Percentage of new business files to review in the first year</p>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.newBusinessReviewRate}
                onChange={(e) => setSettings({ ...settings, newBusinessReviewRate: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="font-bold text-lg w-12 text-right">{settings.newBusinessReviewRate}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Ongoing File Review Rate</h3>
              <p className="text-sm text-gray-500">Percentage of ongoing client files to review annually</p>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.ongoingReviewRate}
                onChange={(e) => setSettings({ ...settings, ongoingReviewRate: parseInt(e.target.value) })}
                className="w-32"
              />
              <span className="font-bold text-lg w-12 text-right">{settings.ongoingReviewRate}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">High Risk Client Review Frequency</h3>
              <p className="text-sm text-gray-500">How often to review files for high-risk clients</p>
            </div>
            <select
              value={settings.highRiskReviewFrequency}
              onChange={(e) => setSettings({ ...settings, highRiskReviewFrequency: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="biannually">Bi-annually</option>
              <option value="annually">Annually</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* AML/CTF Review Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>AML/CTF Review Frequencies</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Configure how often AML reviews are required based on client risk rating.
              These settings apply to all new risk assessments performed through the AML wizard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Low Risk */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">Low Risk Clients</h3>
              <p className="text-xs text-green-600 mb-3">Standard due diligence</p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={settings.amlLowRiskYears}
                  onChange={(e) => setSettings({ ...settings, amlLowRiskYears: parseInt(e.target.value) || 5 })}
                  className="w-16 border rounded-lg px-3 py-2 text-sm text-center"
                  min="1"
                  max="10"
                />
                <span className="text-sm text-gray-600">years</span>
              </div>
            </div>

            {/* Medium Risk */}
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">Medium Risk Clients</h3>
              <p className="text-xs text-yellow-600 mb-3">Enhanced monitoring</p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={settings.amlMediumRiskYears}
                  onChange={(e) => setSettings({ ...settings, amlMediumRiskYears: parseInt(e.target.value) || 3 })}
                  className="w-16 border rounded-lg px-3 py-2 text-sm text-center"
                  min="1"
                  max="5"
                />
                <span className="text-sm text-gray-600">years</span>
              </div>
            </div>

            {/* High Risk */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">High Risk Clients</h3>
              <p className="text-xs text-red-600 mb-3">Enhanced due diligence</p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={settings.amlHighRiskYears}
                  onChange={(e) => setSettings({ ...settings, amlHighRiskYears: parseInt(e.target.value) || 1 })}
                  className="w-16 border rounded-lg px-3 py-2 text-sm text-center"
                  min="1"
                  max="3"
                />
                <span className="text-sm text-gray-600">year(s)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h3 className="font-medium">AML Review Reminder</h3>
              <p className="text-sm text-gray-500">Days before review due to show reminder</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={settings.amlReminderDaysBefore}
                onChange={(e) => setSettings({ ...settings, amlReminderDaysBefore: parseInt(e.target.value) || 60 })}
                className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
                min="7"
                max="90"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Alerts & Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Overdue Review Alert</h3>
              <p className="text-sm text-gray-500">Days before due date to send reminder</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={settings.overdueAlertDays}
                onChange={(e) => setSettings({ ...settings, overdueAlertDays: parseInt(e.target.value) || 7 })}
                className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
                min="1"
                max="30"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Complaint Auto-Escalation</h3>
              <p className="text-sm text-gray-500">Days before unresolved complaints are escalated</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={settings.complaintEscalationDays}
                onChange={(e) => setSettings({ ...settings, complaintEscalationDays: parseInt(e.target.value) || 28 })}
                className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
                min="1"
                max="56"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h3 className="font-medium">Email Notifications</h3>
                <p className="text-sm text-gray-500">Receive compliance alerts via email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h3 className="font-medium">Dashboard Alerts</h3>
                <p className="text-sm text-gray-500">Show alerts on the compliance dashboard</p>
              </div>
              <input
                type="checkbox"
                checked={settings.dashboardAlerts}
                onChange={(e) => setSettings({ ...settings, dashboardAlerts: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Active Compliance Rules</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No rules configured</p>
              <p className="text-sm text-gray-400">Run the database migration to set up default rules</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const Icon = getRuleTypeIcon(rule.rule_type)
                return (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      rule.is_active ? 'bg-white' : 'bg-gray-50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        rule.is_active ? 'bg-blue-100' : 'bg-gray-200'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          rule.is_active ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{rule.rule_name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getRuleTypeLabel(rule.rule_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {(rule.configuration as Record<string, string>)?.description || JSON.stringify(rule.configuration)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRule(rule)}
                      >
                        {rule.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">FCA Compliance Guidelines</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>Complaints must be resolved within 8 weeks (56 days)</li>
                <li>Consumer Duty requires firms to act in good faith</li>
                <li>Vulnerable customers must be identified and supported</li>
                <li>Audit trails must be maintained for all client interactions</li>
                <li>Material breaches must be reported to the FCA</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
