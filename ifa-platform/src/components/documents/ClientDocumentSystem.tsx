// ===================================================================
// FIXED ClientDocumentSystem - No TypeScript Errors
// File: src/components/documents/ClientDocumentSystem.tsx
// ===================================================================

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Plus,
  Search,
  WandIcon,
  PenToolIcon,
  TrendingUpIcon,
  UserIcon,
  FileTextIcon,
  ArrowRightIcon
} from 'lucide-react'

// Import your existing types - ensure these match your actual type definitions
import type { ClientProfile } from '@/types'

// Extended client interface for document integration
interface ExtendedClientProfile extends ClientProfile {
  riskProfile?: {
    riskTolerance?: string
    attitudeToRisk?: number
  }
  financialProfile?: {
    investmentAmount?: number
    netWorth?: number
    annualIncome?: number
  }
}

// Document types matching your workflow
type DocumentType = 
  | 'client_agreement'
  | 'fact_find'
  | 'suitability_assessment' 
  | 'suitability_report'
  | 'investment_recommendation'
  | 'annual_review'
  | 'risk_assessment'
  | 'ongoing_service_agreement'
  | 'withdrawal_form'
  | 'portfolio_review'
  | 'compliance_declaration'

interface WorkflowDocument {
  id: string
  type: DocumentType
  title: string
  status: 'completed' | 'pending' | 'signed' | 'expired'
  createdDate: string
  signedDate?: string
  expiryDate?: string
  downloadUrl?: string
}

interface RequiredDocument {
  type: DocumentType
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  dueDate?: string
  canAutoGenerate: boolean
  templateId?: string
}

interface SuggestedDocument {
  type: DocumentType
  title: string
  reason: string
  priority: number // ✅ Fixed: Added missing priority property
  canAutoGenerate: boolean
  templateId?: string
}

interface DocumentTemplate {
  id: string
  name: string
  description?: string
  template_content: string
  requires_signature: boolean
  template_variables: Record<string, string>
  created_at: string
}

interface ClientDocumentWorkflow {
  client: ExtendedClientProfile
  completedDocuments: WorkflowDocument[]
  requiredDocuments: RequiredDocument[]
  suggestedNext: SuggestedDocument[]
  templates: DocumentTemplate[]
  completionStatus: {
    completed: number
    total: number
    percentage: number
  }
}

// ===================================================================
// SIMPLE SELECT COMPONENT (since @/components/ui/Select doesn't exist)
// ===================================================================
interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  )
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  )
}

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  return <span className="text-gray-500">{placeholder}</span>
}

const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  return <div>{children}</div>
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>
}

// ===================================================================
// MOCK SERVICES (Replace with your real services)
// ===================================================================

// Mock client service
const mockClientService = {
  async getClients(): Promise<ExtendedClientProfile[]> {
    // This would be replaced with your real client service
    return [
      {
        id: '1',
        clientRef: 'CLI001',
        title: 'Mr',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1975-06-15',
        age: 48,
        occupation: 'Software Engineer',
        maritalStatus: 'Married',
        dependents: 2,
        address: {
          street: '123 Main St',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'UK'
        },
        contactDetails: {
          phone: '01234 567890',
          email: 'john.smith@email.com',
          preferredContact: 'email' as const
        },
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:22:00Z',
        riskProfile: {
          riskTolerance: 'Moderate',
          attitudeToRisk: 6
        },
        financialProfile: {
          investmentAmount: 150000,
          netWorth: 350000,
          annualIncome: 85000
        }
      }
      // Add more mock clients as needed
    ]
  },

  getClientDisplayName(client: ExtendedClientProfile): string {
    const title = client.title ? `${client.title} ` : ''
    return `${title}${client.firstName} ${client.lastName}`.trim()
  }
}

