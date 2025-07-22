// app/assessments/dashboard/page.tsx
// Complete error-free Assessment Dashboard with client list

'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Loader2
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
  draft: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText, label: 'Draft' },
  pending: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, label: 'Pending' }
}

export default function AssessmentDashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load clients from database
  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load clients with your JSONB structure
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError

      // Transform the JSONB data
      const transformedClients: Client[] = (clientsData || []).map((client, index) => {
        // Extract data from JSONB fields
        const personalDetails = client.personal_details || {}
        const contactInfo = client.contact_info || {}
        const financialProfile = client.financial_profile || {}
        const vulnerabilityAssessment = client.vulnerability_assessment || {}
        const riskProfile = client.risk_profile || {}
        
        return {
          id: client.id,
          name: personalDetails.full_name || `${personalDetails.first_name || ''} ${personalDetails.last_name || ''}`.trim() || 'Unknown Client',
          clientRef: client.client_ref || `C${Date.now()}${index}`,
          age: personalDetails.age || calculateAge(personalDetails.date_of_birth) || 0,
          occupation: personalDetails.occupation || 'Not specified',
          location: `${contactInfo.city || contactInfo.town || 'Unknown'}, ${contactInfo.country || 'UK'}`,
          phone: contactInfo.phone || contactInfo.mobile || '',
          email: contactInfo.email || '',
          investmentAmount: financialProfile.investment_amount || financialProfile.total_assets || 0,
          fees: financialProfile.fees || 0,
          monthlySavings: financialProfile.monthly_savings || 0,
          targetRetirementAge: personalDetails.target_retirement_age || financialProfile.retirement_age || 65,
          riskProfile: riskProfile.risk_level || riskProfile.final_risk_profile || 3,
          suitabilityScore: riskProfile.suitability_score || 0,
          assessmentStatus: client.status || 'draft',
          lastAssessment: riskProfile.last_assessment_date || null,
          nextReview: riskProfile.next_review_date || null,
          portfolioPerformance: financialProfile.portfolio_performance || 0,
          vulnerableClient: vulnerabilityAssessment.is_vulnerable || false,
          tags: personalDetails.tags || financialProfile.tags || [],
          avatar: getRandomAvatar(index),
          atrComplete: riskProfile.atr_complete || false,
          cflComplete: riskProfile.cfl_complete || false,
          personaComplete: riskProfile.persona_complete || false
        }
      })

      setClients(transformedClients)
    } catch (err) {
      console.error('Error loading clients:', err)
      setError('Failed to load clients. Please check your database connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string | null): number => {
    if (!dateOfBirth) return 0
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Filter and sort clients
  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.clientRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.occupation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.location.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || client.assessmentStatus === filterStatus
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'value':
          return b.investmentAmount - a.investmentAmount
        case 'risk':
          return b.riskProfile - a.riskProfile
        case 'performance':
          return b.portfolioPerformance - a.portfolioPerformance
        case 'recent':
          return (b.lastAssessment || '').localeCompare(a.lastAssessment || '')
        default:
          return 0
      }
    })

  // Calculate summary statistics
  const stats = {
    totalClients: clients.length,
    totalAUM: clients.reduce((sum, client) => sum + client.investmentAmount, 0),
    completedAssessments: clients.filter(c => c.assessmentStatus === 'completed').length,
    reviewsNeeded: clients.filter(c => c.assessmentStatus === 'review_needed').length,
    averageRisk: clients.length > 0 ? (clients.reduce((sum, c) => sum + c.riskProfile, 0) / clients.length).toFixed(1) : '0',
    vulnerableClients: clients.filter(c => c.vulnerableClient).length
  }

  const handleClientClick = (client: any) => {
    // Store client data in sessionStorage
    sessionStorage.setItem('selectedClient', JSON.stringify({
      id: client.id,
      name: client.name,
      age: client.age,
      investmentAmount: client.investmentAmount,
      occupation: client.occupation,
      maritalStatus: client.maritalStatus || '',
      address: client.location,
      fees: client.fees,
      monthlySavings: client.monthlySavings,
      targetRetirementAge: client.targetRetirementAge,
      client_reference: client.clientRef
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
                <p className="text-gray-600">Select a client to view or create their suitability assessment</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push('/assessments')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Brain className="h-4 w-4" />
                <span>Risk Tools</span>
              </button>
              <button 
                onClick={handleNewAssessment}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md flex items-center space-x-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalClients}</div>
            <div className="text-sm text-gray-600">Active Clients</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-xs text-gray-500">AUM</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">£{(stats.totalAUM / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-600">Total Assets</div>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name, reference, occupation, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="value">Sort by Value</option>
                <option value="risk">Sort by Risk</option>
                <option value="performance">Sort by Performance</option>
                <option value="recent">Sort by Recent</option>
              </select>

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading clients...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Clients</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button 
              onClick={loadClients}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Client Grid/List */}
        {!isLoading && !error && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredClients.map((client) => {
              // Safe status handling
              const statusInfo = statusConfig[client.assessmentStatus] || statusConfig.draft
              const StatusIcon = statusInfo.icon

              if (viewMode === 'list') {
                return (
                  <div
                    key={client.id}
                    onClick={() => handleClientClick(client)}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">{client.avatar}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {client.name}
                          </h3>
                          <p className="text-sm text-gray-500">{client.clientRef} • {client.occupation}</p>
                          <p className="text-xs text-gray-400 mt-1">{client.location} • {client.phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Portfolio</div>
                            <div className="text-lg font-semibold">£{client.investmentAmount.toLocaleString()}</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Risk</div>
                            <div className="text-lg font-semibold">{client.riskProfile}/5</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Performance</div>
                            <div className={`text-lg font-semibold flex items-center justify-center ${client.portfolioPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {client.portfolioPerformance >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              {Math.abs(client.portfolioPerformance)}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex -space-x-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${client.atrComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              A
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${client.cflComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              C
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${client.personaComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              P
                            </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color} flex items-center space-x-1`}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{statusInfo.label}</span>
                          </div>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={client.id}
                  onClick={() => handleClientClick(client)}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                >
                  {/* Client Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-4xl">{client.avatar}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {client.name}
                        </h3>
                        <p className="text-sm text-gray-500">{client.clientRef}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color} flex items-center space-x-1`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center space-x-1">
                        <Building className="h-3 w-3" />
                        <span>Occupation</span>
                      </span>
                      <span className="font-medium truncate ml-2">{client.occupation}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>Location</span>
                      </span>
                      <span className="font-medium truncate ml-2">{client.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Portfolio</span>
                      </span>
                      <span className="font-medium">£{client.investmentAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span>Risk Level</span>
                      </span>
                      <span className="font-medium">{client.riskProfile}/5 - {riskProfileNames[client.riskProfile] || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>Suitability</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{client.suitabilityScore}%</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${client.suitabilityScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Performance</span>
                      </span>
                      <span className={`font-medium flex items-center ${client.portfolioPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {client.portfolioPerformance >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(client.portfolioPerformance)}% YTD
                      </span>
                    </div>
                  </div>

                  {/* Assessment Progress */}
                  <div className="border-t pt-3 mb-3">
                    <div className="text-xs text-gray-500 mb-2">Assessment Progress</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${client.atrComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          ATR {client.atrComplete ? '✓' : '○'}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${client.cflComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          CFL {client.cflComplete ? '✓' : '○'}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${client.personaComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          Persona {client.personaComplete ? '✓' : '○'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {client.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                    {client.vulnerableClient && (
                      <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Vulnerable</span>
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <button className="w-full py-2 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 rounded-lg font-medium group-hover:from-blue-600 group-hover:to-purple-600 group-hover:text-white transition-all flex items-center justify-center space-x-2">
                    <span>View Assessment</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  {/* Review Date */}
                  {client.nextReview && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Next Review</span>
                        </span>
                        <span>{new Date(client.nextReview).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredClients.length === 0 && (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <button 
              onClick={handleNewAssessment}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}