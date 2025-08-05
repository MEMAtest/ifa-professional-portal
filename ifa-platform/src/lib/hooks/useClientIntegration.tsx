// ===================================================================
// useClientIntegration - React Hook for Easy Integration - COMPLETE FIX
// File: src/lib/hooks/useClientIntegration.tsx
// Make sure to replace your ENTIRE file with this version
// ===================================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { integratedClientService } from '@/services/integratedClientService'
import { realDocumentService, autoSaveService } from '@/services/realIntegratedServices'
import type { ClientDashboardData, ExtendedClientProfile, IntegrationResult } from '@/services/integratedClientService'

// ===================================================================
// HOOK INTERFACE
// ===================================================================

interface UseClientIntegrationOptions {
  clientId?: string
  autoSave?: boolean
  refreshInterval?: number // in milliseconds
}

interface UseClientIntegrationReturn {
  // Data
  client: ExtendedClientProfile | null
  dashboardData: ClientDashboardData | null
  isLoading: boolean
  error: string | null
  
  // Actions
  updateClient: (data: any) => Promise<IntegrationResult>
  completeAssessment: (assessmentData: any) => Promise<IntegrationResult>
  generateDocument: (templateType: string, additionalData?: any) => Promise<any>
  createWorkflow: (workflowType: string) => Promise<any>
  linkScenario: (scenarioId: string) => Promise<IntegrationResult>
  
  // Auto-save
  saveDraft: (data: any) => void
  clearDraft: () => Promise<void>
  hasDraft: boolean
  
  // Utilities
  refresh: () => Promise<void>
  getIntegrationStatus: () => any
}

// ===================================================================
// MAIN HOOK
// ===================================================================

