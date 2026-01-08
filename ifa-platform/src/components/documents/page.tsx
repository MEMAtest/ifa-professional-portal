// app/documents/page.tsx
// ENHANCED: Full upload functionality with client tagging and proper error handling

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDocuments, useDocumentCategories } from '@/lib/hooks/useDocuments'
import { createClient } from '@/lib/supabase/client'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  UploadIcon,
  FileTextIcon,
  SearchIcon,
  FilterIcon,
  MoreVerticalIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  UserIcon,
  CalendarIcon,
  FolderIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  TrendingUp,
  PieChart,
  FileImage,
  FileSpreadsheet,
  FileType,
  Shield,
  Clock
} from 'lucide-react'

// Professional Document Type Icons
const PdfIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="4" width="36" height="40" rx="4" fill="#FEF2F2"/>
    <rect x="6" y="4" width="36" height="40" rx="4" stroke="#EF4444" strokeWidth="2"/>
    <path d="M6 12h36" stroke="#EF4444" strokeWidth="2"/>
    <rect x="10" y="6" width="3" height="3" rx="1" fill="#EF4444"/>
    <rect x="15" y="6" width="3" height="3" rx="1" fill="#FCA5A5"/>
    <rect x="20" y="6" width="3" height="3" rx="1" fill="#FECACA"/>
    <text x="24" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#DC2626">PDF</text>
    <path d="M14 36h20M14 40h12" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const DocIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="4" width="36" height="40" rx="4" fill="#EFF6FF"/>
    <rect x="6" y="4" width="36" height="40" rx="4" stroke="#3B82F6" strokeWidth="2"/>
    <path d="M6 12h36" stroke="#3B82F6" strokeWidth="2"/>
    <rect x="10" y="6" width="3" height="3" rx="1" fill="#3B82F6"/>
    <rect x="15" y="6" width="3" height="3" rx="1" fill="#93C5FD"/>
    <rect x="20" y="6" width="3" height="3" rx="1" fill="#BFDBFE"/>
    <text x="24" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#2563EB">DOC</text>
    <path d="M14 36h20M14 40h16" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const ImageIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="4" width="36" height="40" rx="4" fill="#ECFDF5"/>
    <rect x="6" y="4" width="36" height="40" rx="4" stroke="#10B981" strokeWidth="2"/>
    <circle cx="16" cy="18" r="4" fill="#10B981"/>
    <path d="M6 36l10-12 8 8 12-16v28H6z" fill="#10B981" fillOpacity="0.3"/>
    <path d="M6 36l10-12 8 8 12-16" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ComplianceIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="4" width="36" height="40" rx="4" fill="#FEF9C3"/>
    <rect x="6" y="4" width="36" height="40" rx="4" stroke="#EAB308" strokeWidth="2"/>
    <path d="M24 10l12 6v12c0 8-12 12-12 12s-12-4-12-12V16l12-6z" fill="#EAB308" fillOpacity="0.2"/>
    <path d="M24 10l12 6v12c0 8-12 12-12 12s-12-4-12-12V16l12-6z" stroke="#EAB308" strokeWidth="2"/>
    <path d="M18 24l4 4 8-8" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SpreadsheetIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="4" width="36" height="40" rx="4" fill="#F0FDF4"/>
    <rect x="6" y="4" width="36" height="40" rx="4" stroke="#22C55E" strokeWidth="2"/>
    <path d="M6 12h36M6 20h36M6 28h36M6 36h36" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.5"/>
    <path d="M18 4v40M30 4v40" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.5"/>
    <rect x="8" y="6" width="8" height="4" rx="1" fill="#22C55E"/>
  </svg>
)

const ContractIcon = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="4" width="36" height="40" rx="4" fill="#F5F3FF"/>
    <rect x="6" y="4" width="36" height="40" rx="4" stroke="#8B5CF6" strokeWidth="2"/>
    <path d="M14 14h20M14 20h20M14 26h14" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 36c4-2 8 2 12 0s8 2 12 0" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="36" cy="36" r="6" fill="#8B5CF6"/>
    <path d="M33 36l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Progress Ring Component
const ProgressRing = ({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  )
}

