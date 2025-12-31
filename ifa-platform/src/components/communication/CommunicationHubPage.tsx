// app/communication/page.tsx
// Unified Communication Hub - consolidates Messages, Calls, Calendar, and Inbox
'use client'

import React, { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  Clock,
  Plus,
  Send,
  PhoneCall,
  Search,
  RefreshCw,
  PhoneIncoming,
  PhoneOutgoing,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { meetingTypes } from '@/components/communication/constants'
import { getDaysInMonth, getEventsForDate } from '@/lib/communication/calendar'
import { formatRelativeDate } from '@/lib/communication/formatters'
import { getCommunicationIcon } from '@/lib/communication/ui'
import type { CommunicationDirectionFilter, CommunicationTypeFilter } from '@/lib/communication/filters'
import type { TabType } from '@/components/communication/types'
import { useCommunicationHubData } from '@/components/communication/hooks/useCommunicationHubData'
import { useCommunicationFilters } from '@/components/communication/hooks/useCommunicationFilters'

export default function CommunicationHubPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Tab state - read from URL or default to overview
  const initialTab = (searchParams.get('tab') as TabType) || 'overview'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  const {
    communications,
    calendarEvents,
    clients,
    loading,
    stats,
    currentDate,
    selectedDate,
    setSelectedDate,
    handleMonthChange,
    refresh
  } = useCommunicationHubData({ supabase, userId: user?.id })

  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterDirection,
    setFilterDirection,
    filteredCommunications,
    followUps,
    messages,
    calls
  } = useCommunicationFilters(communications)

  // Modal states
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [showNewCallModal, setShowNewCallModal] = useState(false)
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false)

  // Form states
  const [newMessage, setNewMessage] = useState({
    client_id: '',
    subject: '',
    summary: '',
    contact_method: 'email',
    requires_followup: false,
    followup_date: ''
  })

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

  const [newMeeting, setNewMeeting] = useState({
    clientId: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'initial_consultation',
    duration: 60,
    notes: ''
  })

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    router.push(`/communication?tab=${tab}`, { scroll: false })
  }

  // Handle form submissions
  const handleSendMessage = async () => {
    try {
      if (!newMessage.client_id || !newMessage.summary.trim()) {
        toast({
          title: 'Error',
          description: 'Please select a client and enter a message',
          variant: 'destructive'
        })
        return
      }

      const client = clients.find(c => c.id === newMessage.client_id)
      if (!client) return

      const { error } = await supabase
        .from('client_communications')
        .insert([{
          client_id: newMessage.client_id,
          communication_type: 'email',
          subject: newMessage.subject || 'No Subject',
          summary: newMessage.summary,
          communication_date: new Date().toISOString(),
          direction: 'outbound',
          contact_method: newMessage.contact_method,
          requires_followup: newMessage.requires_followup,
          followup_date: newMessage.followup_date || null,
          followup_completed: false,
          created_by: user?.id || '',
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      toast({ title: 'Success', description: 'Message sent successfully' })
      setShowNewMessageModal(false)
      setNewMessage({ client_id: '', subject: '', summary: '', contact_method: 'email', requires_followup: false, followup_date: '' })
      refresh()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    }
  }

  const handleLogCall = async () => {
    try {
      if (!newCall.client_id || !newCall.summary.trim()) {
        toast({
          title: 'Error',
          description: 'Please select a client and enter call details',
          variant: 'destructive'
        })
        return
      }

      const { error } = await supabase
        .from('client_communications')
        .insert([{
          client_id: newCall.client_id,
          communication_type: 'call',
          subject: newCall.subject || 'Phone Call',
          summary: newCall.summary,
          communication_date: newCall.communication_date,
          direction: newCall.direction,
          contact_method: newCall.contact_method,
          requires_followup: newCall.requires_followup,
          followup_date: newCall.followup_date || null,
          followup_completed: false,
          created_by: user?.id || '',
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      toast({ title: 'Success', description: 'Call logged successfully' })
      setShowNewCallModal(false)
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
      refresh()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to log call', variant: 'destructive' })
    }
  }

  const handleScheduleMeeting = async () => {
    try {
      if (!newMeeting.clientId || !newMeeting.date || !newMeeting.time) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        })
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      const meetingType = meetingTypes.find(t => t.value === newMeeting.type)
      const startDateTime = new Date(`${newMeeting.date}T${newMeeting.time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + newMeeting.duration * 60000)

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: currentUser.id,
          title: `${meetingType?.label} - ${newMeeting.clientName}`,
          description: newMeeting.notes,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          all_day: false,
          event_type: 'meeting',
          client_id: newMeeting.clientId,
          color: meetingType?.hex || '#6B7280',
          reminders: []
        })

      if (error) throw error

      toast({ title: 'Success', description: 'Meeting scheduled successfully' })
      setShowNewMeetingModal(false)
      setNewMeeting({
        clientId: '',
        clientName: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'initial_consultation',
        duration: 60,
        notes: ''
      })
      refresh()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to schedule meeting', variant: 'destructive' })
    }
  }

  const handleClientSelect = (clientId: string, formType: 'message' | 'call' | 'meeting') => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      const clientName = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim()
      if (formType === 'message') {
        setNewMessage({ ...newMessage, client_id: clientId })
      } else if (formType === 'call') {
        setNewCall({ ...newCall, client_id: clientId })
      } else {
        setNewMeeting({ ...newMeeting, clientId, clientName })
      }
    }
  }

  // Tab definitions
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Mail },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare, count: stats.messages },
    { id: 'calls' as TabType, label: 'Calls', icon: Phone, count: stats.calls },
    { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar, count: stats.upcomingMeetings },
    { id: 'follow-ups' as TabType, label: 'Follow-ups', icon: Clock, count: stats.followUpsNeeded },
  ]

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Communication Hub</h1>
            <p className="text-gray-600">Manage all client communications in one place</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowNewMessageModal(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button variant="outline" onClick={() => setShowNewCallModal(true)}>
              <PhoneCall className="h-4 w-4 mr-2" />
              Log Call
            </Button>
            <Button onClick={() => setShowNewMeetingModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.totalCommunications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Messages</p>
                <p className="text-2xl font-bold">{stats.messages}</p>
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
              <Calendar className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Meetings</p>
                <p className="text-2xl font-bold">{stats.upcomingMeetings}</p>
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
              <CheckCircle className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold">{stats.todayItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge variant={activeTab === tab.id ? 'default' : 'secondary'} className="ml-2">
                    {tab.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filters for Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search communications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as CommunicationTypeFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  <option value="all">All Types</option>
                  <option value="call">Calls</option>
                  <option value="email">Messages</option>
                </select>
                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value as CommunicationDirectionFilter)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  <option value="all">All Directions</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => refresh()} className="w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity ({filteredCommunications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No communications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCommunications.slice(0, 20).map((comm) => {
                    const Icon = getCommunicationIcon(comm.communication_type, comm.direction)
                    return (
                      <div
                        key={comm.id}
                        className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/clients/${comm.client_id}`)}
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
                              <Badge variant={comm.communication_type === 'call' ? 'default' : 'secondary'}>
                                {comm.communication_type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {comm.direction === 'inbound' ? 'IN' : 'OUT'}
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">{formatRelativeDate(comm.communication_date)}</span>
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
      )}

      {activeTab === 'messages' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Messages ({messages.length})</CardTitle>
              <Button onClick={() => setShowNewMessageModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{msg.client_name}</h3>
                        <span className="text-sm text-gray-500">{formatRelativeDate(msg.communication_date)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{msg.subject}</p>
                      {msg.summary && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.summary}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'calls' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Calls ({calls.length})</CardTitle>
              <Button onClick={() => setShowNewCallModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Call
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No calls found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {calls.map((call) => {
                  const Icon = call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
                  return (
                    <div
                      key={call.id}
                      className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className={`p-2 rounded-lg ${
                        call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{call.client_name}</h3>
                            <Badge variant="outline">{call.direction.toUpperCase()}</Badge>
                          </div>
                          <span className="text-sm text-gray-500">{formatRelativeDate(call.communication_date)}</span>
                        </div>
                        {call.summary && (
                          <p className="text-sm text-gray-600 mt-1">{call.summary}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'calendar' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button onClick={() => handleMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold">
                      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                      onClick={() => { handleMonthChange(new Date()); setSelectedDate(new Date()) }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Today
                    </button>
                  </div>
                  <button onClick={() => handleMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 border-t border-l">
                  {getDaysInMonth(currentDate).map((day, index) => {
                    const dayEvents = getEventsForDate(day.date, calendarEvents)
                    const isToday = day.date.toDateString() === new Date().toDateString()
                    const isSelected = selectedDate?.toDateString() === day.date.toDateString()

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(day.date)}
                        className={`
                          min-h-[80px] p-2 border-r border-b cursor-pointer hover:bg-gray-50
                          ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                          ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
                          ${isToday ? 'bg-yellow-50' : ''}
                        `}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-yellow-700' : ''}`}>
                          {day.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event, i) => (
                            <div
                              key={i}
                              className="text-xs p-1 rounded truncate text-white"
                              style={{ backgroundColor: event.color || '#6B7280' }}
                            >
                              {event.time} - {event.clientName}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Events */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Select a date'}
                  </CardTitle>
                  {selectedDate && (
                    <Button size="sm" onClick={() => setShowNewMeetingModal(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedDate && getEventsForDate(selectedDate, calendarEvents).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No events</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDate && getEventsForDate(selectedDate, calendarEvents).map(event => (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }} />
                          <span className="font-medium">{event.clientName}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.time} ({event.duration} min)</p>
                        <p className="text-sm text-gray-500">{event.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'follow-ups' && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups Required ({followUps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">All caught up! No follow-ups required.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {followUps.map((item) => {
                  const Icon = getCommunicationIcon(item.communication_type, item.direction)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center space-x-4 p-4 border border-orange-200 bg-orange-50 rounded-lg"
                    >
                      <div className="p-2 rounded-lg bg-orange-100">
                        <Icon className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{item.client_name}</h3>
                          <div className="flex items-center space-x-2">
                            {item.followup_date && (
                              <span className="text-sm text-orange-600">
                                Due: {formatRelativeDate(item.followup_date)}
                              </span>
                            )}
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              {item.communication_type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{item.subject}</p>
                        {item.summary && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.summary}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Compose New Message</h3>
              <button onClick={() => setShowNewMessageModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={newMessage.client_id}
                  onChange={(e) => handleClientSelect(e.target.value, 'message')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.personal_details?.firstName} {client.personal_details?.lastName} ({client.client_ref})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Message subject..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={newMessage.summary}
                  onChange={(e) => setNewMessage({ ...newMessage, summary: e.target.value })}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newMessage.requires_followup}
                    onChange={(e) => setNewMessage({ ...newMessage, requires_followup: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Follow-up required</span>
                </label>
              </div>

              {newMessage.requires_followup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={newMessage.followup_date}
                    onChange={(e) => setNewMessage({ ...newMessage, followup_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowNewMessageModal(false)}>Cancel</Button>
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Call Modal */}
      {showNewCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Log New Call</h3>
              <button onClick={() => setShowNewCallModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={newCall.client_id}
                  onChange={(e) => handleClientSelect(e.target.value, 'call')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.personal_details?.firstName} {client.personal_details?.lastName} ({client.client_ref})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                  <select
                    value={newCall.direction}
                    onChange={(e) => setNewCall({ ...newCall, direction: e.target.value as 'inbound' | 'outbound' })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newCall.communication_date}
                    onChange={(e) => setNewCall({ ...newCall, communication_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newCall.subject}
                  onChange={(e) => setNewCall({ ...newCall, subject: e.target.value })}
                  placeholder="e.g., Portfolio Review, Investment Discussion..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Summary *</label>
                <textarea
                  value={newCall.summary}
                  onChange={(e) => setNewCall({ ...newCall, summary: e.target.value })}
                  placeholder="Summary of call discussion, outcomes, next steps..."
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newCall.requires_followup}
                    onChange={(e) => setNewCall({ ...newCall, requires_followup: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Follow-up required</span>
                </label>
              </div>

              {newCall.requires_followup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
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
              <Button variant="outline" onClick={() => setShowNewCallModal(false)}>Cancel</Button>
              <Button onClick={handleLogCall}>
                <PhoneCall className="h-4 w-4 mr-2" />
                Log Call
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Modal */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Schedule Meeting</h3>
              <button onClick={() => setShowNewMeetingModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={newMeeting.clientId}
                  onChange={(e) => handleClientSelect(e.target.value, 'meeting')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => {
                    const name = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim()
                    return (
                      <option key={client.id} value={client.id}>
                        {name || 'Unnamed'} ({client.client_ref})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
                <select
                  value={newMeeting.type}
                  onChange={(e) => setNewMeeting({ ...newMeeting, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {meetingTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  value={newMeeting.duration}
                  onChange={(e) => setNewMeeting({ ...newMeeting, duration: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newMeeting.notes}
                  onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                  placeholder="Meeting agenda, preparation notes..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowNewMeetingModal(false)}>Cancel</Button>
              <Button onClick={handleScheduleMeeting}>
                <Save className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