export function useClientIntegration(
  options: UseClientIntegrationOptions = {}
): UseClientIntegrationReturn {
  const { clientId, autoSave = true, refreshInterval } = options
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [client, setClient] = useState<ExtendedClientProfile | null>(null)
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  // ===================================================================
  // DATA FETCHING
  // ===================================================================

  const fetchClientData = useCallback(async () => {
    if (!clientId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch dashboard data (includes client)
      const data = await integratedClientService.getClientDashboardData(clientId)
      
      if (data) {
        setClient(data.client)
        setDashboardData(data)
      } else {
        setError('Client not found')
      }
    } catch (err) {
      console.error('Error fetching client data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load client data')
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  // Initial load
  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchClientData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchClientData])

  // Check for draft on load
  useEffect(() => {
    const checkDraft = async () => {
      if (clientId && autoSave && autoSaveService?.loadDraft) {
        try {
          const draft = await autoSaveService.loadDraft('client', clientId)
          setHasDraft(!!draft)
        } catch (err) {
          console.warn('Failed to check draft:', err)
        }
      }
    }
    checkDraft()
  }, [clientId, autoSave])

  // ===================================================================
  // CLIENT OPERATIONS - FIXED TO HANDLE CLIENT RETURN TYPE
  // ===================================================================

  const updateClient = useCallback(async (data: any): Promise<IntegrationResult> => {
    if (!clientId) {
      return { success: false, message: 'No client ID provided' }
    }

    try {
      // integratedClientService.updateClient now returns a Client object
      const updated = await integratedClientService.updateClient(clientId, data)
      
      // Update local state with the new client data
      setClient(updated)
      
      // Also refresh dashboard data to ensure everything is in sync
      await fetchClientData()
      
      toast({
        title: 'Success',
        description: 'Client updated successfully'
      })

      // Clear draft after successful save
      if (autoSave && autoSaveService?.clearDraft) {
        try {
          await autoSaveService.clearDraft('client', clientId)
          setHasDraft(false)
        } catch (err) {
          console.warn('Failed to clear draft:', err)
        }
      }

      // Return IntegrationResult format
      return { 
        success: true, 
        message: 'Client updated', 
        data: updated 
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update client'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
      return { 
        success: false, 
        message, 
        error: message 
      }
    }
  }, [clientId, autoSave, toast, fetchClientData])

  // ===================================================================
  // ASSESSMENT INTEGRATION
  // ===================================================================

  const completeAssessment = useCallback(async (
    assessmentData: any
  ): Promise<IntegrationResult> => {
    if (!clientId) {
      return { success: false, message: 'No client ID provided' }
    }

    try {
      const result = await integratedClientService.completeAssessmentFlow(
        clientId,
        assessmentData
      )

      if (result.success) {
        toast({
          title: 'Assessment Complete',
          description: 'Risk profile updated and documents ready to generate'
        })

        // Refresh data to show updates
        await fetchClientData()
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        })
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete assessment'
      return { success: false, message, error: message }
    }
  }, [clientId, toast, fetchClientData])

  // ===================================================================
  // DOCUMENT OPERATIONS - WITH SAFE SERVICE CHECKS
  // ===================================================================

  const generateDocument = useCallback(async (
    templateType: string,
    additionalData?: any
  ) => {
    if (!clientId || !client) {
      toast({
        title: 'Error',
        description: 'No client selected',
        variant: 'destructive'
      })
      return null
    }

    try {
      // Check if realDocumentService exists
      if (!realDocumentService) {
        console.warn('Document service not available')
        toast({
          title: 'Service Unavailable',
          description: 'Document generation service is not available',
          variant: 'destructive'
        })
        return null
      }

      // Check which method is available
      let result: any = null
      
      if (typeof realDocumentService.generateDocument === 'function') {
        // generateDocument expects: (templateType, clientId, client)
        result = await realDocumentService.generateDocument(
          templateType,
          clientId,
          client
        )
      } else if (typeof realDocumentService.generateDocument === 'function') {
        // Fallback to generateClientDocument if available
        result = await realDocumentService.generateDocument(
          clientId,
          templateType,
          client  // Pass the client object as 3rd parameter
        )
      } else {
        throw new Error('No document generation method available')
      }

      if (result?.success && result.document) {
        toast({
          title: 'Document Generated',
          description: `${result.document.name || 'Document'} created successfully`
        })

        // Refresh to show new document
        await fetchClientData()
        return result
      } else if (result?.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return result
      }

      return null
    } catch (err) {
      console.error('Document generation error:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate document',
        variant: 'destructive'
      })
      return null
    }
  }, [clientId, client, toast, fetchClientData])

  // ===================================================================
  // WORKFLOW OPERATIONS
  // ===================================================================

  const createWorkflow = useCallback(async (workflowType: string) => {
    if (!clientId) {
      return null
    }

    try {
      // Check if service and method exist
      if (!realDocumentService || typeof realDocumentService.createClientWorkflow !== 'function') {
        console.warn('Workflow service not available')
        return null
      }

      const workflow = await realDocumentService.createClientWorkflow(
        clientId,
        workflowType as any
      )

      if (workflow) {
        toast({
          title: 'Workflow Created',
          description: 'Document workflow initiated'
        })
      }

      return workflow
    } catch (err) {
      console.error('Workflow creation error:', err)
      toast({
        title: 'Error',
        description: 'Failed to create workflow',
        variant: 'destructive'
      })
      return null
    }
  }, [clientId, toast])

  // ===================================================================
  // SCENARIO LINKING
  // ===================================================================

  const linkScenario = useCallback(async (
    scenarioId: string
  ): Promise<IntegrationResult> => {
    if (!clientId) {
      return { success: false, message: 'No client ID provided' }
    }

    try {
      const result = await integratedClientService.linkScenarioToClient(
        clientId,
        scenarioId
      )

      if (result.success) {
        toast({
          title: 'Scenario Linked',
          description: 'Cash flow scenario connected to client'
        })
        await fetchClientData()
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link scenario'
      return { success: false, message, error: message }
    }
  }, [clientId, toast, fetchClientData])

  // ===================================================================
  // AUTO-SAVE OPERATIONS WITH SAFE CHECKS
  // ===================================================================

  const saveDraft = useCallback((data: any) => {
    if (clientId && autoSave && autoSaveService?.saveDraft) {
      try {
        autoSaveService.saveDraft('client', clientId, data)
        setHasDraft(true)
      } catch (err) {
        console.warn('Failed to save draft:', err)
      }
    }
  }, [clientId, autoSave])

  const clearDraft = useCallback(async () => {
    if (clientId && autoSaveService?.clearDraft) {
      try {
        await autoSaveService.clearDraft('client', clientId)
        setHasDraft(false)
      } catch (err) {
        console.warn('Failed to clear draft:', err)
      }
    }
  }, [clientId])

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  const refresh = useCallback(async () => {
    await fetchClientData()
  }, [fetchClientData])

  const getIntegrationStatus = useCallback(() => {
    return client?.integrationStatus || {
      hasAssessment: false,
      hasScenario: false,
      hasDocuments: false,
      hasMonteCarlo: false,
      lastUpdated: new Date().toISOString()
    }
  }, [client])

  // ===================================================================
  // RETURN VALUE
  // ===================================================================

  return {
    // Data
    client,
    dashboardData,
    isLoading,
    error,
    
    // Actions
    updateClient,
    completeAssessment,
    generateDocument,
    createWorkflow,
    linkScenario,
    
    // Auto-save
    saveDraft,
    clearDraft,
    hasDraft,
    
    // Utilities
    refresh,
    getIntegrationStatus
  }
}

// ===================================================================
// USAGE EXAMPLE
// ===================================================================

/*
// In your component:
import { useClientIntegration } from '@/lib/hooks/useClientIntegration'

export default function ClientPage({ params }: { params: { id: string } }) {
  const {
    client,
    dashboardData,
    isLoading,
    updateClient,
    completeAssessment,
    generateDocument,
    saveDraft,
    hasDraft
  } = useClientIntegration({
    clientId: params.id,
    autoSave: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  })

  if (isLoading) return <Loading />
  if (!client) return <NotFound />

  return (
    <div>
      {hasDraft && <DraftIndicator />}
      
      <ClientForm
        client={client}
        onSave={updateClient}
        onChange={saveDraft}
      />
      
      <button onClick={() => generateDocument('suitability_report')}>
        Generate Report
      </button>
      
      {dashboardData?.pendingActions.map(action => (
        <PendingActionCard key={action.type} action={action} />
      ))}
    </div>
  )
}
*/