// Sparkline Component
const Sparkline = ({ data, color = "#3B82F6" }: { data: number[]; color?: string }) => {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: 100 - (val / max) * 80
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L 100 100 L 0 100 Z`

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#gradient-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} className="opacity-0 hover:opacity-100 transition-opacity" />
      ))}
    </svg>
  )
}

interface Client {
  id: string
  client_ref?: string
  personal_details?: {
    title?: string
    firstName?: string
    first_name?: string
    lastName?: string
    last_name?: string
  }
}

interface UploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (uploadData: any) => Promise<void>
  categories: any[]
  categoriesLoading?: boolean
}

function UploadDialog({ isOpen, onClose, onUpload, categories, categoriesLoading }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  // Fetch clients on search with AbortController to prevent race conditions
  const searchClients = useCallback(async (query: string, signal?: AbortSignal) => {
    if (!query || query.length < 2) {
      setClients([])
      return
    }

    setClientsLoading(true)
    try {
      const response = await fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=10`, { signal })
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      // Ignore abort errors
      if ((error as Error).name === 'AbortError') return
      console.error('Error searching clients:', error)
    } finally {
      setClientsLoading(false)
    }
  }, [])

  // Debounced client search with abort controller
  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      if (clientSearch && !selectedClient) {
        searchClients(clientSearch, controller.signal)
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [clientSearch, selectedClient, searchClients])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getClientDisplayName = (client: Client): string => {
    const pd = client.personal_details || {}
    const title = pd.title ? `${pd.title} ` : ''
    const firstName = pd.firstName || pd.first_name || ''
    const lastName = pd.lastName || pd.last_name || ''
    return `${title}${firstName} ${lastName}`.trim() || client.client_ref || 'Unknown'
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(getClientDisplayName(client))
    setShowClientDropdown(false)
    setClients([])
  }

  const clearSelectedClient = () => {
    setSelectedClient(null)
    setClientSearch('')
    setClients([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    try {
      await onUpload({
        file,
        title,
        description,
        clientId: selectedClient?.id || undefined,
        clientName: selectedClient ? getClientDisplayName(selectedClient) : undefined,
        categoryId: categoryId || undefined,
        tags
      })

      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setClientSearch('')
      setSelectedClient(null)
      setClients([])
      setCategoryId('')
      setTags([])
      setNewTag('')
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileTextIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div>
                  <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX, TXT, PNG, JPG (max 50MB)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Client Name - Searchable */}
          <div ref={clientSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name
            </label>
            <div className="relative">
              <Input
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  if (selectedClient) {
                    setSelectedClient(null)
                  }
                  setShowClientDropdown(true)
                }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Search for a client..."
                className={selectedClient ? 'pr-8 bg-blue-50 border-blue-300' : ''}
              />
              {selectedClient && (
                <button
                  type="button"
                  onClick={clearSelectedClient}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Client Search Dropdown */}
            {showClientDropdown && !selectedClient && (clientSearch.length >= 2 || clients.length > 0) && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {clientsLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                ) : clients.length > 0 ? (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <div className="font-medium text-gray-900">
                        {getClientDisplayName(client)}
                      </div>
                      {client.client_ref && (
                        <div className="text-xs text-gray-500">
                          Ref: {client.client_ref}
                        </div>
                      )}
                    </button>
                  ))
                ) : clientSearch.length >= 2 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No clients found</div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">Type at least 2 characters to search</div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              {selectedClient
                ? `Linked to client: ${getClientDisplayName(selectedClient)}`
                : 'Search and select a client to link this document'
              }
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={categoriesLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {categoriesLoading ? (
                <option value="">Loading categories...</option>
              ) : categories.length === 0 ? (
                <option value="">No categories available</option>
              ) : (
                <>
                  <option value="">Select category (optional)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {!categoriesLoading && categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No document categories found. Contact your administrator to add categories.
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} className="bg-blue-100 text-blue-800 flex items-center">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !title || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  const { documents, loading, error, uploadDocument, deleteDocument } = useDocuments()
  const { categories, loading: categoriesLoading } = useDocumentCategories()

  const filteredDocuments = documents.filter((doc: any) => {
    const title = (doc.title ?? doc.name ?? '') as string
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.client_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !categoryFilter || doc.category_id === categoryFilter
    const matchesStatus = !statusFilter || doc.status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleUpload = async (uploadData: any) => {
    await uploadDocument(uploadData)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          </div>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">Manage your client documents and files</p>
          </div>
          <Button 
            onClick={() => setShowUploadDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Total Documents</p>
                <p className="text-xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Reviewed</p>
                <p className="text-xl font-bold text-gray-900">
                  {documents.filter((d: any) => d.status === 'reviewed').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-900">
                  {documents.filter((d: any) => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-100">
                <UserIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500">Clients</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Set(documents.map((d: any) => d.client_name).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Status Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-900">Status Overview</h3>
              <PieChart className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <ProgressRing
                  value={documents.filter((d: any) => d.status === 'reviewed').length}
                  max={documents.length || 1}
                  color="#22C55E"
                  size={70}
                />
                <p className="text-xs text-gray-500 mt-2">Reviewed</p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={documents.filter((d: any) => d.status === 'pending').length}
                  max={documents.length || 1}
                  color="#F59E0B"
                  size={70}
                />
                <p className="text-xs text-gray-500 mt-2">Pending</p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={documents.filter((d: any) => d.status === 'active').length}
                  max={documents.length || 1}
                  color="#3B82F6"
                  size={70}
                />
                <p className="text-xs text-gray-500 mt-2">Active</p>
              </div>
            </div>
          </Card>

          {/* Upload Activity Trend */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Upload Activity</h3>
                <p className="text-xs text-gray-500">Last 6 months</p>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <Sparkline
              color="#3B82F6"
              data={(() => {
                const now = new Date()
                const monthlyData = []
                for (let i = 5; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                  const count = documents.filter((doc: any) => {
                    const docDate = new Date(doc.created_at)
                    return docDate.getMonth() === d.getMonth() && docDate.getFullYear() === d.getFullYear()
                  }).length
                  monthlyData.push(count)
                }
                return monthlyData
              })()}
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              {(() => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const now = new Date()
                return [5, 3, 0].map(i => {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                  return <span key={i}>{months[d.getMonth()]}</span>
                })
              })()}
            </div>
          </Card>

          {/* Document Type Gallery */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Document Types</h3>
              <FolderIcon className="h-4 w-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button className="flex flex-col items-center p-3 rounded-xl hover:bg-red-50 transition-all group">
                <PdfIcon className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700 mt-1">PDF</span>
                <span className="text-sm font-bold text-red-600">
                  {documents.filter((d: any) => (d.file_type || '').includes('pdf')).length}
                </span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-xl hover:bg-blue-50 transition-all group">
                <DocIcon className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700 mt-1">Word</span>
                <span className="text-sm font-bold text-blue-600">
                  {documents.filter((d: any) => (d.file_type || '').includes('word') || (d.file_type || '').includes('doc')).length}
                </span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-xl hover:bg-green-50 transition-all group">
                <ImageIcon className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700 mt-1">Images</span>
                <span className="text-sm font-bold text-green-600">
                  {documents.filter((d: any) => (d.file_type || '').includes('image')).length}
                </span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-xl hover:bg-yellow-50 transition-all group">
                <ComplianceIcon className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700 mt-1">Compliance</span>
                <span className="text-sm font-bold text-yellow-600">
                  {documents.filter((d: any) => (d.category?.name || '').toLowerCase().includes('compliance')).length}
                </span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-xl hover:bg-emerald-50 transition-all group">
                <SpreadsheetIcon className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700 mt-1">Sheets</span>
                <span className="text-sm font-bold text-emerald-600">
                  {documents.filter((d: any) => (d.file_type || '').includes('sheet') || (d.file_type || '').includes('excel')).length}
                </span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-xl hover:bg-purple-50 transition-all group">
                <ContractIcon className="h-10 w-10 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700 mt-1">Contracts</span>
                <span className="text-sm font-bold text-purple-600">
                  {documents.filter((d: any) => (d.category?.name || '').toLowerCase().includes('contract')).length}
                </span>
              </button>
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
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="">All Categories</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <p className="text-red-700">{error?.message || 'An error occurred'}</p>
          </Card>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card className="p-8 text-center">
              <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || categoryFilter || statusFilter 
                  ? 'No documents match your current filters.'
                  : 'Get started by uploading your first document.'
                }
              </p>
              <Button 
                onClick={() => setShowUploadDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </Card>
          ) : (
            filteredDocuments.map((document: any) => (
              <Card key={document.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileTextIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {document.title}
                        </h3>
                        <Badge className={getStatusColor(document.status)}>
                          {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                        </Badge>
                        {document.category && (
                          <Badge className="bg-gray-100 text-gray-800">
                            {document.category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        {document.client_name && (
                          <>
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 mr-1" />
                              <span>{document.client_name}</span>
                            </div>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatDate(document.created_at)}</span>
                        {document.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(document.file_size)}</span>
                          </>
                        )}
                      </div>
                      {document.description && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {document.description}
                        </p>
                      )}
                      {document.tags && document.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <TagIcon className="h-3 w-3 text-gray-400" />
                          {document.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} className="bg-gray-100 text-gray-600 text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {document.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{document.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Upload Dialog */}
        <UploadDialog
          isOpen={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onUpload={handleUpload}
          categories={categories}
          categoriesLoading={categoriesLoading}
        />
      </div>
    </Layout>
  )
}
