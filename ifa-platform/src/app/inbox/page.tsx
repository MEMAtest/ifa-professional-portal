// app/inbox/page.tsx
// ✅ NEW PAGE - Fixes 404 error, combines calls and messages
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Inbox,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  User,
  Search,
  Filter,
  MoreVertical,
  Reply,
  Archive,
  Star,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

// Types based on actual database schema
interface CommunicationItem {
  id: string
  client_id: string
  client_name: string
  client_ref: string
  communication_type: string
  subject: string
  summary: string
  communication_date: string
  direction: string
  contact_method: string
  requires_followup: boolean
  followup_date?: string
  followup_completed: boolean
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
    email: string
    phone: string
  }
}

export default function InboxPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [communications, setCommunications] = useState<CommunicationItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'call' | 'email'>('all')
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [filterFollowUp, setFilterFollowUp] = useState<'all' | 'needed' | 'completed'>('all')

  // Stats
  const [stats, setStats] = useState({
    totalCommunications: 0,
    calls: 0,
    emails: 0,
    followUpsNeeded: 0,
    todayItems: 0
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      await loadCommunications()
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load inbox data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCommunications = async () => {
    // ✅ Load all communications (calls and emails)
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
      .in('communication_type', ['call', 'email'])
      .order('communication_date', { ascending: false })
      .limit(200)

    if (error) {
      throw new Error(`Failed to load communications: ${error.message}`)
    }

    // Transform data
    const communicationItems: CommunicationItem[] = (communicationData || []).map(comm => ({
      id: comm.id,
      client_id: comm.client_id,
      client_name: `${comm.clients.personal_details.firstName} ${comm.clients.personal_details.lastName}`,
      client_ref: comm.clients.client_ref,
      communication_type: comm.communication_type,
      subject: comm.subject || (comm.communication_type === 'call' ? 'Phone Call' : 'Email'),
      summary: comm.summary || '',
      communication_date: comm.communication_date,
      direction: comm.direction || 'outbound',
      contact_method: comm.contact_method || comm.communication_type,
      requires_followup: comm.requires_followup || false,
      followup_date: comm.followup_date,
      followup_completed: comm.followup_completed || false,
      created_at: comm.created_at
    }))

    setCommunications(communicationItems)
    calculateStats(communicationItems)
  }

  const calculateStats = (communicationData: CommunicationItem[]) => {
    const today = new Date().toDateString()
    const calls = communicationData.filter(c => c.communication_type === 'call')
    const emails = communicationData.filter(c => c.communication_type === 'email')
    const followUps = communicationData.filter(c => c.requires_followup && !c.followup_completed)
    const todayItems = communicationData.filter(c => 
      new Date(c.communication_date).toDateString() === today
    )

    setStats({
      totalCommunications: communicationData.length,
      calls: calls.length,
      emails: emails.length,
      followUpsNeeded: followUps.length,
      todayItems: todayItems.length
    })
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      return `${Math.round(diffMs / (1000 * 60))}m ago`
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`
    } else if (diffHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-UK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  const getCommunicationIcon = (type: string, direction: string) => {
    if (type === 'call') {
      return direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
    }
    return Mail
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      call: 'default',
      email: 'secondary'
    } as const

    const colors = {
      call: 'text-green-600',
      email: 'text-blue-600'
    }

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const getDirectionBadge = (direction: string) => {
    const variants = {
      inbound: 'outline',
      outbound: 'secondary'
    } as const

    return (
      <Badge variant={variants[direction as keyof typeof variants] || 'outline'} className="text-xs">
        {direction === 'inbound' ? 'IN' : 'OUT'}
      </Badge>
    )
  }

  const handleItemClick = (item: CommunicationItem) => {
    if (item.communication_type === 'call') {
      router.push('/calls')
    } else {
      router.push('/messages')
    }
  }

  const handleViewClient = (clientId: string) => {
    router.push(`/clients/${clientId}`)
  }

  // Filter communications
  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = searchTerm === '' || 
      comm.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.client_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.summary.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || comm.communication_type === filterType
    const matchesDirection = filterDirection === 'all' || comm.direction === filterDirection
    
    const matchesFollowUp = filterFollowUp === 'all' ||
      (filterFollowUp === 'needed' && comm.requires_followup && !comm.followup_completed) ||
      (filterFollowUp === 'completed' && comm.followup_completed)

    return matchesSearch && matchesType && matchesDirection && matchesFollowUp
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Inbox</h1>
            <p className="text-gray-600">All client communications in one place</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push('/calls')}>
              <Phone className="h-4 w-4 mr-2" />
              Calls
            </Button>
            <Button variant="outline" onClick={() => router.push('/messages')}>
              <Mail className="h-4 w-4 mr-2" />
              Messages
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Inbox className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{stats.totalCommunications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Calls</p>
                <p className="text-2xl font-bold">{stats.calls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Emails</p>
                <p className="text-2xl font-bold">{stats.emails}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
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
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold">{stats.todayItems}</p>
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
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="call">Calls</option>
              <option value="email">Emails</option>
            </select>

            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>

            <select
              value={filterFollowUp}
              onChange={(e) => setFilterFollowUp(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Follow-ups</option>
              <option value="needed">Needs Follow-up</option>
              <option value="completed">Follow-up Complete</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Communications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Communications ({filteredCommunications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCommunications.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No communications found</p>
              <p className="text-gray-400">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCommunications.map((comm) => {
                const Icon = getCommunicationIcon(comm.communication_type, comm.direction)
                return (
                  <div
                    key={comm.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleItemClick(comm)}
                  >
                    <div className={`p-2 rounded-lg ${
                      comm.communication_type === 'call' 
                        ? (comm.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100')
                        : 'bg-purple-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        comm.communication_type === 'call'
                          ? (comm.direction === 'inbound' ? 'text-green-600' : 'text-blue-600')
                          : 'text-purple-600'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium">{comm.client_name}</h3>
                          <span className="text-sm text-gray-500">({comm.client_ref})</span>
                          {getTypeBadge(comm.communication_type)}
                          {getDirectionBadge(comm.direction)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatDate(comm.communication_date)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewClient(comm.client_id)
                            }}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {comm.subject && (
                        <p className="text-sm font-medium text-gray-700 mt-1">{comm.subject}</p>
                      )}
                      
                      {comm.summary && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comm.summary}</p>
                      )}
                      
                      {comm.requires_followup && !comm.followup_completed && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-orange-600">Follow-up required</span>
                          {comm.followup_date && (
                            <span className="text-xs text-gray-500">
                              by {formatDate(comm.followup_date)}
                            </span>
                          )}
                        </div>
                      )}

                      {comm.followup_completed && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Star className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600">Follow-up completed</span>
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
    </div>
  )
}