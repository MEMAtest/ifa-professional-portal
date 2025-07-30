// app/messages/page.tsx
// ✅ FIXED VERSION - Uses correct database columns
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter,
  MoreVertical,
  Reply,
  Plus,
  User,
  Clock,
  Mail
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

// Types based on actual database schema
interface Message {
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

interface MessageThread {
  client_id: string
  client_name: string
  client_ref: string
  last_message_date: string
  message_count: number
  unread_count: number
  messages: Message[]
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const messageEndRef = useRef<HTMLDivElement>(null)

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [showCompose, setShowCompose] = useState(false)

  // Compose message state
  const [newMessage, setNewMessage] = useState({
    client_id: '',
    subject: '',
    summary: '',
    contact_method: 'email',
    requires_followup: false,
    followup_date: ''
  })

  // Stats
  const [stats, setStats] = useState({
    totalMessages: 0,
    unreadMessages: 0,
    todayMessages: 0,
    followUpsNeeded: 0
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  useEffect(() => {
    if (selectedThread) {
      scrollToBottom()
    }
  }, [selectedThread])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadMessages(),
        loadClients()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
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
      .eq('communication_type', 'email') // ✅ FIXED: was 'type'
      .order('communication_date', { ascending: false })
      .limit(200)

    if (error) {
      throw new Error(`Failed to load messages: ${error.message}`)
    }

    // Transform data to Message format
    const messageData: Message[] = (communicationData || []).map(comm => ({
      id: comm.id,
      client_id: comm.client_id,
      client_name: `${comm.clients.personal_details.firstName} ${comm.clients.personal_details.lastName}`,
      client_ref: comm.clients.client_ref,
      communication_type: comm.communication_type,
      subject: comm.subject || 'No Subject',
      summary: comm.summary || '', // ✅ FIXED: was 'content'
      communication_date: comm.communication_date,
      direction: comm.direction || 'outbound',
      contact_method: comm.contact_method || 'email',
      requires_followup: comm.requires_followup || false,
      followup_date: comm.followup_date,
      followup_completed: comm.followup_completed || false,
      created_at: comm.created_at
    }))

    setMessages(messageData)
    organizeIntoThreads(messageData)
    calculateStats(messageData)
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

  const organizeIntoThreads = (messageData: Message[]) => {
    const threadMap = new Map<string, MessageThread>()

    messageData.forEach(message => {
      const clientId = message.client_id
      
      if (!threadMap.has(clientId)) {
        threadMap.set(clientId, {
          client_id: clientId,
          client_name: message.client_name,
          client_ref: message.client_ref,
          last_message_date: message.communication_date,
          message_count: 0,
          unread_count: 0,
          messages: []
        })
      }

      const thread = threadMap.get(clientId)!
      thread.messages.push(message)
      thread.message_count = thread.messages.length
      thread.last_message_date = message.communication_date
      
      // Count unread (inbound messages that don't require followup as a proxy for unread)
      if (message.direction === 'inbound' && message.requires_followup) {
        thread.unread_count++
      }
    })

    // Sort threads by last message date
    const threadArray = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime()
    )

    setThreads(threadArray)
  }

  const calculateStats = (messageData: Message[]) => {
    const today = new Date().toDateString()
    const unread = messageData.filter(m => m.direction === 'inbound' && m.requires_followup)
    const todayMsgs = messageData.filter(m => new Date(m.communication_date).toDateString() === today)
    const followUps = messageData.filter(m => m.requires_followup && !m.followup_completed)

    setStats({
      totalMessages: messageData.length,
      unreadMessages: unread.length,
      todayMessages: todayMsgs.length,
      followUpsNeeded: followUps.length
    })
  }

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

      // ✅ FIXED: Use correct column names for insert
      const communicationData = {
        client_id: newMessage.client_id,
        communication_type: 'email', // ✅ FIXED: was 'type'
        subject: newMessage.subject || 'No Subject',
        summary: newMessage.summary, // ✅ FIXED: was 'content'
        communication_date: new Date().toISOString(),
        direction: 'outbound',
        contact_method: newMessage.contact_method,
        requires_followup: newMessage.requires_followup,
        followup_date: newMessage.followup_date || null,
        followup_completed: false,
        created_by: user?.id,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('client_communications')
        .insert([communicationData])

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`)
      }

      toast({
        title: 'Success',
        description: 'Message sent successfully',
        variant: 'default'
      })

      setShowCompose(false)
      resetComposeForm()
      loadMessages()

    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      })
    }
  }

  const resetComposeForm = () => {
    setNewMessage({
      client_id: '',
      subject: '',
      summary: '',
      contact_method: 'email',
      requires_followup: false,
      followup_date: ''
    })
  }

  const handleReply = (message: Message) => {
    setNewMessage({
      client_id: message.client_id,
      subject: message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`,
      summary: '',
      contact_method: 'email',
      requires_followup: false,
      followup_date: ''
    })
    setShowCompose(true)
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
      return date.toLocaleDateString('en-UK')
    }
  }

  const getDirectionBadge = (direction: string) => {
    const variants = {
      inbound: 'default',
      outbound: 'secondary'
    } as const

    return (
      <Badge variant={variants[direction as keyof typeof variants] || 'outline'} className="text-xs">
        {direction.toUpperCase()}
      </Badge>
    )
  }

  // Filter threads
  const filteredThreads = threads.filter(thread => {
    const matchesSearch = searchTerm === '' || 
      thread.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.client_ref.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterDirection === 'all' ||
      thread.messages.some(m => m.direction === filterDirection)

    return matchesSearch && matchesFilter
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
            <p className="text-gray-600">Secure messaging with clients</p>
          </div>
          <Button onClick={() => setShowCompose(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Compose</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Need Follow-up</p>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold">{stats.todayMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Follow-ups Due</p>
                <p className="text-2xl font-bold">{stats.followUpsNeeded}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>Conversations</span>
                  <Badge variant="secondary">{filteredThreads.length}</Badge>
                </CardTitle>
              </div>
              
              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Messages</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No conversations found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.client_id}
                      onClick={() => setSelectedThread(thread)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedThread?.client_id === thread.client_id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium truncate ${
                              thread.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {thread.client_name}
                            </h3>
                            <span className="text-xs text-gray-500">({thread.client_ref})</span>
                          </div>
                          
                          {thread.messages.length > 0 && (
                            <p className={`text-sm truncate mt-1 ${
                              thread.unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                            }`}>
                              {thread.messages[0].subject}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(thread.last_message_date)}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Badge variant="outline" className="text-xs">
                                {thread.message_count}
                              </Badge>
                              {thread.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          {selectedThread ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedThread.client_name}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedThread.client_ref} • {selectedThread.message_count} messages
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedThread.messages.length > 0 && handleReply(selectedThread.messages[0])}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {selectedThread.messages
                    .sort((a, b) => new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime())
                    .map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-3/4 rounded-lg p-3 ${
                        message.direction === 'outbound'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium">
                              {message.direction === 'outbound' ? 'You' : message.client_name}
                            </span>
                            {getDirectionBadge(message.direction)}
                          </div>
                          <span className="text-xs opacity-75">
                            {formatDate(message.communication_date)}
                          </span>
                        </div>
                        
                        {message.subject && (
                          <div className="text-sm font-medium mb-2">
                            {message.subject}
                          </div>
                        )}
                        
                        <div className="text-sm whitespace-pre-wrap">
                          {message.summary}
                        </div>

                        {message.requires_followup && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs opacity-75">
                              Follow-up required
                              {message.followup_date && ` by ${formatDate(message.followup_date)}`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a conversation to view messages</p>
                <p className="text-gray-400">Choose from the list on the left</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Compose New Message</h3>
              <Button variant="ghost" onClick={() => setShowCompose(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={newMessage.client_id}
                  onChange={(e) => setNewMessage({ ...newMessage, client_id: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Message subject..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Method
                </label>
                <select
                  value={newMessage.contact_method}
                  onChange={(e) => setNewMessage({ ...newMessage, contact_method: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="secure_message">Secure Message</option>
                  <option value="letter">Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={newMessage.summary}
                  onChange={(e) => setNewMessage({ ...newMessage, summary: e.target.value })}
                  placeholder="Type your message here..."
                  rows={8}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newMessage.requires_followup}
                    onChange={(e) => setNewMessage({ ...newMessage, requires_followup: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">Follow-up required</span>
                </label>
              </div>

              {newMessage.requires_followup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
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
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Send Message</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}