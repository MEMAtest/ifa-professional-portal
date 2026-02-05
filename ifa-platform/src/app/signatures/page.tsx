// app/signatures/page.tsx
// FIXED: All TypeScript errors resolved - PRODUCTION READY

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSignatureRequests } from '@/lib/hooks/useDocuments'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import clientLogger from '@/lib/logging/clientLogger'
import type { Firm, FirmAddress } from '@/modules/firm/types/firm.types'
import {
  PenToolIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  MailIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  XIcon,
  FileTextIcon,
  UserIcon
} from 'lucide-react'

interface Client {
  id: string
  client_ref: string
  personal_details: {
    firstName?: string
    lastName?: string
    title?: string
  }
  contact_info?: {
    email?: string
  }
}

interface Template {
  id: string
  name: string
}

interface ClientDocument {
  id: string
  name?: string
  file_name?: string
  document_type?: string
  category?: string
  type?: string
  status?: string
  created_at?: string
  file_size?: number
}

export default function SignaturesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [firm, setFirm] = useState<Firm | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [signerEmail, setSignerEmail] = useState('')
  const [signerName, setSignerName] = useState('')
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const [generatingTemplate, setGeneratingTemplate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // This would typically load all signature requests for the firm
  const { signatureRequests, loading, error, createSignatureRequest } = useSignatureRequests()

  // Fetch clients and templates for the modal
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const clientsRes = await fetch('/api/clients?limit=100')
        const clientsData = await clientsRes.json()
        if (clientsData.clients) {
          setClients(clientsData.clients)
        }

        // Fetch templates
        const templatesRes = await fetch('/api/documents/templates/all')
        const templatesData = await templatesRes.json()
        if (templatesData.templates) {
          setTemplates(templatesData.templates)
        }

        const firmRes = await fetch('/api/firm')
        if (firmRes.ok) {
          const firmData = await firmRes.json()
          setFirm(firmData)
        }
      } catch (err) {
        clientLogger.error('Failed to fetch data:', err)
      }
    }
    fetchData()
  }, [])

  // Update signer info when client is selected
  useEffect(() => {
    if (selectedClient) {
      const client = clients.find(c => c.id === selectedClient)
      if (client) {
        const name = `${client.personal_details?.title || ''} ${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim()
        setSignerName(name)
        setSignerEmail(client.contact_info?.email || '')
      }
    }
  }, [selectedClient, clients])

  const loadClientDocuments = useCallback(async () => {
    if (!selectedClient) {
      setClientDocuments([])
      setSelectedDocumentIds([])
      return
    }
    try {
      const res = await fetch(`/api/documents/client/${selectedClient}`)
      const data = await res.json()
      setClientDocuments(Array.isArray(data?.documents) ? data.documents : [])
    } catch (err) {
      clientLogger.error('Failed to fetch client documents:', err)
      setClientDocuments([])
    }
  }, [selectedClient])

  useEffect(() => {
    void loadClientDocuments()
  }, [loadClientDocuments])

  const formatLabel = (value?: string | null) => {
    if (!value) return ''
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const getDocumentGroupLabel = (doc: ClientDocument) => {
    const rawCategory = doc.category || ''
    const category = rawCategory.toLowerCase()

    if (category.includes('assessment')) return 'Assessment Reports'
    if (category.includes('planning')) return 'Planning Reports'
    if (category.includes('client')) return 'Client Documents'
    if (category.includes('compliance')) return 'Compliance'

    const type = doc.document_type || doc.type || ''
    return formatLabel(type) || 'Other'
  }

  const groupedDocuments = useMemo(() => {
    const groups = new Map<string, ClientDocument[]>()
    clientDocuments.forEach((doc) => {
      const label = getDocumentGroupLabel(doc)
      const current = groups.get(label) || []
      current.push(doc)
      groups.set(label, current)
    })

    const order = ['Assessment Reports', 'Client Documents', 'Compliance', 'Planning Reports', 'Other']
    const sorted = Array.from(groups.entries()).sort((a, b) => {
      const aIndex = order.indexOf(a[0])
      const bIndex = order.indexOf(b[0])
      if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return sorted
  }, [clientDocuments])

  const previewDocument = previewDocumentId
    ? clientDocuments.find((doc) => doc.id === previewDocumentId) || null
    : null
  const previewUrl = previewDocumentId ? `/api/documents/preview/${previewDocumentId}` : null

  const formatFirmAddress = (address?: FirmAddress) => {
    if (!address) return ''
    return [address.line1, address.line2, address.city, address.postcode, address.country]
      .filter(Boolean)
      .join(', ')
  }

  const buildTemplateVariables = (client: Client | undefined) => {
    const displayName = client ? getClientDisplayName(client) : ''
    return {
      CLIENT_NAME: displayName,
      CLIENT_EMAIL: client?.contact_info?.email || '',
      CLIENT_REF: client?.client_ref || '',
      REPORT_DATE: new Date().toLocaleDateString('en-GB'),
      DOCUMENT_TITLE: templates.find(t => t.id === selectedTemplate)?.name || 'Document',
      FIRM_NAME: firm?.name || '',
      FIRM_FCA_NUMBER: firm?.fcaNumber || '',
      FIRM_ADDRESS: formatFirmAddress(firm?.address)
    }
  }

  const handleGenerateFromTemplate = async () => {
    if (!selectedClient || !selectedTemplate) {
      setCreateError('Select a client and template first')
      return
    }

    const client = clients.find(c => c.id === selectedClient)
    const variables = buildTemplateVariables(client)

    setGeneratingTemplate(true)
    setCreateError(null)

    try {
      const previewRes = await fetch('/api/documents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          variables
        })
      })

      if (!previewRes.ok) {
        throw new Error('Failed to preview template')
      }

      const previewPayload = await previewRes.json()
      const previewContent = previewPayload?.preview?.content
      const previewTitle = previewPayload?.preview?.title || 'Generated Document'

      if (!previewContent) {
        throw new Error('Template preview is empty')
      }

      const generateRes = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: previewContent,
          title: previewTitle,
          clientId: selectedClient,
          templateId: selectedTemplate,
          metadata: {
            category: 'Client Documents',
            document_type: 'template_document',
            type: 'template_document',
            templateId: selectedTemplate
          }
        })
      })

      if (!generateRes.ok) {
        throw new Error('Failed to generate document from template')
      }

      const generated = await generateRes.json()
      const generatedId = generated?.document?.id
      if (!generatedId) {
        throw new Error('Generated document missing id')
      }

      await loadClientDocuments()
      setSelectedDocumentIds((prev) => (prev.includes(generatedId) ? prev : [...prev, generatedId]))
      setPreviewDocumentId(generatedId)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to generate document')
    } finally {
      setGeneratingTemplate(false)
    }
  }

  const handleCreateSignatureRequest = async () => {
    if (!selectedClient || !signerEmail || !signerName) {
      setCreateError('Please fill in all required fields')
      return
    }

    if (selectedDocumentIds.length === 0) {
      setCreateError('Please select at least one document to sign')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const results = await Promise.allSettled(
        selectedDocumentIds.map((documentId) =>
          fetch('/api/signatures/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: selectedClient,
              documentId,
              templateId: selectedTemplate || undefined,
              signers: [{
                email: signerEmail,
                name: signerName,
                role: 'Client'
              }],
              options: {
                expiryDays: 30,
                autoReminder: true,
                remindOnceInEvery: 3
              }
            })
          }).then(async (response) => {
            const payload = await response.json().catch(() => ({}))
            if (!response.ok || !payload?.success) {
              throw new Error(payload?.error || 'Failed to create signature request')
            }
            return payload
          })
        )
      )

      const failed = results.filter((result) => result.status === 'rejected')
      if (failed.length > 0) {
        setCreateError(`Failed to create ${failed.length} signature request(s).`)
        return
      }

      setShowCreateModal(false)
      setSelectedClient('')
      setSelectedTemplate('')
      setSelectedDocumentIds([])
      setSignerEmail('')
      setSignerName('')
      window.location.reload()
    } catch (err) {
      setCreateError('Failed to create signature request')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds((prev) => (
      prev.includes(documentId) ? prev.filter((id) => id !== documentId) : [...prev, documentId]
    ))
  }

  const getClientDisplayName = (client: Client) => {
    const pd = client.personal_details
    const title = pd?.title ? `${pd.title} ` : ''
    return `${title}${pd?.firstName || ''} ${pd?.lastName || ''}`.trim() || client.client_ref
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />
      case 'sent':
        return <MailIcon className="h-4 w-4 text-blue-500" />
      case 'viewed':
        return <EyeIcon className="h-4 w-4 text-purple-500" />
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'expired':
        return <XCircleIcon className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4 text-gray-500" />
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'viewed':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredRequests = signatureRequests.filter((request: any) => {
    const matchesSearch = (request.recipient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (request.recipient_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (request.document?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const statusCounts = signatureRequests.reduce((acc: Record<string, number>, request: any) => {
    acc[request.status] = (acc[request.status] || 0) + 1
    return acc
  }, {})

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Digital Signatures</h1>
          </div>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Digital Signatures</h1>
            <p className="text-gray-600 mt-1">Manage signature requests and track document signing status</p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Signature Request
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <PenToolIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{signatureRequests.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts['pending'] || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts['completed'] || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts['expired'] || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by recipient name, email, or document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button variant="outline">
                <FilterIcon className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Signature Requests List */}
        <div className="space-y-4">
          {error && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center">
                <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700">{String(error)}</p>
              </div>
            </Card>
          )}

          {filteredRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <PenToolIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No signature requests found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No requests match your current filters.'
                  : 'Get started by creating your first signature request.'
                }
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Signature Request
              </Button>
            </Card>
          ) : (
            filteredRequests.map((request: any) => (
              <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(request.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {request.document?.title || 'Unknown Document'}
                        </h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>To: {request.recipient_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{request.recipient_email || 'No email'}</span>
                        <span>•</span>
                        <span>Created: {formatDate(request.created_at)}</span>
                      </div>
                      {request.expires_at && (
                        <div className="text-sm text-gray-500 mt-1">
                          Expires: {formatDate(request.expires_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {request.status === 'pending' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Send Reminder
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Status Timeline */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center space-x-6 text-xs text-gray-500">
                    {request.sent_at && (
                      <div className="flex items-center">
                        <MailIcon className="h-3 w-3 mr-1" />
                        <span>Sent: {formatDate(request.sent_at)}</span>
                      </div>
                    )}
                    {request.viewed_at && (
                      <div className="flex items-center">
                        <EyeIcon className="h-3 w-3 mr-1" />
                        <span>Viewed: {formatDate(request.viewed_at)}</span>
                      </div>
                    )}
                    {request.completed_at && (
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        <span>Completed: {formatDate(request.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Signature Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Signature Request
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateError(null)
                  setSelectedDocumentIds([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700">{createError}</p>
                </div>
              )}

              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Client *
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {getClientDisplayName(client)} ({client.client_ref})
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Template (Optional)
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select template (optional)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {selectedTemplate && selectedClient && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateFromTemplate}
                      disabled={generatingTemplate}
                    >
                      {generatingTemplate ? 'Generating...' : 'Generate & Preview'}
                    </Button>
                    <span className="text-xs text-gray-500">
                      Creates a document from the selected template.
                    </span>
                  </div>
                )}
              </div>

              {/* Document Picker */}
              {selectedClient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documents to Sign *
                  </label>
                  {clientDocuments.length === 0 ? (
                    <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-md p-3">
                      No documents found for this client.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                      <div className="border border-gray-200 rounded-md p-2 max-h-56 overflow-y-auto space-y-4">
                        {groupedDocuments.map(([groupLabel, docs]) => (
                          <div key={groupLabel}>
                            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <span>{groupLabel}</span>
                              <span>{docs.length}</span>
                            </div>
                            <div className="space-y-2">
                              {docs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedDocumentIds.includes(doc.id)}
                                    onChange={() => toggleDocumentSelection(doc.id)}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="font-medium text-gray-900 truncate">
                                          {doc.name || doc.file_name || 'Document'}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {doc.document_type || doc.type || doc.category || 'Document'} • {doc.status || 'draft'}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDocumentId(doc.id)}
                                        className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                                      >
                                        Preview
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border border-gray-200 rounded-md bg-gray-50 flex flex-col overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-200 bg-white">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Preview</div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {previewDocument ? (previewDocument.name || previewDocument.file_name || 'Document') : 'Select a document'}
                          </div>
                        </div>
                        <div className="flex-1 min-h-[180px]">
                          {previewUrl ? (
                            <iframe
                              src={previewUrl}
                              title="Document preview"
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-gray-500">
                              Choose a document to preview it here.
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2 border-t border-gray-200 bg-white flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewDocumentId && window.open(`/api/documents/preview/${previewDocumentId}`, '_blank')}
                            disabled={!previewDocumentId}
                          >
                            Open Full Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewDocumentId && window.open(`/api/documents/download/${previewDocumentId}`, '_blank')}
                            disabled={!previewDocumentId}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    One email will be sent per selected document.
                  </p>
                </div>
              )}

              {/* Signer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Name *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Full name of the signer"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Signer Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Email *
                </label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
                <p className="flex items-center">
                  <FileTextIcon className="h-4 w-4 mr-2" />
                  The signer will receive an email with a link to sign the document.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateError(null)
                  setSelectedDocumentIds([])
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateSignatureRequest}
                disabled={isCreating || !selectedClient || !signerEmail || !signerName || selectedDocumentIds.length === 0}
              >
                {isCreating ? (
                  <>
                    <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PenToolIcon className="h-4 w-4 mr-2" />
                    Create Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  )
}
