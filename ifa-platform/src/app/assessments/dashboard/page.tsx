// app/assessments/dashboard/page.tsx
// Complete error-free Assessment Dashboard with client list and individual client view

'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  Search, 
  Filter, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ChevronRight,
  Building,
  Calendar,
  DollarSign,
  Shield,
  BarChart3,
  Sparkles,
  Activity,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  MapPin,
  PieChart,
  Brain,
  Calculator,
  Loader2,
  ArrowLeft
} from 'lucide-react'

// Client interface
interface Client {
  id: string
  name: string
  clientRef: string
  age: number
  occupation: string
  location: string
  phone: string
  email: string
  investmentAmount: number
  fees: number
  monthlySavings: number
  targetRetirementAge: number
  riskProfile: number
  suitabilityScore: number
  assessmentStatus: string
  lastAssessment: string | null
  nextReview: string | null
  portfolioPerformance: number
  vulnerableClient: boolean
  tags: string[]
  avatar: string
  atrComplete: boolean
  cflComplete: boolean
  personaComplete: boolean
}

// Avatar emojis for clients
const avatarEmojis = ['👨‍💼', '👩‍⚕️', '👨‍💻', '👵', '👨‍⚖️', '👩‍💼', '👨‍🏫', '👩‍🔬', '👨‍🌾', '👩‍🍳']

const getRandomAvatar = (index: number) => avatarEmojis[index % avatarEmojis.length]

const riskProfileNames: Record<number, string> = {
  1: 'Very Conservative',
  2: 'Conservative',
  3: 'Balanced',
  4: 'Growth',
  5: 'Aggressive Growth'
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Completed' },
  in_progress: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'In Progress' },
  review_needed: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle, label: 'Review Needed' },
  draft: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText, label: 'Draft' }
}

