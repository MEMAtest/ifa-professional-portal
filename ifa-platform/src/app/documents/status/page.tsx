// File: src/app/documents/status/page.tsx
// Complete Document Status Tracking Page

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Send, 
  Eye,
  RefreshCw,
  AlertCircle,
  Download,
  Search,
  Filter,
  Mail
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import clientLogger from '@/lib/logging/clientLogger'

interface DocumentStatus {
  id: string
  document_name: string
  client_name: string
  client_email: string
  template_name: string
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired'
  sent_at?: string
  viewed_at?: string
  signed_at?: string
  docuseal_submission_id?: string
  created_at: string
}

export default function DocumentStatusPage() {
  const [documents, setDocuments] = useState<DocumentStatus[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')

  // Supabase client with proper initialization pattern
  const supabase = useMemo<SupabaseClient | null>(() => {
    try {
      return createClient()
    } catch (error) {
      clientLogger.error("CRITICAL: Supabase client initialization failed. Check environment variables.", error)
      return null
    }
  }, [])

  const loadDocumentStatuses = useCallback(async () => {
    if (!supabase) {
      clientLogger.error("Action failed: Supabase client is not available in loadDocumentStatuses.")
      setDocuments([])
      setLoading(false)
      return
    }

    setLoading(true)
    
    try {
      // Try to load from generated_documents table first
      // Note: document_templates join removed due to missing FK relationship
      const { data: generatedDocs, error } = await supabase
        .from('generated_documents')
        .select(`
          *,
          clients (
            personal_details,
            contact_info
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && generatedDocs) {
        const formattedDocs: DocumentStatus[] = generatedDocs.map(doc => ({
          id: doc.id,
          document_name: doc.title || 'Untitled Document',
          client_name: doc.clients ?
            `${doc.clients.personal_details?.firstName || ''} ${doc.clients.personal_details?.lastName || ''}`.trim() :
            'Unknown Client',
          client_email: doc.clients?.contact_info?.email || 'No email',
          template_name: doc.file_name || 'Generated Document',
          status: doc.status || 'sent',
          sent_at: doc.created_at,
          created_at: doc.created_at
        }))
        
        setDocuments(formattedDocs)
      } else {
        setDocuments([])
      }
    } catch (err) {
      clientLogger.error('Error loading documents:', err)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const filterDocuments = useCallback(() => {
    let filtered = [...documents]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc => 
        doc.client_name.toLowerCase().includes(query) ||
        doc.client_email.toLowerCase().includes(query) ||
        doc.document_name.toLowerCase().includes(query) ||
        doc.template_name.toLowerCase().includes(query)
      )
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      
      switch (dateFilter) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoff.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(doc => new Date(doc.created_at) >= cutoff)
    }

    setFilteredDocuments(filtered)
  }, [documents, statusFilter, searchQuery, dateFilter])

  useEffect(() => {
    loadDocumentStatuses()
  }, [loadDocumentStatuses])

  useEffect(() => {
    filterDocuments()
  }, [filterDocuments])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />
      case 'sent':
        return <Send className="h-4 w-4" />
      case 'viewed':
        return <Eye className="h-4 w-4" />
      case 'signed':
        return <CheckCircle className="h-4 w-4" />
      case 'expired':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'viewed':
        return 'bg-yellow-100 text-yellow-800'
      case 'signed':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const resendDocument = async (doc: DocumentStatus) => {
    // Implement resend logic
    alert(`Resending ${doc.document_name} to ${doc.client_email}`)
  }

  const downloadDocument = async (doc: DocumentStatus) => {
    // Implement download logic
    alert(`Downloading ${doc.document_name}`)
  }

  // Calculate statistics
  const stats = {
    total: documents.length,
    signed: documents.filter(d => d.status === 'signed').length,
    pending: documents.filter(d => ['sent', 'viewed'].includes(d.status)).length,
    expired: documents.filter(d => d.status === 'expired').length,
    signatureRate: documents.length > 0 
      ? Math.round((documents.filter(d => d.status === 'signed').length / documents.length) * 100)
      : 0
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Document Status Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all your documents in one place</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Signed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Signature Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.signatureRate}%</p>
                </div>
                <Send className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {/* Search */}
              <div className="w-full sm:flex-1 sm:min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by client, email, or document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              <Button
                variant="outline"
                onClick={loadDocumentStatuses}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length > 0 ? (
              <div className="space-y-3 sm:hidden">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{doc.document_name}</p>
                        <p className="text-xs text-gray-500">{doc.template_name}</p>
                      </div>
                      <div className="flex gap-2">
                        {doc.status !== 'signed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resendDocument(doc)}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      <p>{doc.client_name}</p>
                      <p>{doc.client_email}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge className={`${getStatusColor(doc.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(doc.status)}
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Badge>
                      <span className="text-gray-500">
                        {doc.sent_at ? new Date(doc.sent_at).toLocaleDateString() : 'Not sent'}
                      </span>
                      {doc.signed_at && (
                        <span className="text-green-600">
                          Signed: {new Date(doc.signed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 sm:hidden">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No documents found matching your criteria</p>
              </div>
            )}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Document</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Sent</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{doc.document_name}</p>
                          <p className="text-sm text-gray-500">{doc.template_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p>{doc.client_name}</p>
                          <p className="text-sm text-gray-500">{doc.client_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getStatusColor(doc.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">
                          {doc.sent_at ? new Date(doc.sent_at).toLocaleDateString() : 'Not sent'}
                        </p>
                        {doc.signed_at && (
                          <p className="text-xs text-green-600">
                            Signed: {new Date(doc.signed_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {doc.status !== 'signed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resendDocument(doc)}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No documents found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
