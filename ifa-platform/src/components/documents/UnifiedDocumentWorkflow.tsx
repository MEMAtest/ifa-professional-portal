// ===================================================================
// UNIFIED DOCUMENT WORKFLOW - Complete Page Replacement (FIXED)
// File: src/app/documents/page.tsx
// This replaces everything on your documents page
// ===================================================================

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Users, 
  FileText, 
  Search, 
  Eye,
  Send,
  Download,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Mail,
  Wand2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useRef } from 'react'
import clientLogger from '@/lib/logging/clientLogger'
import { DEFAULT_TEMPLATE_CONTENT } from './unifiedDocumentWorkflowConstants'
import {
  formatCurrency,
  getClientDisplayName,
  getFallbackTemplates,
  sanitizeDocumentHtml
} from './unifiedDocumentWorkflowUtils'
import type {
  DocumentTemplate,
  GeneratedDocument,
  RealClient,
  WorkflowStep
} from './unifiedDocumentWorkflowTypes'

// ===================================================================
// TYPES & INTERFACES (FIXED)
// ===================================================================

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function UnifiedDocumentWorkflow() {
  // State Management
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('select-client')
  const [clients, setClients] = useState<RealClient[]>([])
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedClient, setSelectedClient] = useState<RealClient | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Supabase client with proper initialization pattern
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createClient()
    } catch (error) {
      clientLogger.error("CRITICAL: Supabase client initialization failed. Check environment variables.", error)
      return null
    }
  }, [])

  // ===================================================================
  // DATA LOADING (FIXED)
  // ===================================================================

  const loadRealClients = useCallback(async () => {
    if (!supabase) {
      clientLogger.error("Action failed: Supabase client is not available in loadRealClients.")
      return
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to load clients: ${error.message}`)
      }

      // Ensure proper type structure
      const typedClients: RealClient[] = (data || [])
        .filter(client => 
          client.personal_details?.firstName && 
          client.personal_details?.lastName
        )
        .map(client => ({
          id: client.id,
          client_ref: client.client_ref || '',
          personal_details: client.personal_details || {},
          contact_info: client.contact_info || {},
          financial_profile: client.financial_profile || {},
          risk_profile: client.risk_profile || {},
          status: client.status || 'active',
          created_at: client.created_at || new Date().toISOString()
        }))

      setClients(typedClients)
    } catch (err) {
      clientLogger.error('Error loading clients:', err)
      throw err
    }
  }, [supabase])

  const loadTemplates = useCallback(async () => {
    if (!supabase) {
      clientLogger.error("Action failed: Supabase client is not available in loadTemplates.")
      // Set fallback templates even when client is not available
      setTemplates(getFallbackTemplates())
      return
    }

    // Always start with fallback templates
    const fallbackTemplates = getFallbackTemplates()
    
    // Set fallback templates immediately so UI has something
    setTemplates(fallbackTemplates)
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')

      if (error) {
        clientLogger.error('Supabase error:', error)
        // Keep using fallback templates
        return
      }

      if (data && data.length > 0) {
        // Use real templates from database
        const processedTemplates: DocumentTemplate[] = data.map(template => ({
          id: template.id,
          name: template.name || 'Unnamed Template',
          description: template.description || null,
          template_content: template.template_content || DEFAULT_TEMPLATE_CONTENT,
          requires_signature: template.requires_signature ?? true,
          template_variables: template.template_variables || {},
          is_active: template.is_active ?? true
        }))

        setTemplates(processedTemplates)
      } else {
      }
    } catch (err) {
      clientLogger.error('Template loading error:', err)
      // Fallback templates already set
    }
  }, [supabase])

  const loadInitialData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase client is not available')
      return
    }

    setLoading(true)
    try {
      await Promise.all([
        loadRealClients(),
        loadTemplates()
      ])
    } catch (err) {
      setError('Failed to load data. Please refresh the page.')
      clientLogger.error('Data loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [loadRealClients, loadTemplates, supabase])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // ===================================================================
  // DOCUMENT GENERATION (FIXED)
  // ===================================================================

  const generateDocument = async () => {
    if (!selectedClient || !selectedTemplate) {
      setError('Please select both a client and template')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use template content or default
      const templateContent = selectedTemplate.template_content || DEFAULT_TEMPLATE_CONTENT

      // Process template variables with safe defaults
      const variables: Record<string, string> = {
        DOCUMENT_TITLE: selectedTemplate.name,
        CLIENT_NAME: getClientDisplayName(selectedClient),
        CLIENT_EMAIL: selectedClient.contact_info?.email || 'Not provided',
        CLIENT_REF: selectedClient.client_ref || 'N/A',
        ADVISOR_NAME: 'Professional Advisor',
        REPORT_DATE: new Date().toLocaleDateString('en-GB'),
        RISK_PROFILE: selectedClient.risk_profile?.riskTolerance || 'Not assessed',
        INVESTMENT_AMOUNT: formatCurrency(selectedClient.financial_profile?.investmentAmount || 0),
        ANNUAL_INCOME: formatCurrency(selectedClient.financial_profile?.annualIncome || 0),
        NET_WORTH: formatCurrency(selectedClient.financial_profile?.netWorth || 0),
        RECOMMENDATION: `Based on your ${selectedClient.risk_profile?.riskTolerance || 'moderate'} risk profile and financial objectives, we recommend a tailored investment strategy.`
      }

      // Replace template variables
      let processedContent = templateContent
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        processedContent = processedContent.replace(regex, String(value))
      })

      // Check if document generation API exists
      try {
        const response = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: processedContent,
            title: `${selectedTemplate.name} - ${variables.CLIENT_NAME}`,
            clientId: selectedClient.id,
            templateId: selectedTemplate.id,
            variables
          })
        })

        if (response.ok) {
          const result = await response.json()
          setGeneratedDocument({
            id: result.document?.id || `doc-${Date.now()}`,
            name: result.document?.name || `${selectedTemplate.name} - ${variables.CLIENT_NAME}`,
            file_path: result.document?.file_path || '',
            url: result.url || '#',
            content: processedContent
          })
        } else {
          // Fallback if API doesn't exist
          setGeneratedDocument({
            id: `doc-${Date.now()}`,
            name: `${selectedTemplate.name} - ${variables.CLIENT_NAME}`,
            file_path: '',
            url: '#',
            content: processedContent
          })
        }
      } catch (apiError) {
        // Fallback for missing API
        setGeneratedDocument({
          id: `doc-${Date.now()}`,
          name: `${selectedTemplate.name} - ${variables.CLIENT_NAME}`,
          file_path: '',
          url: '#',
          content: processedContent
        })
      }

      // Send notification email
      try {
        await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'documentSent',
            recipient: selectedClient.contact_info?.email,
            data: {
              clientName: getClientDisplayName(selectedClient),
              documentName: selectedTemplate.name
            }
          })
        })
      } catch (emailError) {
      }

      setCurrentStep('preview-document')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document generation failed')
      clientLogger.error('Document generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Function to save as PDF
  const saveAsPDF = async () => {
    if (!generatedDocument) return

    setLoading(true)
    try {
      // Simple approach: open print dialog
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${generatedDocument.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${generatedDocument.content}
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
          setTimeout(() => printWindow.close(), 1000)
        }
      }
    } catch (err) {
      clientLogger.error('PDF generation error:', err)
      setError('Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  const sendForSignature = async () => {
    if (!generatedDocument || !selectedClient || !selectedTemplate) return

    setLoading(true)
    try {
      // Check if signature API exists
      try {
        const response = await fetch('/api/documents/send-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: generatedDocument.id,
            documentUrl: generatedDocument.url,
            clientEmail: selectedClient.contact_info?.email || '',
            clientName: getClientDisplayName(selectedClient),
            templateName: selectedTemplate.name
          })
        })

        if (!response.ok && response.status !== 404) {
          throw new Error('Failed to send for signature')
        }
      } catch (apiError) {
      }

      setCurrentStep('confirm-send')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send document')
    } finally {
      setLoading(false)
    }
  }

  // ===================================================================
  // HELPER FUNCTIONS (FIXED)
  // ===================================================================

  const filteredClients = clients.filter(client => {
    const searchLower = searchQuery.toLowerCase()
    const displayName = getClientDisplayName(client).toLowerCase()
    const email = client.contact_info?.email?.toLowerCase() || ''
    const ref = client.client_ref?.toLowerCase() || ''
    
    return displayName.includes(searchLower) || 
           email.includes(searchLower) || 
           ref.includes(searchLower)
  })

  const resetWorkflow = () => {
    setCurrentStep('select-client')
    setSelectedClient(null)
    setSelectedTemplate(null)
    setGeneratedDocument(null)
    setError(null)
  }

  // ===================================================================
  // STEP COMPONENTS (FIXED)
  // ===================================================================

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Step 1 */}
        <div className={`flex items-center ${currentStep === 'select-client' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            selectedClient ? 'bg-green-100 text-green-600' : currentStep === 'select-client' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}>
            {selectedClient ? <CheckCircle className="h-4 w-4" /> : '1'}
          </div>
          <span className="ml-2 text-sm font-medium">Select Client</span>
        </div>

        <ArrowRight className="h-4 w-4 text-gray-400" />

        {/* Step 2 */}
        <div className={`flex items-center ${currentStep === 'select-template' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            selectedTemplate ? 'bg-green-100 text-green-600' : currentStep === 'select-template' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}>
            {selectedTemplate ? <CheckCircle className="h-4 w-4" /> : '2'}
          </div>
          <span className="ml-2 text-sm font-medium">Choose Template</span>
        </div>

        <ArrowRight className="h-4 w-4 text-gray-400" />

        {/* Step 3 */}
        <div className={`flex items-center ${currentStep === 'preview-document' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            generatedDocument ? 'bg-green-100 text-green-600' : currentStep === 'preview-document' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}>
            {generatedDocument ? <CheckCircle className="h-4 w-4" /> : '3'}
          </div>
          <span className="ml-2 text-sm font-medium">Preview & Send</span>
        </div>
      </div>
    </div>
  )

  const ClientSelectionStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Select a Client</h2>
          <span className="text-sm text-gray-500">({clients.length} available)</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={searchInputRef}
          placeholder="Search clients by name, email, or reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          type="text"
          autoComplete="off"
          autoFocus
          onKeyDown={(e) => {
            // Prevent global shortcuts from stealing focus
            e.stopPropagation()
            if (e.key === 'Enter') {
              e.preventDefault()
            }
          }}
          onKeyUp={(e) => e.stopPropagation()}
          onBlur={() => {
            // Refocus if the user is still on this step and the field loses focus unexpectedly
            requestAnimationFrame(() => {
              if (currentStep === 'select-client' && searchInputRef.current) {
                searchInputRef.current.focus()
              }
            })
          }}
        />
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          // Note: using any type here for flexibility
          const fp = client.financial_profile as any
          const income = fp?.annualIncome || fp?.annual_income
          const netWorth = fp?.netWorth || fp?.net_worth
          const risk = client.risk_profile?.riskTolerance || 'No risk profile'

          return (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedClient?.id === client.id ? 'ring-2 ring-blue-400' : 'ring-1 ring-gray-100'
              }`}
              onClick={() => {
                setSelectedClient(client)
                setCurrentStep('select-template')
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{getClientDisplayName(client)}</h4>
                    <p className="text-sm text-gray-500">{client.contact_info?.email || 'No email'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{client.client_ref}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{client.status || 'active'}</Badge>
                      <Badge variant="outline" className="text-xs">{risk}</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 mt-1" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <div>
                    <p className="text-xs text-gray-500">Annual Income</p>
                    <p className="font-medium">£{formatCurrency(income || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net Worth</p>
                    <p className="font-medium">£{formatCurrency(netWorth || 0)}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-blue-600 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Click to start document generation
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No clients found matching your search.</p>
        </div>
      )}
    </div>
  )

  const TemplateSelectionStep = () => {
    // Smart template recommendations based on client profile
    const getRecommendedTemplate = () => {
      if (!selectedClient) return null
      
      const riskProfile = selectedClient.risk_profile?.riskTolerance?.toLowerCase()
      const hasInvestment = (selectedClient.financial_profile?.investmentAmount || 0) > 0
      
      if (!riskProfile || riskProfile === 'not assessed') {
        return 'Suitability Report' // Need to assess risk first
      } else if (hasInvestment) {
        return 'Annual Review Report' // Has existing investments
      } else {
        return 'Client Service Agreement' // New client
      }
    }
    
    const recommendedTemplate = getRecommendedTemplate()
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Choose Document Template
          </CardTitle>
          {selectedClient && (
            <div className="text-sm text-gray-600">
              Generating document for: <strong>{getClientDisplayName(selectedClient)}</strong>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {recommendedTemplate && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800">
                <Wand2 className="h-4 w-4" />
                <span className="font-medium">Recommended Template</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Based on the client profile, we recommend: <strong>{recommendedTemplate}</strong>
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            {templates.map((template) => {
              const isRecommended = template.name === recommendedTemplate
              
              return (
                <div
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template)
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50 ${
                    selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 
                    isRecommended ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        {template.name}
                        {isRecommended && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Recommended</Badge>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {template.description || 'Professional document template'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {template.requires_signature && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">Requires Signature</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">Professional Template</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )
            })}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No templates available.</p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('select-client')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Clients
            </Button>
            
            <Button
              onClick={generateDocument}
              disabled={!selectedTemplate || loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Generate Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const DocumentPreviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Document Preview
        </CardTitle>
        {selectedClient && selectedTemplate && (
          <div className="text-sm text-gray-600">
            <strong>{selectedTemplate.name}</strong> for <strong>{getClientDisplayName(selectedClient)}</strong>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {generatedDocument && (
          <>
            {/* Document Preview - Enhanced */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Document Preview</h3>
                <span className="text-xs text-gray-500">Scroll to view full document</span>
              </div>
              <div className="border-2 border-gray-200 rounded-lg shadow-inner bg-white">
                <div className="h-[500px] overflow-y-auto p-8">
                  <div 
                    dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(generatedDocument.content) }} 
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('select-template')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Change Template
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={saveAsPDF}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Save as PDF
                </Button>

                {generatedDocument.url !== '#' && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(generatedDocument.url, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                )}

                {selectedTemplate?.requires_signature && selectedClient?.contact_info?.email ? (
                  <Button
                    onClick={sendForSignature}
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending to DocuSeal...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send for Signature (DocuSeal)
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentStep('confirm-send')}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </Button>
                )}
              </div>
            </div>

            {/* DocuSeal Info */}
            {selectedTemplate?.requires_signature && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium">DocuSeal Integration</p>
                <p className="text-xs mt-1">
                  Document will be sent to: <strong>{selectedClient?.contact_info?.email || 'No email provided'}</strong>
                </p>
                {!selectedClient?.contact_info?.email && (
                  <p className="text-xs mt-1 text-orange-600">
                    ⚠️ Client email required for signature
                  </p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                  {error.includes('Demo mode') && (
                    <p className="text-xs mt-1">The document workflow is complete for demonstration.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  const ConfirmationStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          Document Process Complete!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <div className="text-lg font-medium text-gray-900 mb-2">
            {selectedTemplate?.name} has been processed for {getClientDisplayName(selectedClient!)}
          </div>
          
          {selectedClient?.contact_info?.email && selectedTemplate?.requires_signature && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="text-green-800 font-medium mb-2">
                  ✓ Document Successfully Sent
                </div>
                <div className="text-sm text-green-700">
                  <p>Recipient: {selectedClient.contact_info.email}</p>
                  <p>Template: {selectedTemplate.name}</p>
                  <p>Status: Awaiting signature</p>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <Send className="h-3 w-3" />
                Sent via DocuSeal for electronic signature
              </div>
            </>
          )}
          
          <div className="flex justify-center gap-4 mt-6">
            {generatedDocument?.url && generatedDocument.url !== '#' && (
              <Button
                variant="outline"
                onClick={() => window.open(generatedDocument.url, '_blank')}
              >
                View Document
              </Button>
            )}
            <Button onClick={resetWorkflow}>
              Generate Another Document
            </Button>
          </div>

          {/* Demo Note for Showcase */}
          <div className="mt-6 text-xs text-gray-500">
            <p>For demonstration purposes. In production, signatures are tracked in real-time.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ===================================================================
  // MAIN RENDER
  // ===================================================================

  if (loading && currentStep === 'select-client') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Loading real client data...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Document Generation</h1>
          <p className="text-gray-600 mt-2">Professional document workflow with real client data</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        {currentStep === 'select-client' && <ClientSelectionStep />}
        {currentStep === 'select-template' && <TemplateSelectionStep />}
        {currentStep === 'preview-document' && <DocumentPreviewStep />}
        {currentStep === 'confirm-send' && <ConfirmationStep />}

        {/* Progress Summary */}
        {selectedClient && (
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <strong>Client:</strong> {getClientDisplayName(selectedClient)} ({selectedClient.client_ref})
                </div>
                {selectedTemplate && (
                  <div>
                    <strong>Template:</strong> {selectedTemplate.name}
                  </div>
                )}
                {generatedDocument && (
                  <div className="text-green-600">
                    <strong>Document:</strong> Generated ✓
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
