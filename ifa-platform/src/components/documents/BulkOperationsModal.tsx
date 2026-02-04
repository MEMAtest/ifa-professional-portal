// ===================================================================
// File: src/components/documents/BulkOperationsModal.tsx
// Advanced Bulk Operations Modal with Progress Tracking
// Handles complex multi-document operations
// ===================================================================

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Mail,
  Download,
  Archive,
  Trash2,
  Send,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Users,
  Clock,
  Zap
} from 'lucide-react'

// Simple Modal Component (since Dialog might not be available in your UI kit)
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: string
}

function Modal({ isOpen, onClose, title, description, children, maxWidth = "max-w-2xl" }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-lg ${maxWidth} max-h-[90vh] overflow-y-auto mx-4 w-full`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  )
}

// ===================================================================
// TYPES
// ===================================================================

interface BulkOperationsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDocuments: Array<{
    id: string
    name: string
    client_name: string
    type: string
    requires_signature: boolean
  }>
  onComplete?: () => void
}

interface BulkOperation {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  action: string
  requiresInput?: boolean
  dangerous?: boolean
  color: string
}

interface BulkOperationResult {
  jobId: string
  totalDocuments: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  results?: {
    successful: Array<{
      documentId: string
      documentName: string
      result: any
    }>
    failed: Array<{
      documentId: string
      documentName: string
      error: string
    }>
  }
  downloadUrl?: string
}

interface OperationProgress {
  current: number
  total: number
  percentage: number
  status: string
  estimatedTimeRemaining?: number
}

// ===================================================================
// BULK OPERATIONS CONFIGURATION
// ===================================================================

const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'send',
    name: 'Send for Signature',
    description: 'Send selected documents to clients for electronic signature',
    icon: <Send className="h-4 w-4" />,
    action: 'send',
    requiresInput: true,
    color: 'blue'
  },
  {
    id: 'resend',
    name: 'Resend Documents',
    description: 'Resend documents that were previously sent but not signed',
    icon: <RefreshCw className="h-4 w-4" />,
    action: 'resend',
    requiresInput: true,
    color: 'yellow'
  },
  {
    id: 'download',
    name: 'Bulk Download',
    description: 'Download all selected documents as a ZIP file',
    icon: <Download className="h-4 w-4" />,
    action: 'download',
    color: 'green'
  },
  {
    id: 'archive',
    name: 'Archive Documents',
    description: 'Move selected documents to archive (can be restored later)',
    icon: <Archive className="h-4 w-4" />,
    action: 'archive',
    requiresInput: true,
    color: 'gray'
  },
  {
    id: 'delete',
    name: 'Delete Documents',
    description: 'Permanently delete selected documents (cannot be undone)',
    icon: <Trash2 className="h-4 w-4" />,
    action: 'delete',
    dangerous: true,
    color: 'red'
  }
]

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function BulkOperationsModal({
  isOpen,
  onClose,
  selectedDocuments,
  onComplete
}: BulkOperationsModalProps) {
  const { toast } = useToast()
  
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<OperationProgress | null>(null)
  const [result, setResult] = useState<BulkOperationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Form inputs for operations that require them
  const [recipients, setRecipients] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [archiveReason, setArchiveReason] = useState<string>('')
  
  // ===================================================================
  // RESET STATE WHEN MODAL OPENS/CLOSES
  // ===================================================================
  
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedOperation(null)
      setProcessing(false)
      setProgress(null)
      setResult(null)
      setError(null)
      setRecipients('')
      setSubject('')
      setMessage('')
      setArchiveReason('')
    }
  }, [isOpen])

  // ===================================================================
  // OPERATION EXECUTION
  // ===================================================================
  
  const executeOperation = async () => {
    if (!selectedOperation) return

    setProcessing(true)
    setError(null)
    setProgress({
      current: 0,
      total: selectedDocuments.length,
      percentage: 0,
      status: 'Starting...'
    })

    try {
      // Prepare action parameters based on operation type
      let actionParams: any = {}
      
      if (selectedOperation.id === 'send' || selectedOperation.id === 'resend') {
        // Validate required inputs
        if (!recipients.trim()) {
          throw new Error('Recipients are required')
        }
        
        const recipientList = recipients.split(',').map(r => r.trim()).filter(Boolean)
        actionParams = {
          recipients: recipientList,
          subject: subject.trim() || `Please sign: Documents from ${new Date().toLocaleDateString()}`,
          message: message.trim() || 'Please review and sign the attached documents.',
          includeAttachments: true
        }
      } else if (selectedOperation.id === 'archive') {
        actionParams = {
          archiveReason: archiveReason.trim() || 'Bulk archive operation'
        }
      }

      // Execute the bulk operation
      const response = await fetch('/api/documents/bulk/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: selectedDocuments.map(doc => doc.id),
          action: selectedOperation.action,
          actionParams
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Operation failed: ${response.statusText}`)
      }

      const operationResult: BulkOperationResult = await response.json()
      
      // Update progress to completion
      setProgress({
        current: selectedDocuments.length,
        total: selectedDocuments.length,
        percentage: 100,
        status: 'Completed'
      })
      
      setResult(operationResult)
      
      // Show success toast
      const successCount = operationResult.results?.successful.length || 0
      const failedCount = operationResult.results?.failed.length || 0
      
      toast({
        title: 'Bulk Operation Complete',
        description: `${successCount} documents processed successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        variant: failedCount > 0 ? 'destructive' : 'default'
      })

    } catch (err) {
      clientLogger.error('Bulk operation error:', err)
      setError(err instanceof Error ? err.message : 'Operation failed')
      toast({
        title: 'Operation Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  // ===================================================================
  // FORM VALIDATION
  // ===================================================================
  
  const canExecute = () => {
    if (!selectedOperation || processing) return false
    
    if (selectedOperation.requiresInput) {
      if (selectedOperation.id === 'send' || selectedOperation.id === 'resend') {
        return recipients.trim().length > 0
      }
      if (selectedOperation.id === 'archive') {
        return true // Archive reason is optional
      }
    }
    
    return true
  }

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================
  
  const getOperationColor = (operation: BulkOperation) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500',
      red: 'bg-red-500'
    }
    return colors[operation.color as keyof typeof colors] || 'bg-gray-500'
  }

  const handleClose = () => {
    if (processing) {
      toast({
        title: 'Operation in Progress',
        description: 'Please wait for the operation to complete before closing',
        variant: 'destructive'
      })
      return
    }
    
    if (result && onComplete) {
      onComplete()
    }
    
    onClose()
  }

  const handleDownload = () => {
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, '_blank')
    }
  }

  // ===================================================================
  // RENDER
  // ===================================================================
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Bulk Operations"
      description={`Perform actions on ${selectedDocuments.length} selected document${selectedDocuments.length !== 1 ? 's' : ''}`}
    >
      <div className="space-y-6">
        
        {/* Selected Documents Summary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Selected Documents ({selectedDocuments.length})
          </h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedDocuments.map(doc => (
              <div key={doc.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{doc.name}</span>
                <span className="text-muted-foreground ml-2">{doc.client_name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operation Selection */}
        {!selectedOperation && !processing && !result && (
          <div className="space-y-3">
            <h3 className="font-medium">Choose Operation</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {BULK_OPERATIONS.map(operation => (
                <button
                  key={operation.id}
                  onClick={() => setSelectedOperation(operation)}
                  className={`p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors ${
                    operation.dangerous ? 'border-red-200 hover:border-red-300' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded ${getOperationColor(operation)} text-white`}>
                      {operation.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{operation.name}</h4>
                      {operation.dangerous && (
                        <Badge variant="destructive" className="text-xs">
                          Dangerous
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {operation.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Operation Configuration */}
        {selectedOperation && !processing && !result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded ${getOperationColor(selectedOperation)} text-white`}>
                {selectedOperation.icon}
              </div>
              <div>
                <h3 className="font-medium">{selectedOperation.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedOperation.description}
                </p>
              </div>
            </div>

            {/* Configuration Forms */}
            {(selectedOperation.id === 'send' || selectedOperation.id === 'resend') && (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <Label htmlFor="recipients">Recipients *</Label>
                  <Input
                    id="recipients"
                    placeholder="client1@example.com, client2@example.com"
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate multiple email addresses with commas
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Please sign: Documents"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Please review and sign the attached documents..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {selectedOperation.id === 'archive' && (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <Label htmlFor="archiveReason">Archive Reason (Optional)</Label>
                  <Textarea
                    id="archiveReason"
                    placeholder="Reason for archiving these documents..."
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {selectedOperation.dangerous && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action cannot be undone. Please make sure you want to proceed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Processing Progress */}
        {processing && progress && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <div>
                <h3 className="font-medium">Processing {selectedOperation?.name}</h3>
                <p className="text-sm text-muted-foreground">{progress.status}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.current} of {progress.total}</span>
              </div>
              <Progress value={progress.percentage} />
              <p className="text-xs text-muted-foreground">
                {progress.percentage.toFixed(0)}% complete
              </p>
            </div>
          </div>
        )}

        {/* Operation Results */}
        {result && !processing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <h3 className="font-medium">Operation Complete</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedOperation?.name} finished processing
                </p>
              </div>
            </div>

            {/* Results Summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Successful</span>
                </div>
                <p className="text-2xl font-bold">
                  {result.results?.successful.length || 0}
                </p>
              </div>
              
              {(result.results?.failed.length || 0) > 0 && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <X className="h-4 w-4" />
                    <span className="font-medium">Failed</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {result.results?.failed.length || 0}
                  </p>
                </div>
              )}
            </div>

            {/* Download Link */}
            {result.downloadUrl && (
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download ZIP File
              </Button>
            )}

            {/* Failed Items Details */}
            {(result.results?.failed.length || 0) > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-red-600 mb-2">Failed Items</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {result.results?.failed.map((item, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{item.documentName}</span>
                      <p className="text-red-600 text-xs">{item.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          {!selectedOperation && (
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
          )}
          
          {selectedOperation && !processing && !result && (
            <>
              <Button
                variant="outline"
                onClick={() => setSelectedOperation(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={executeOperation}
                disabled={!canExecute()}
                className="flex-1"
                variant={selectedOperation.dangerous ? 'destructive' : 'default'}
              >
                {selectedOperation.dangerous ? 'Confirm & Execute' : 'Execute'}
              </Button>
            </>
          )}
          
          {(processing || result) && (
            <Button
              onClick={handleClose}
              className="flex-1"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Close'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}