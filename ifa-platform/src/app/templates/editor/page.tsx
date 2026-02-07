// File: src/app/templates/editor/page.tsx
// Advanced Template Editor with Live Preview

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import sanitizeHtml from 'sanitize-html'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Save, 
  Eye, 
  Code, 
  FileText,
  Plus,
  Download,
  RotateCcw,
  Type,
  Calendar,
  DollarSign,
  Hash,
  User,
  Mail,
  Building
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import clientLogger from '@/lib/logging/clientLogger'
import { populateTemplate } from '@/services/document-generation/template-utils'

// Template variables with icons and descriptions
const TEMPLATE_VARIABLES = [
  { key: 'DOCUMENT_TITLE', icon: FileText, description: 'Document title', example: 'Client Agreement' },
  { key: 'CLIENT_NAME', icon: User, description: 'Full client name', example: 'John Smith' },
  { key: 'CLIENT_EMAIL', icon: Mail, description: 'Client email address', example: 'john@example.com' },
  { key: 'CLIENT_REF', icon: Hash, description: 'Client reference number', example: 'CLI123456' },
  { key: 'FIRM_NAME', icon: Building, description: 'Firm name', example: 'Plannetic Financial Ltd' },
  { key: 'FIRM_FCA_NUMBER', icon: Hash, description: 'FCA firm reference number', example: '123456' },
  { key: 'FIRM_ADDRESS', icon: Building, description: 'Firm address', example: '123 High Street, London, SW1A 1AA' },
  { key: 'FIRM_EMAIL', icon: Mail, description: 'Firm email address', example: 'support@plannetic.com' },
  { key: 'FIRM_PHONE', icon: Hash, description: 'Firm phone number', example: '+44 20 0000 0000' },
  { key: 'COMPANY_NAME', icon: Building, description: 'Legacy firm/company name', example: 'ABC Financial Ltd' },
  { key: 'ADVISOR_NAME', icon: User, description: 'Advisor full name', example: 'Jane Advisor' },
  { key: 'REPORT_DATE', icon: Calendar, description: 'Current date', example: '30/01/2025' },
  { key: 'ADVICE_TYPE', icon: Type, description: 'Advice type (independent/restricted)', example: 'Independent' },
  { key: 'INITIAL_ADVICE_FEE', icon: DollarSign, description: 'Initial advice fee (e.g. £ / %)', example: '£1,000' },
  { key: 'ONGOING_ADVICE_FEE', icon: DollarSign, description: 'Ongoing advice fee (e.g. £ / %)', example: '0.50%' },
  { key: 'INVESTMENT_AMOUNT', icon: DollarSign, description: 'Investment amount', example: '50,000' },
  { key: 'ANNUAL_INCOME', icon: DollarSign, description: 'Annual income', example: '75,000' },
  { key: 'NET_WORTH', icon: DollarSign, description: 'Total net worth', example: '250,000' },
  { key: 'RISK_PROFILE', icon: Type, description: 'Risk tolerance level', example: 'Moderate' },
]

// Pre-built template sections
const TEMPLATE_SECTIONS = {
  header: `<header style="border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
  <h1 style="color: #1e40af; margin: 0;">{{DOCUMENT_TITLE}}</h1>
  <p style="color: #6b7280; margin-top: 10px;">Prepared for: {{CLIENT_NAME}} | Date: {{REPORT_DATE}}</p>
</header>`,
  
  clientInfo: `<section style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
  <h2 style="color: #374151; margin-top: 0;">Client Information</h2>
  <table style="width: 100%;">
    <tr>
      <td style="padding: 5px 0;"><strong>Name:</strong></td>
      <td>{{CLIENT_NAME}}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0;"><strong>Email:</strong></td>
      <td>{{CLIENT_EMAIL}}</td>
    </tr>
    <tr>
      <td style="padding: 5px 0;"><strong>Reference:</strong></td>
      <td>{{CLIENT_REF}}</td>
    </tr>
  </table>
</section>`,

  financialSummary: `<section style="margin-bottom: 30px;">
  <h2 style="color: #374151;">Financial Summary</h2>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
    <div style="background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 0;">£{{INVESTMENT_AMOUNT}}</p>
      <p style="color: #6b7280; margin: 5px 0 0 0;">Investment Amount</p>
    </div>
    <div style="background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 0;">£{{ANNUAL_INCOME}}</p>
      <p style="color: #6b7280; margin: 5px 0 0 0;">Annual Income</p>
    </div>
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="color: #92400e; font-size: 24px; font-weight: bold; margin: 0;">£{{NET_WORTH}}</p>
      <p style="color: #6b7280; margin: 5px 0 0 0;">Net Worth</p>
    </div>
  </div>
</section>`,

  signature: `<section style="margin-top: 50px; page-break-inside: avoid;">
  <h3 style="color: #374151;">Signatures</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
    <div>
      <p style="margin-bottom: 40px;">Client Signature:</p>
      <div style="border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
      <p style="margin: 0;">{{CLIENT_NAME}}</p>
      <p style="margin: 5px 0 0 0; color: #6b7280;">Date: _____________</p>
    </div>
    <div>
      <p style="margin-bottom: 40px;">Advisor Signature:</p>
      <div style="border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
      <p style="margin: 0;">{{ADVISOR_NAME}}</p>
      <p style="margin: 5px 0 0 0; color: #6b7280;">Date: {{REPORT_DATE}}</p>
    </div>
  </div>
</section>`
}

