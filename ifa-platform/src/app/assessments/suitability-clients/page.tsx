// app/assessments/suitability-clients/page.tsx
// This page shows the client list for Suitability Assessments
// Clicking a client will navigate to /assessments/suitability with their data

'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
  DollarSign,
  Shield,
  Plus,
  Loader2
} from 'lucide-react'

interface Client {
  id: string
  name: string
  clientRef: string
  age: number
  occupation: string
  investmentAmount: number
  assessmentStatus: string
  lastAssessment: string | null
  nextReview: string | null
  riskProfile: number
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
  in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In Progress' },
  review_needed: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: 'Review Needed' },
  draft: { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Draft' }
}

export default function SuitabilityClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setIsLoading(true)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError

      // Transform JSONB data
      const transformedClients: Client[] = (clientsData || []).map(client => {
        const personalDetails = client.personal_details || {}
        const financialProfile = client.financial_profile || {}
        const riskProfile = client.risk_profile || {}
        
        return {
          id: client.id,
          name: personalDetails.full_name || `${personalDetails.first_name || ''} ${personalDetails.last_name || ''}`.trim() || 'Unknown',
          clientRef: client.client_ref || 'N/A',
          age: personalDetails.age || 0,
          occupation: personalDetails.occupation || 'Not specified',
          investmentAmount: financialProfile.investment_amount || 0,
          assessmentStatus: client.status || 'draft',
          lastAssessment: riskProfile.last_assessment_date,
          nextReview: riskProfile.next_review_date,
          riskProfile: riskProfile.final_risk_profile || riskProfile.risk_level || 3
        }
      })

      setClients(transformedClients)
    } catch (err) {
      console.error('Error loading clients:', err)
      setError('Failed to load clients')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientRef.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectClient = (client: Client) => {
    // Store client ID and reference for the suitability page
    sessionStorage.setItem('selectedClientId', client.id)
    sessionStorage.setItem('selectedClient', JSON.stringify({
      id: client.id,
      name: client.name,
      age: client.age,
      investmentAmount: client.investmentAmount,
      occupation: client.occupation,
      client_reference: client.clientRef
    }))
    
    // Navigate to the suitability assessment page
    router.push('/assessments/suitability')
  }

  const handleNewClient = () => {
    // Clear any existing client data
    sessionStorage.removeItem('selectedClient')
    sessionStorage.removeItem('selectedClientId')
    // Navigate to suitability assessment for new client
    router.push('/assessments/suitability')
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Suitability Assessments</h1>
        <p className="text-gray-600">Select a client to view or create their suitability assessment</p>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients by name or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleNewClient}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Assessment
          </button>
        </div>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Review
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No clients found. Try adjusting your search or create a new assessment.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const status = statusConfig[client.assessmentStatus] || statusConfig.draft
                    const StatusIcon = status.icon
                    
                    return (
                      <tr 
                        key={client.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectClient(client)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.clientRef} • {client.occupation}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">£{client.investmentAmount.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">{client.riskProfile}/5</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.nextReview ? (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {new Date(client.nextReview).toLocaleDateString('en-GB')}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}