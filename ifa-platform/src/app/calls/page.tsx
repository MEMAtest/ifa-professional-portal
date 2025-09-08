// app/calls/page.tsx
// ✅ FIXED VERSION - Uses correct database columns
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

// Types based on actual database schema
interface CallRecord {
  id: string
  client_id: string
  client_name: string
  client_ref: string
  communication_type: string
  subject: string
  summary: string
  communication_date: string
  requires_followup: boolean
  followup_date?: string
  followup_completed: boolean
  direction: string
  contact_method: string
  created_at: string
}

interface Client {
  id: string
  client_ref: string
  personal_details: {
    firstName: string
    lastName: string
    title?: string
  }
  contact_info: {
    phone: string
    email: string
  }
}

interface CallStats {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  followUpsNeeded: number
  todaysCalls: number
}

export default function CallsPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  // State
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<CallStats>({
    totalCalls: 0,
    completedCalls: 0,
    missedCalls: 0,
    followUpsNeeded: 0,
    todaysCalls: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null)
  const [showNewCallModal, setShowNewCallModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all')

  // Form state for new call
  const [newCall, setNewCall] = useState({
    client_id: '',
    subject: '',
    summary: '',
    communication_date: new Date().toISOString().slice(0, 16),
    direction: 'outbound' as 'inbound' | 'outbound',
    contact_method: 'phone',
    requires_followup: false,
    followup_date: ''
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadCalls(),
        loadClients()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load call data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCalls = async () => {
    // ✅ FIXED: Use correct column names
    const { data: communicationData, error } = await supabase
      .from('client_communications')
      .select(`
        *,
        clients!inner(
          id,
          client_ref,
          personal_details,
          contact_info
        )
      `)
      .eq('communication_type', 'call') // ✅ FIXED: was 'type'
      .order('communication_date', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Failed to load calls: ${error.message}`)
    }

    // Transform data to CallRecord format
    const callRecords: CallRecord[] = (communicationData || []).map(comm => ({
      id: comm.id,
      client_id: comm.client_id,
      client_name: `${comm.clients.personal_details.firstName} ${comm.clients.personal_details.lastName}`,
      client_ref: comm.clients.client_ref,
      communication_type: comm.communication_type,
      subject: comm.subject || 'Phone Call',
      summary: comm.summary || '', // ✅ FIXED: was 'content'
      communication_date: comm.communication_date,
      requires_followup: comm.requires_followup || false,
      followup_date: comm.followup_date,
      followup_completed: comm.followup_completed || false,
      direction: comm.direction || 'outbound',
      contact_method: comm.contact_method || 'phone',
      created_at: comm.created_at
    }))

    setCalls(callRecords)
    calculateStats(callRecords)
  }

  const loadClients = async () => {
    // ✅ FIXED: Only select existing columns
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('id, client_ref, personal_details, contact_info')
      .order('personal_details->firstName')

    if (error) {
      throw new Error(`Failed to load clients: ${error.message}`)
    }

    setClients(clientData || [])
  }

  const calculateStats = (callData: CallRecord[]) => {
    const today = new Date().toDateString()
    const completed = callData.filter(c => c.contact_method === 'phone')
    const missed = callData.filter(c => c.contact_method === 'missed_call')
    const followUps = callData.filter(c => c.requires_followup && !c.followup_completed)
    const todaysCalls = callData.filter(c => 
      new Date(c.communication_date).toDateString() === today
    )

    setStats({
      totalCalls: callData.length,
      completedCalls: completed.length,
      missedCalls: missed.length,
      followUpsNeeded: followUps.length,
      todaysCalls: todaysCalls.length
    })
  }

  const handleNewCall = async () => {
    try {
      if (!newCall.client_id || !newCall.summary.trim()) {
        toast({
          title: 'Error',
          description: 'Please select a client and enter call details',
          variant: 'destructive'
        })
        return
      }

      const client = clients.find(c => c.id === newCall.client_id)
      if (!client) return

      // ✅ FIXED: Use correct column names for insert
      const communicationData = {
        client_id: newCall.client_id,
        communication_type: 'call', // ✅ FIXED: was 'type'
        subject: newCall.subject || 'Phone Call',
        summary: newCall.summary, // ✅ FIXED: was 'content'
        communication_date: newCall.communication_date,
        direction: newCall.direction,
        contact_method: newCall.contact_method,
        requires_followup: newCall.requires_followup,
        followup_date: newCall.followup_date || null,
        followup_completed: false,
        created_by: user?.id,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('client_communications')
        .insert([communicationData])

      if (error) {
        throw new Error(`Failed to save call: ${error.message}`)
      }

      toast({
        title: 'Success',
        description: 'Call logged successfully',
        variant: 'default'
      })

      setShowNewCallModal(false)
      resetNewCallForm()
      loadCalls()

    } catch (error) {
      console.error('Error saving call:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save call',
        variant: 'destructive'
      })
    }
  }

  const resetNewCallForm = () => {
    setNewCall({
      client_id: '',
      subject: '',
      summary: '',
      communication_date: new Date().toISOString().slice(0, 16),
      direction: 'outbound',
      contact_method: 'phone',
      requires_followup: false,
      followup_date: ''
    })
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-UK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCallIcon = (direction: string, contactMethod: string) => {
    if (contactMethod === 'missed_call') return PhoneMissed
    if (direction === 'inbound') return PhoneIncoming
    if (direction === 'outbound') return PhoneOutgoing
    return Phone
  }

  const getDirectionBadge = (direction: string) => {
    const variants = {
      inbound: 'default',
      outbound: 'secondary'
    } as const

    return (
      <Badge variant={variants[direction as keyof typeof variants] || 'outline'}>
        {direction.toUpperCase()}
      </Badge>
    )
  }

  // Filter calls
  const filteredCalls = calls.filter(call => {
    const matchesSearch = searchTerm === '' || 
      call.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.client_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.summary.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDirection = filterDirection === 'all' || call.direction === filterDirection

    return matchesSearch && matchesDirection
  })

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Call Management</h1>
            <p className="text-gray-600">Track and manage all client phone communications</p>
          </div>
          <Button onClick={() => setShowNewCallModal(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Log Call</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold">{stats.totalCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PhoneCall className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completedCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PhoneMissed className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Missed</p>
                <p className="text-2xl font-bold">{stats.missedCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Follow-ups</p>
                <p className="text-2xl font-bold">{stats.followUpsNeeded}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold">{stats.todaysCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center space-x-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Calls List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls ({filteredCalls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No calls found</p>
              <p className="text-gray-400">Start by logging your first call</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCalls.map((call) => {
                const Icon = getCallIcon(call.direction, call.contact_method)
                return (
                  <div
                    key={call.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className={`p-2 rounded-lg ${
                      call.contact_method === 'missed_call' ? 'bg-red-100' :
                      call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        call.contact_method === 'missed_call' ? 'text-red-600' :
                        call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium">{call.client_name}</h3>
                          <span className="text-sm text-gray-500">({call.client_ref})</span>
                          {getDirectionBadge(call.direction)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(call.communication_date)}
                        </div>
                      </div>
                      
                      {call.subject && call.subject !== 'Phone Call' && (
                        <p className="text-sm font-medium text-gray-700 mt-1">{call.subject}</p>
                      )}
                      
                      {call.summary && (
                        <p className="text-sm text-gray-600 mt-1">{call.summary}</p>
                      )}
                      
                      {call.requires_followup && !call.followup_completed && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Calendar className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-orange-600">Follow-up required</span>
                          {call.followup_date && (
                            <span className="text-xs text-gray-500">
                              by {formatDate(call.followup_date)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Call Modal */}
      {showNewCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Log New Call</h3>
              <Button variant="ghost" onClick={() => setShowNewCallModal(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={newCall.client_id}
                  onChange={(e) => setNewCall({ ...newCall, client_id: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.personal_details.firstName} {client.personal_details.lastName} ({client.client_ref})
                    </option>
                  ))}
                </select>
              </div>

              {/* Call Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Call Direction
                  </label>
                  <select
                    value={newCall.direction}
                    onChange={(e) => setNewCall({ ...newCall, direction: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Method
                  </label>
                  <select
                    value={newCall.contact_method}
                    onChange={(e) => setNewCall({ ...newCall, contact_method: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="phone">Phone</option>
                    <option value="mobile">Mobile</option>
                    <option value="missed_call">Missed Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newCall.communication_date}
                  onChange={(e) => setNewCall({ ...newCall, communication_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newCall.subject}
                  onChange={(e) => setNewCall({ ...newCall, subject: e.target.value })}
                  placeholder="e.g., Portfolio Review, Investment Discussion..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Summary *
                </label>
                <textarea
                  value={newCall.summary}
                  onChange={(e) => setNewCall({ ...newCall, summary: e.target.value })}
                  placeholder="Summary of call discussion, outcomes, next steps..."
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newCall.requires_followup}
                    onChange={(e) => setNewCall({ ...newCall, requires_followup: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">Follow-up required</span>
                </label>
              </div>

              {newCall.requires_followup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={newCall.followup_date}
                    onChange={(e) => setNewCall({ ...newCall, followup_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowNewCallModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleNewCall}>
                Log Call
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}