type FirmTemplate = {
  id: string
  name: string
  description?: string | null
  assessment_type?: string | null
  document_type?: string | null
  requires_signature?: boolean | null
  is_active?: boolean | null
  is_default?: boolean | null
  template_content?: string | null
  template_variables?: any
}

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState<FirmTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  )

  const [templateContent, setTemplateContent] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [standardSyncMessage, setStandardSyncMessage] = useState<string | null>(null)
  const [syncingStandards, setSyncingStandards] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const selectedStandardMeta = (selectedTemplate as any)?.template_variables?._standard as any | undefined
  const isStandardManaged = !!selectedStandardMeta
  const isStandardForked = !!selectedStandardMeta?.forked

  useEffect(() => {
    let cancelled = false

    const loadTemplates = async () => {
      setLoadingTemplates(true)
      setLoadError(null)

      try {
        const res = await fetch('/api/documents/templates/all?include_inactive=true')
        const data = await res.json().catch(() => ({}))

        if (!res.ok || !Array.isArray(data?.templates)) {
          throw new Error(data?.error || 'Failed to load templates')
        }

        if (cancelled) return
        const nextTemplates = data.templates as FirmTemplate[]
        setTemplates(nextTemplates)

        const preferred =
          nextTemplates.find((t) => String(t.assessment_type || '').startsWith('plannetic_')) ||
          nextTemplates[0] ||
          null

        if (preferred) {
          setSelectedTemplateId(preferred.id)
          setTemplateName(preferred.name || '')
          setTemplateContent(preferred.template_content || '')
        }
      } catch (error) {
        clientLogger.error('Failed to load templates', error)
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load templates')
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false)
      }
    }

    void loadTemplates()
    return () => {
      cancelled = true
    }
  }, [])

  const syncFromStandard = async (options?: { force?: boolean; onlySelected?: boolean }) => {
    setSyncingStandards(true)
    setStandardSyncMessage(null)

    try {
      const assessmentType = String(selectedTemplate?.assessment_type || '').trim()
      const onlySelected = options?.onlySelected === true
      const force = options?.force === true

      const res = await fetch('/api/documents/templates/sync-standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force,
          assessmentTypes: onlySelected && assessmentType ? [assessmentType] : undefined
        })
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !payload?.success || !payload?.result) {
        throw new Error(payload?.error || 'Failed to sync standards')
      }

      const result = payload.result as { updated?: number; installed?: number; skipped_forked?: string[] }
      const updatedCount = Number(result.updated || 0)
      const installedCount = Number(result.installed || 0)
      const skippedForkedCount = Array.isArray(result.skipped_forked) ? result.skipped_forked.length : 0

      setStandardSyncMessage(
        `Standard templates updated. Updated: ${updatedCount}, installed: ${installedCount}, skipped (customised): ${skippedForkedCount}.`
      )

      // Refresh templates list after syncing.
      const refreshedRes = await fetch('/api/documents/templates/all?include_inactive=true')
      const refreshed = await refreshedRes.json().catch(() => ({}))
      if (refreshedRes.ok && Array.isArray(refreshed?.templates)) {
        const nextTemplates = refreshed.templates as FirmTemplate[]
        setTemplates(nextTemplates)

        const stillSelected = selectedTemplateId && nextTemplates.find((t) => t.id === selectedTemplateId)
        const pick = stillSelected || nextTemplates[0] || null
        if (pick) {
          setSelectedTemplateId(pick.id)
          setTemplateName(pick.name || '')
          setTemplateContent(pick.template_content || '')
        }
      }
    } catch (error) {
      clientLogger.error('Standard sync failed', error)
      setStandardSyncMessage('Failed to update from standard templates.')
    } finally {
      setSyncingStandards(false)
    }
  }

  // Process template for preview
  const processTemplateForPreview = () => {
    const variables: Record<string, any> = {}
    TEMPLATE_VARIABLES.forEach((variable) => {
      variables[variable.key] = variable.example
    })
    variables.DOCUMENT_TITLE = templateName

    // Use the same renderer as server-side to support conditionals like `{{#if ...}}`.
    return populateTemplate(templateContent, variables)
  }

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const before = text.substring(0, start)
      const after = text.substring(end, text.length)
      const newText = `${before}{{${variable}}}${after}`
      setTemplateContent(newText)
      
      // Reset cursor position
      setTimeout(() => {
        textarea.selectionStart = start + variable.length + 4
        textarea.selectionEnd = start + variable.length + 4
        textarea.focus()
      }, 0)
    }
  }

  // Insert template section
  const insertSection = (sectionKey: keyof typeof TEMPLATE_SECTIONS) => {
    const section = TEMPLATE_SECTIONS[sectionKey]
    setTemplateContent(prev => prev + '\n\n' + section)
  }

  // Save template
  const saveTemplate = async () => {
    if (!selectedTemplateId) {
      alert('Select a template first')
      return
    }

    setSaving(true)
    
    try {
      const res = await fetch('/api/documents/templates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          name: templateName,
          description: selectedTemplate?.description ?? null,
          template_content: templateContent
        })
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !payload?.success || !payload?.template?.id) {
        throw new Error(payload?.error || 'Failed to save template')
      }

      setTemplates((prev) => prev.map((t) => (t.id === payload.template.id ? payload.template : t)))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      clientLogger.error('Save error:', err)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Export as HTML file
  const exportTemplate = () => {
    const blob = new Blob([templateContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateName.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Template Editor</h1>
            <p className="text-gray-600 mt-2">Create and customize professional document templates</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void syncFromStandard({ force: false, onlySelected: true })}
              disabled={syncingStandards || !selectedTemplate || !isStandardManaged || isStandardForked}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {syncingStandards ? 'Updating...' : 'Update from Standard'}
            </Button>
            <Button
              variant="outline"
              onClick={() => void syncFromStandard({ force: false, onlySelected: false })}
              disabled={syncingStandards}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {syncingStandards ? 'Updating...' : 'Update All Standards'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedTemplate || !isStandardManaged) return
                const ok = window.confirm(
                  'Reset this template to the standard version? This will overwrite your custom changes.'
                )
                if (!ok) return
                void syncFromStandard({ force: true, onlySelected: true })
              }}
              disabled={syncingStandards || !selectedTemplate || !isStandardManaged}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Standard
            </Button>
            <Button variant="outline" onClick={exportTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Export HTML
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>

        {showSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Template saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {selectedTemplate && isStandardManaged && isStandardForked && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800">
              This template has been customised. Use "Reset to Standard" to overwrite your edits.
            </AlertDescription>
          </Alert>
        )}

        {standardSyncMessage && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              {standardSyncMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Library */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingTemplates && (
                  <div className="text-sm text-gray-600">Loading templates...</div>
                )}

                {!loadingTemplates && loadError && (
                  <Alert>
                    <AlertDescription>{loadError}</AlertDescription>
                  </Alert>
                )}

                {!loadingTemplates && !loadError && templates.length === 0 && (
                  <div className="text-sm text-gray-600">No templates found for this firm.</div>
                )}

                {!loadingTemplates && !loadError && templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id)
                      setTemplateContent(template.template_content || '')
                      setTemplateName(template.name || '')
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? 'bg-blue-50 border-blue-300 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <h4 className="font-medium">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {template.assessment_type && (
                        <Badge variant="outline" className="text-xs">
                          {template.assessment_type}
                        </Badge>
                      )}
                      {!!template.template_variables?._standard && (
                        <Badge variant="outline" className="text-xs">
                          {template.template_variables?._standard?.forked ? 'Customised' : 'Standard'}
                        </Badge>
                      )}
                      {template.requires_signature === true && (
                        <Badge variant="outline" className="text-xs">
                          Requires signature
                        </Badge>
                      )}
                      {template.is_active === false && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4" disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Blank Template
                </Button>
              </CardContent>
            </Card>

            {/* Quick Insert Sections */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Quick Insert</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">Add pre-built sections:</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => insertSection('header')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Header Section
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => insertSection('clientInfo')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Client Info
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => insertSection('financialSummary')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Summary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => insertSection('signature')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Signature Block
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Editor Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="text-xl font-semibold max-w-md"
                    placeholder="Template Name"
                  />
                  <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                    <TabsList>
                      <TabsTrigger value="edit">
                        <Code className="h-4 w-4 mr-2" />
                        Edit
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {previewMode === 'edit' ? (
                  <div>
                    {/* Variable Pills */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Click to insert variables:</p>
                      <div className="flex flex-wrap gap-2">
                        {TEMPLATE_VARIABLES.map((variable) => {
                          const Icon = variable.icon
                          return (
                            <Button
                              key={variable.key}
                              variant="outline"
                              size="sm"
                              onClick={() => insertVariable(variable.key)}
                              className="text-xs"
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {variable.key}
                            </Button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Template Editor */}
                    <textarea
                      id="template-content"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      className="w-full h-[600px] p-4 border rounded-lg font-mono text-sm"
                      placeholder="Enter your template HTML here..."
                    />
                  </div>
                ) : (
                  <div>
                    {/* Preview */}
                    <div className="border rounded-lg p-8 bg-white min-h-[600px]">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(processTemplateForPreview(), {
                            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
                            allowedAttributes: {
                              ...sanitizeHtml.defaults.allowedAttributes,
                              img: ['src', 'alt', 'width', 'height', 'style'],
                              '*': ['style', 'class', 'id']
                            },
                            allowProtocolRelative: false
                          })
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