// Mock workflow engine
const mockWorkflowEngine = {
  async getClientWorkflow(clientId: string): Promise<ClientDocumentWorkflow | null> {
    const clients = await mockClientService.getClients()
    const client = clients.find(c => c.id === clientId)
    if (!client) return null

    return {
      client,
      completedDocuments: [
        {
          id: 'doc1',
          type: 'client_agreement',
          title: 'Client Service Agreement',
          status: 'signed',
          createdDate: '2024-01-15T10:00:00Z',
          signedDate: '2024-01-16T14:30:00Z'
        }
      ],
      requiredDocuments: [
        {
          type: 'suitability_report',
          title: 'Suitability Report',
          description: 'Comprehensive suitability assessment report',
          urgency: 'high',
          canAutoGenerate: true,
          templateId: '1f9ab2d6-0eb9-48c7-a82c-07bd63d0dfce' // Real template ID from your database
        }
      ],
      suggestedNext: [
        {
          type: 'annual_review',
          title: 'Annual Review Report',
          reason: 'Client onboarded over 12 months ago',
          priority: 1, // ✅ Fixed: Added priority property
          canAutoGenerate: true,
          templateId: 'd796a0ac-8266-41f0-b626-b46f9c73aa9c' // Real template ID from your database
        }
      ],
      templates: [
        {
          id: '485f9812-6dab-4b72-9462-ef65573f6225',
          name: 'Client Service Agreement',
          description: 'Standard client service agreement template',
          template_content: '<h1>Client Service Agreement</h1>...',
          requires_signature: true,
          template_variables: {},
          created_at: '2025-07-17T20:07:56Z'
        },
        {
          id: '1f9ab2d6-0eb9-48c7-a82c-07bd63d0dfce',
          name: 'Suitability Report',
          description: 'Client suitability assessment report',
          template_content: '<h1>Suitability Report</h1>...',
          requires_signature: true,
          template_variables: {},
          created_at: '2025-07-17T20:07:56Z'
        },
        {
          id: 'd796a0ac-8266-41f0-b626-b46f9c73aa9c',
          name: 'Annual Review Report',
          description: 'Annual client review report template',
          template_content: '<h1>Annual Review Report</h1>...',
          requires_signature: false,
          template_variables: {},
          created_at: '2025-07-17T20:07:56Z'
        }
      ],
      completionStatus: {
        completed: 1,
        total: 2,
        percentage: 50
      }
    }
  }
}

