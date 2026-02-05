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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Save, 
  Eye, 
  Code, 
  FileText,
  Plus,
  Copy,
  Download,
  Wand2,
  Type,
  Calendar,
  DollarSign,
  Hash,
  User,
  Mail,
  Building
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import clientLogger from '@/lib/logging/clientLogger'

// Template variables with icons and descriptions
const TEMPLATE_VARIABLES = [
  { key: 'CLIENT_NAME', icon: User, description: 'Full client name', example: 'John Smith' },
  { key: 'CLIENT_EMAIL', icon: Mail, description: 'Client email address', example: 'john@example.com' },
  { key: 'CLIENT_REF', icon: Hash, description: 'Client reference number', example: 'CLI123456' },
  { key: 'COMPANY_NAME', icon: Building, description: 'Your company name', example: 'ABC Financial Ltd' },
  { key: 'ADVISOR_NAME', icon: User, description: 'Advisor full name', example: 'Jane Advisor' },
  { key: 'REPORT_DATE', icon: Calendar, description: 'Current date', example: '30/01/2025' },
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

// Professional template library
const TEMPLATE_LIBRARY = [
  {
    id: 'service-agreement',
    name: 'Client Service Agreement',
    description: 'Comprehensive service agreement with terms and conditions',
    category: 'Legal',
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px;">
  ${TEMPLATE_SECTIONS.header}
  ${TEMPLATE_SECTIONS.clientInfo}
  
  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Services Provided</h2>
    <p>{{COMPANY_NAME}} agrees to provide the following financial advisory services:</p>
    <ul>
      <li>Comprehensive financial planning and analysis</li>
      <li>Investment portfolio management and recommendations</li>
      <li>Regular portfolio reviews and rebalancing</li>
      <li>Tax-efficient investment strategies</li>
      <li>Retirement planning guidance</li>
    </ul>
  </section>

  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Terms and Conditions</h2>
    <p>This agreement is effective from {{REPORT_DATE}} and continues until terminated by either party with 30 days written notice.</p>
    <p>All advice provided is based on the information supplied by the client and current market conditions.</p>
  </section>

  ${TEMPLATE_SECTIONS.signature}
</div>`
  },
  {
    id: 'suitability-report',
    name: 'Investment Suitability Report',
    description: 'Detailed assessment of investment suitability',
    category: 'Advisory',
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px;">
  ${TEMPLATE_SECTIONS.header}
  ${TEMPLATE_SECTIONS.clientInfo}
  ${TEMPLATE_SECTIONS.financialSummary}
  
  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Risk Assessment</h2>
    <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; border-left: 4px solid #4f46e5;">
      <p style="margin: 0;"><strong>Your Risk Profile:</strong> {{RISK_PROFILE}}</p>
      <p style="margin: 10px 0 0 0;">Based on our comprehensive assessment, this risk profile aligns with your financial goals and investment timeline.</p>
    </div>
  </section>

  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Recommendations</h2>
    <p>Based on your {{RISK_PROFILE}} risk profile and financial objectives, we recommend a diversified portfolio allocation designed to balance growth potential with risk management.</p>
  </section>

  ${TEMPLATE_SECTIONS.signature}
</div>`
  },
  {
    id: 'annual-review',
    name: 'Annual Portfolio Review',
    description: 'Comprehensive annual investment review',
    category: 'Review',
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px;">
  ${TEMPLATE_SECTIONS.header}
  ${TEMPLATE_SECTIONS.clientInfo}
  
  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Portfolio Performance Summary</h2>
    <p>This annual review covers your investment portfolio performance and provides recommendations for the coming year.</p>
  </section>

  ${TEMPLATE_SECTIONS.financialSummary}
  
  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Market Outlook</h2>
    <p>Current market conditions and economic factors have been considered in our ongoing strategy for your portfolio.</p>
  </section>

  <section style="margin-bottom: 30px;">
    <h2 style="color: #374151;">Recommendations for Next Year</h2>
    <p>Based on your current {{RISK_PROFILE}} risk profile and market conditions, we recommend maintaining your current investment strategy with minor adjustments to optimize performance.</p>
  </section>

  ${TEMPLATE_SECTIONS.signature}
</div>`
  }
]

export default function TemplateEditorPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_LIBRARY[0])
  const [templateContent, setTemplateContent] = useState(TEMPLATE_LIBRARY[0].content)
  const [templateName, setTemplateName] = useState(TEMPLATE_LIBRARY[0].name)
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Supabase client with proper initialization pattern
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createClient()
    } catch (error) {
      clientLogger.error("CRITICAL: Supabase client initialization failed. Check environment variables.", error)
      return null
    }
  }, [])

  // Process template for preview
  const processTemplateForPreview = () => {
    let processed = templateContent
    TEMPLATE_VARIABLES.forEach(variable => {
      const regex = new RegExp(`{{${variable.key}}}`, 'g')
      processed = processed.replace(regex, variable.example)
    })
    // Add document title
    processed = processed.replace(/{{DOCUMENT_TITLE}}/g, templateName)
    return processed
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
    if (!supabase) {
      clientLogger.error("Action failed: Supabase client is not available in saveTemplate.")
      alert("Cannot save template: Supabase client is not available")
      return
    }

    setSaving(true)
    
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('document_templates')
        .upsert({
          name: templateName,
          template_content: templateContent,
          description: selectedTemplate.description,
          category_id: selectedTemplate.category,
          is_active: true,
          updated_at: new Date().toISOString()
        })

      if (!error) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        clientLogger.error('Save error:', error)
        alert('Failed to save template')
      }
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Library */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEMPLATE_LIBRARY.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setTemplateContent(template.content)
                      setTemplateName(template.name)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate.id === template.id
                        ? 'bg-blue-50 border-blue-300 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {template.category}
                    </Badge>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4">
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
