// app/signatures/page.tsx
// MISSING FILE: Creates the signatures route to fix 404 error

'use client'

import { useState } from 'react'
import { useSignatureRequests } from '@/hooks/useDocuments'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  PenToolIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  MailIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon
} from 'lucide-react'

interface SignatureRequest {
  id: string
  document_id: string
  recipient_email: string
  recipient_name: string
  status: 'pending' | 'sent' | 'viewed' | 'completed' | 'expired' | 'cancelled'
  sent_at?: string
  viewed_at?: string
  completed_at?: string
  expires_at?: string
  created_at: string
  metadata: Record<string, any>
  document?: {
    title: string
    file_name: string
  }
}

export default function SignaturesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDocument, setSelectedDocument] = useState<string>('')
  
  // This would typically load all signature requests for the firm
  const { signatureRequests, loading, error, createSignatureRequest } = useSignatureRequests()

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

  const filteredRequests = signatureRequests.filter((request: SignatureRequest) => {
    const matchesSearch = request.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (request.document?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const statusCounts = signatureRequests.reduce((acc: Record<string, number>, request: SignatureRequest) => {
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
          <Button className="bg-blue-600 hover:bg-blue-700">
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
                <p className="text-2xl font-bold text-gray-900">{statusCounts.pending || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900">{statusCounts.completed || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900">{statusCounts.expired || 0}</p>
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
                <p className="text-red-700">{error}</p>
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
              <Button className="bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Signature Request
              </Button>
            </Card>
          ) : (
            filteredRequests.map((request: SignatureRequest) => (
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
                        <span>To: {request.recipient_name}</span>
                        <span>•</span>
                        <span>{request.recipient_email}</span>
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
    </Layout>
  )
}