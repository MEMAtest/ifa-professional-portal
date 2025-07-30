// app/assessments/suitability-clients/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  Brain, 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  Users,
  ArrowLeft
} from 'lucide-react'
import { 
  suitabilityService, 
  type SuitabilityClient, 
  type SuitabilityMetrics 
} from '@/services/SuitabilityAssessmentService'
import SuitabilityMetricsCards from '@/components/suitability/SuitabilityMetricsCards'
import SuitabilityFilters from '@/components/suitability/SuitabilityFilters'
import ClientAssessmentCard from '@/components/suitability/ClientAssessmentCard'

export default function SuitabilityClientsPage() {
  const router = useRouter()
  
  // State
  const [clients, setClients] = useState<SuitabilityClient[]>([])
  const [filteredClients, setFilteredClients] = useState<SuitabilityClient[]>([])
  const [metrics, setMetrics] = useState<SuitabilityMetrics>({
    totalClients: 0,
    totalAUM: 0,
    completed: 0,
    needReview: 0,
    avgRiskLevel: 0,
    vulnerable: 0
  })
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Apply filters when they change
  useEffect(() => {
    applyFilters()
  }, [clients, searchTerm, statusFilter, sortBy])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('Loading clients from Supabase...')
      const loadedClients = await suitabilityService.loadClientsWithAssessments()
      
      if (loadedClients.length === 0) {
        console.log('No clients found in database')
        setClients([])
        setFilteredClients([])
        return
      }
      
      console.log(`Successfully loaded ${loadedClients.length} clients`)
      setClients(loadedClients)
      
      // Calculate metrics
      const calculatedMetrics = suitabilityService.calculateMetrics(loadedClients)
      setMetrics(calculatedMetrics)
      
    } catch (err: any) {
      console.error('Error loading suitability data:', err)
      setError(err.message || 'Failed to load client data')
      setClients([])
      setFilteredClients([])
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = suitabilityService.filterClients(clients, searchTerm, statusFilter)
    filtered = suitabilityService.sortClients(filtered, sortBy)
    setFilteredClients(filtered)
  }

  const handleClientClick = (client: SuitabilityClient) => {
    // Store client data in sessionStorage for the assessment dashboard
    // Only store properties that exist on SuitabilityClient type
    sessionStorage.setItem('selectedClient', JSON.stringify({
      id: client.id,
      name: client.name,
      age: client.age,
      clientRef: client.clientRef,
      occupation: client.occupation,
      investmentAmount: client.investmentAmount,
      riskProfile: client.riskProfile,
      suitabilityScore: client.suitabilityScore,
      assessmentStatus: client.assessmentStatus,
      lastAssessment: client.lastAssessment,
      nextReview: client.nextReview,
      portfolioPerformance: client.portfolioPerformance,
      vulnerableClient: client.vulnerableClient,
      tags: client.tags,
      priority: client.priority,
      // Add default values for properties needed by other components
      location: '',
      phone: '',
      email: '',
      fees: 0,
      monthlySavings: 0,
      targetRetirementAge: 65,
      atrComplete: false,
      cflComplete: false,
      personaComplete: false,
      maritalStatus: '',
      address: '',
      client_reference: client.clientRef
    }))
    
    sessionStorage.setItem('selectedClientId', client.id)
    
    // Navigate to the client's assessment dashboard
    router.push(`/assessments/dashboard?clientId=${client.id}`)
  }

  const handleNewAssessment = () => {
    sessionStorage.removeItem('selectedClient')
    sessionStorage.removeItem('selectedClientId')
    router.push('/assessments/suitability')
  }

  const handleRetryConnection = () => {
    loadData()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading Suitability Assessments...
              </h3>
              <p className="text-gray-600">Fetching client data from database</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Data
              </h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={handleRetryConnection}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suitability Assessments</h1>
                <p className="text-gray-600">
                  Professional suitability assessment management • {clients.length} clients loaded
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push('/assessments')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Risk Tools</span>
              </button>
              <button 
                onClick={handleNewAssessment}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md flex items-center space-x-2 hover:shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Metrics Cards */}
        <SuitabilityMetricsCards metrics={metrics} />

        {/* Filters - Updated to include clientCount */}
        <SuitabilityFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          clientCount={filteredClients.length}
        />

        {/* Empty State */}
        {filteredClients.length === 0 && clients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Clients Found
              </h3>
              <p className="text-gray-600 mb-6">
                Start by creating a new suitability assessment
              </p>
              <button
                onClick={handleNewAssessment}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Assessment
              </button>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Matching Clients
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or search term
              </p>
            </div>
          </div>
        ) : (
          /* Client Grid/List */
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredClients.map((client) => (
              <ClientAssessmentCard
                key={client.id}
                client={client}
                onClick={() => handleClientClick(client)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}