// Mock document service
const mockDocumentService = {
  async generateDocument(params: { templateId: string; clientId: string }, client: ExtendedClientProfile) {
    console.log('Generating document:', params, client)
    // This would be replaced with your real document generation
    return {
      success: true,
      document: {
        id: 'new-doc-' + Date.now(),
        name: 'Generated Document',
        signature_status: 'pending'
      }
    }
  }
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function ClientDocumentSystem() {
  // State management
  const [clients, setClients] = useState<ExtendedClientProfile[]>([])
  const [selectedClient, setSelectedClient] = useState<ExtendedClientProfile | null>(null)
  const [clientWorkflow, setClientWorkflow] = useState<ClientDocumentWorkflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load clients on mount
  useEffect(() => {
    loadClients()
  }, [])

  // Load client workflow when client changes
  useEffect(() => {
    if (selectedClient) {
      loadClientWorkflow(selectedClient.id)
    }
  }, [selectedClient])

  const loadClients = async () => {
    try {
      setLoading(true)
      const clientData = await mockClientService.getClients()
      setClients(clientData)
      
      if (clientData.length > 0) {
        setSelectedClient(clientData[0])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClientWorkflow = async (clientId: string) => {
    try {
      const workflow = await mockWorkflowEngine.getClientWorkflow(clientId)
      setClientWorkflow(workflow)
    } catch (error) {
      console.error('Error loading client workflow:', error)
    }
  }

  // ===================================================================
  // DOCUMENT GENERATION
  // ===================================================================

  const handleGenerateDocument = async (templateId: string, type: DocumentType) => {
    if (!selectedClient) {
      alert('Please select a client first')
      return
    }
    
    setIsGenerating(true)
    try {
      const result = await mockDocumentService.generateDocument(
        { templateId, clientId: selectedClient.id }, 
        selectedClient
      )

      if (result.success) {
        alert(`Document generated successfully!`)
        // Reload the client workflow to show the new document
        await loadClientWorkflow(selectedClient.id)
      } else {
        throw new Error('Generation failed')
      }
    } catch (error) {
      console.error('Error generating document:', error)
      alert('Failed to generate document: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGenerating(false)
    }
  }

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  const filteredClients = clients.filter(client =>
    mockClientService.getClientDisplayName(client).toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contactDetails.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.clientRef.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // ===================================================================
  // RENDER COMPONENT
  // ===================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading client data...</p>
        </div>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Clients Found</CardTitle>
          <CardDescription>
            No clients are available in the system. Please add clients first to use document generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadClients} className="mr-2">
            Refresh Data
          </Button>
          <Button variant="outline">
            Add Client
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Document Management</h2>
          <p className="text-gray-600 mt-1">Generate and manage documents with real client data</p>
        </div>
        {selectedClient && (
          <Badge className="bg-blue-100 text-blue-800">
            {clients.length} clients loaded
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Selection Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select Client</h3>
              <Badge className="bg-blue-100 text-blue-800">
                {filteredClients.length} clients
              </Badge>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Client List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredClients.map((client) => {
                const clientName = mockClientService.getClientDisplayName(client)
                const isSelected = selectedClient?.id === client.id

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{clientName}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{client.contactDetails.email}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <Badge className="bg-gray-100 text-gray-600 text-xs">
                            {client.clientRef}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-600 text-xs">
                            {client.riskProfile?.riskTolerance || 'No risk profile'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Document Workflow Panel */}
        <div className="lg:col-span-2">
          {!selectedClient ? (
            <Card className="p-8 text-center">
              <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
              <p className="text-gray-600">
                Choose a client from the left panel to view their document workflow and generate required documents.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Client Header */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {mockClientService.getClientDisplayName(selectedClient)}
                    </h2>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>Risk: {selectedClient.riskProfile?.riskTolerance || 'Not assessed'}</span>
                      <span>•</span>
                      <span>Investment: £{selectedClient.financialProfile?.investmentAmount?.toLocaleString() || '0'}</span>
                      <span>•</span>
                      <span>Client since: {new Date(selectedClient.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {clientWorkflow && (
                      <>
                        <Badge className="bg-green-100 text-green-800">
                          {clientWorkflow.completedDocuments.length} completed
                        </Badge>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {clientWorkflow.requiredDocuments.length} required
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Required Documents */}
              {clientWorkflow?.requiredDocuments && clientWorkflow.requiredDocuments.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Required Documents</h3>
                    <Badge className="bg-red-100 text-red-800">
                      Action Required
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {clientWorkflow.requiredDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                            <span className="font-medium text-gray-900">{doc.title}</span>
                            <Badge className={`ml-2 text-xs ${getUrgencyColor(doc.urgency)}`}>
                              {doc.urgency}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.canAutoGenerate && doc.templateId && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateDocument(doc.templateId!, doc.type)}
                              disabled={isGenerating}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isGenerating ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              ) : (
                                <WandIcon className="h-3 w-3 mr-1" />
                              )}
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Suggested Documents */}
              {clientWorkflow?.suggestedNext && clientWorkflow.suggestedNext.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Suggested Next Steps</h3>
                    <Badge className="bg-blue-100 text-blue-800">
                      Smart Suggestions
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {clientWorkflow.suggestedNext.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <TrendingUpIcon className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="font-medium text-gray-900">{doc.title}</span>
                            <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                              Priority {doc.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{doc.reason}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.canAutoGenerate && doc.templateId && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateDocument(doc.templateId!, doc.type)}
                              disabled={isGenerating}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <WandIcon className="h-3 w-3 mr-1" />
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Document History */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document History</h3>
                <div className="space-y-3">
                  {clientWorkflow?.completedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center flex-1">
                        {getStatusIcon(doc.status)}
                        <div className="ml-3">
                          <span className="font-medium text-gray-900">{doc.title}</span>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>Created: {new Date(doc.createdDate).toLocaleDateString('en-GB')}</span>
                            {doc.signedDate && (
                              <>
                                <span>•</span>
                                <span>Signed: {new Date(doc.signedDate).toLocaleDateString('en-GB')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${
                          doc.status === 'signed' ? 'bg-green-100 text-green-800' :
                          doc.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {(!clientWorkflow?.completedDocuments || clientWorkflow.completedDocuments.length === 0) && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      No documents found for this client. Generate your first document using the required documents section above.
                    </AlertDescription>
                  </Alert>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}