export default function AssessmentDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams?.get('clientId') || null // Add null check
  
  // State
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  // Fetch data on mount or when clientId changes
  useEffect(() => {
    if (clientId) {
      // If clientId is provided, load only that client
      loadSingleClient(clientId)
    } else {
      // Otherwise, load all clients
      loadClients()
    }
  }, [clientId])

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters()
  }, [clients, searchTerm, filterStatus, sortBy])

  const loadSingleClient = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (clientError) throw clientError

      if (clientData) {
        const mappedClient: Client = {
          id: clientData.id,
          name: `${clientData.personal_details?.firstName || ''} ${clientData.personal_details?.lastName || ''}`.trim() || 'Unknown Client',
          clientRef: clientData.client_reference || clientData.client_ref || `CLI${clientData.id.slice(0, 6).toUpperCase()}`,
          age: clientData.personal_details?.dateOfBirth ? 
            new Date().getFullYear() - new Date(clientData.personal_details.dateOfBirth).getFullYear() : 0,
          occupation: clientData.personal_details?.occupation || clientData.occupation || 'Not specified',
          location: clientData.contact_info?.city || clientData.location || 'Not specified',
          phone: clientData.contact_info?.phone || clientData.phone || 'Not provided',
          email: clientData.contact_info?.email || clientData.email || 'Not provided',
          investmentAmount: clientData.financial_profile?.liquidAssets || clientData.investment_amount || 0,
          fees: clientData.fees || 0,
          monthlySavings: clientData.financial_profile?.monthlyIncome || clientData.monthly_savings || 0,
          targetRetirementAge: clientData.target_retirement_age || 65,
          riskProfile: clientData.risk_profile?.attitudeToRisk || 3,
          suitabilityScore: clientData.suitability_score || 0,
          assessmentStatus: clientData.assessment_status || 'review_needed',
          lastAssessment: clientData.last_assessment,
          nextReview: clientData.next_review || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          portfolioPerformance: clientData.portfolio_performance || 0,
          vulnerableClient: clientData.vulnerable_client || false,
          tags: clientData.tags || [],
          avatar: getRandomAvatar(0),
          atrComplete: clientData.atr_complete || false,
          cflComplete: clientData.cfl_complete || false,
          personaComplete: clientData.persona_complete || false
        }
        
        setSelectedClient(mappedClient)
        setClients([mappedClient]) // Set as single item array for consistency
      }
    } catch (error) {
      console.error('Error loading client:', error)
      setError('Failed to load client data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active') // Filter to avoid duplicates
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError

      if (clientsData) {
        const mappedClients: Client[] = clientsData.map((client, index) => ({
          id: client.id,
          name: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Unknown Client',
          clientRef: client.client_reference || client.client_ref || `CLI${client.id.slice(0, 6).toUpperCase()}`,
          age: client.personal_details?.dateOfBirth ? 
            new Date().getFullYear() - new Date(client.personal_details.dateOfBirth).getFullYear() : 0,
          occupation: client.personal_details?.occupation || client.occupation || 'Not specified',
          location: client.contact_info?.city || client.location || 'Not specified',
          phone: client.contact_info?.phone || client.phone || 'Not provided',
          email: client.contact_info?.email || client.email || 'Not provided',
          investmentAmount: client.financial_profile?.liquidAssets || client.investment_amount || 0,
          fees: client.fees || 0,
          monthlySavings: client.financial_profile?.monthlyIncome || client.monthly_savings || 0,
          targetRetirementAge: client.target_retirement_age || 65,
          riskProfile: client.risk_profile?.attitudeToRisk || 3,
          suitabilityScore: client.suitability_score || 0,
          assessmentStatus: client.assessment_status || 'review_needed',
          lastAssessment: client.last_assessment,
          nextReview: client.next_review || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          portfolioPerformance: client.portfolio_performance || 0,
          vulnerableClient: client.vulnerable_client || false,
          tags: client.tags || [],
          avatar: getRandomAvatar(index),
          atrComplete: client.atr_complete || false,
          cflComplete: client.cfl_complete || false,
          personaComplete: client.persona_complete || false
        }))
        
        setClients(mappedClients)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      setError('Failed to load clients')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...clients]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.occupation.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => client.assessmentStatus === filterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'value':
          return b.investmentAmount - a.investmentAmount
        case 'risk':
          return b.riskProfile - a.riskProfile
        case 'date':
          return new Date(b.lastAssessment || 0).getTime() - new Date(a.lastAssessment || 0).getTime()
        default:
          return 0
      }
    })

    setFilteredClients(filtered)
  }

  const calculateStats = () => {
    const totalAUM = clients.reduce((sum, c) => sum + c.investmentAmount, 0)
    const completedAssessments = clients.filter(c => c.assessmentStatus === 'completed').length
    const reviewsNeeded = clients.filter(c => c.assessmentStatus === 'review_needed').length
    const averageRisk = clients.length > 0 ? 
      (clients.reduce((sum, c) => sum + c.riskProfile, 0) / clients.length).toFixed(1) : '0'
    const vulnerableClients = clients.filter(c => c.vulnerableClient).length

    return {
      totalClients: clients.length,
      totalAUM,
      completedAssessments,
      reviewsNeeded,
      averageRisk,
      vulnerableClients
    }
  }

  const stats = calculateStats()

  const handleClientClick = (client: Client) => {
    // Store client data in sessionStorage
    sessionStorage.setItem('selectedClient', JSON.stringify({
      id: client.id,
      name: client.name,
      age: client.age,
      investmentAmount: client.investmentAmount,
      occupation: client.occupation,
      address: client.location,
      fees: client.fees,
      monthlySavings: client.monthlySavings,
      targetRetirementAge: client.targetRetirementAge,
      client_reference: client.clientRef
      // Removed maritalStatus as it doesn't exist on Client type
    }))
    sessionStorage.setItem('selectedClientId', client.id)
    
    // Navigate to suitability assessment page
    router.push('/assessments/suitability')
  }

  const handleNewAssessment = () => {
    // Clear any existing client data
    sessionStorage.removeItem('selectedClient')
    sessionStorage.removeItem('selectedClientId')
    // Navigate to suitability assessment
    router.push('/assessments/suitability')
  }

  const handleBackToAll = () => {
    router.push('/assessments/dashboard')
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Loading Assessment Data...</h3>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Error Loading Data</h3>
            <p className="text-gray-600 mt-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Individual Client View
  if (clientId && selectedClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header with back button */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToAll}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedClient.name}'s Assessment Dashboard
                  </h1>
                  <p className="text-gray-600">Client Reference: {selectedClient.clientRef}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => router.push(`/assessments/suitability?clientId=${selectedClient.id}`)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>New Assessment</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Client Summary Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Investment Amount</p>
                <p className="text-xl font-bold">£{selectedClient.investmentAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Risk Profile</p>
                <p className="text-xl font-bold">{riskProfileNames[selectedClient.riskProfile]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Assessment Status</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedClient.assessmentStatus].color}`}>
                  {React.createElement(statusConfig[selectedClient.assessmentStatus].icon, { className: "h-4 w-4 mr-1" })}
                  {statusConfig[selectedClient.assessmentStatus].label}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Next Review</p>
                <p className="text-xl font-bold">
                  {selectedClient.nextReview ? new Date(selectedClient.nextReview).toLocaleDateString() : 'Not scheduled'}
                </p>
              </div>
            </div>
          </div>

          {/* Assessment Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`bg-white rounded-xl p-6 border-2 ${selectedClient.atrComplete ? 'border-green-200' : 'border-gray-200'} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Risk Assessment (ATR)</h3>
                {selectedClient.atrComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {selectedClient.atrComplete ? 'Completed' : 'Pending'}
              </p>
            </div>

            <div className={`bg-white rounded-xl p-6 border-2 ${selectedClient.cflComplete ? 'border-green-200' : 'border-gray-200'} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Capacity for Loss</h3>
                {selectedClient.cflComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {selectedClient.cflComplete ? 'Completed' : 'Pending'}
              </p>
            </div>

            <div className={`bg-white rounded-xl p-6 border-2 ${selectedClient.personaComplete ? 'border-green-200' : 'border-gray-200'} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Investor Persona</h3>
                {selectedClient.personaComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {selectedClient.personaComplete ? 'Completed' : 'Pending'}
              </p>
            </div>
          </div>

          {/* Assessment History */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Assessment History</h2>
            <div className="space-y-4">
              {selectedClient.lastAssessment ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Last Assessment</p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedClient.lastAssessment).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/assessments/suitability?clientId=${selectedClient.id}`)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No assessments completed yet</p>
                  <button
                    onClick={() => router.push(`/assessments/suitability?clientId=${selectedClient.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start First Assessment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full Dashboard View (All Clients)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assessment Dashboard</h1>
                <p className="text-gray-600">Professional suitability assessment management • {clients.length} clients loaded</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push('/assessments')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm"
              >
                <Brain className="h-4 w-4" />
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
        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-green-600 font-semibold">+12%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalClients}</div>
            <div className="text-sm text-gray-600">Active Clients</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-xs text-green-600 font-semibold">+8.2%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">£{(stats.totalAUM / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-600">Total AUM</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-xs text-gray-500">Complete</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.completedAssessments}</div>
            <div className="text-sm text-gray-600">Assessments</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-gray-500">Action</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.reviewsNeeded}</div>
            <div className="text-sm text-gray-600">Need Review</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-gray-500">Risk</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.averageRisk}</div>
            <div className="text-sm text-gray-600">Avg Risk Level</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-red-600" />
              <span className="text-xs text-gray-500">Vulnerable</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.vulnerableClients}</div>
            <div className="text-sm text-gray-600">Clients</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name, reference, or occupation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="review_needed">Review Needed</option>
                <option value="draft">Draft</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="value">Sort by Value</option>
                <option value="risk">Sort by Risk</option>
                <option value="date">Sort by Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center border border-gray-200">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600">Try adjusting your search filters or add a new client.</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleClientClick(client)}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{client.avatar}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-sm text-gray-500">{client.clientRef}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Investment</span>
                    <span className="font-semibold">£{client.investmentAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Risk Profile</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-4 rounded-full ${
                            i < client.riskProfile
                              ? 'bg-gradient-to-r from-green-400 to-red-500'
                              : 'bg-gray-200'
                          }`}
                          style={{
                            background: i < client.riskProfile
                              ? `linear-gradient(to right, hsl(${120 - (i * 30)}, 70%, 50%), hsl(${120 - ((i + 1) * 30)}, 70%, 50%))`
                              : undefined
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[client.assessmentStatus].color}`}>
                      {React.createElement(statusConfig[client.assessmentStatus].icon, { className: "h-3 w-3 mr-1" })}
                      {statusConfig[client.assessmentStatus].label}
                    </div>
                  </div>

                  {client.vulnerableClient && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Vulnerable Client</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}