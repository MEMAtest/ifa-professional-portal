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
    dashboardAlerts: true
  })

  const loadRules = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .order('rule_type')

      if (error) {
        console.error('Error loading rules:', error)
        setRules([])
        return
      }

      setRules(data || [])

      const newBusinessRule = data?.find((r: ComplianceRule) => r.rule_name === 'New Business Review Rate')
      const ongoingRule = data?.find((r: ComplianceRule) => r.rule_name === 'Ongoing File Review Rate')
      const highRiskRule = data?.find((r: ComplianceRule) => r.rule_name === 'High Risk Client Review')
      const overdueRule = data?.find((r: ComplianceRule) => r.rule_name === 'Overdue Review Alert')
      const complaintRule = data?.find((r: ComplianceRule) => r.rule_name === 'Complaint Escalation')

      if (newBusinessRule || ongoingRule || highRiskRule || overdueRule || complaintRule) {
        setSettings({
          newBusinessReviewRate: (newBusinessRule?.configuration as Record<string, number>)?.percentage || 100,
          ongoingReviewRate: (ongoingRule?.configuration as Record<string, number>)?.percentage || 25,
          highRiskReviewFrequency: (highRiskRule?.configuration as Record<string, string>)?.frequency || 'quarterly',
          overdueAlertDays: (overdueRule?.configuration as Record<string, number>)?.days_before || 7,
          complaintEscalationDays: (complaintRule?.configuration as Record<string, number>)?.auto_escalate_days || 28,
          emailNotifications: true,
          dashboardAlerts: true
        })
      }
    } catch (error) {
      console.error('Error loading rules:', error)
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
        }
      ]

      for (const update of updates) {
        const existingRule = rules.find(r => r.rule_name === update.rule_name)
        if (existingRule) {
          await supabase
            .from('compliance_rules')
            .update({ configuration: update.configuration })
            .eq('id', existingRule.id)
        }
      }

      toast({
        title: 'Settings Saved',
        description: 'Compliance settings have been updated'
      })
      loadRules()
    } catch (error) {
      console.error('Error saving settings:', error)
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
      console.error('Error toggling rule:', error)
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
