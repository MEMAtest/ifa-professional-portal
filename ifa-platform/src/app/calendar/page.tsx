// ============================================
// FILE: /src/app/calendar/page.tsx - COMPLETE PRODUCTION FIX
// ============================================
'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Plus,
  Clock,
  User,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Video,
  Phone,
  Coffee,
  Users,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  CircleDot
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client' // FIXED IMPORT
import { useToast } from '@/hooks/use-toast'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/modules/tasks'
import type { TaskWithDetails } from '@/modules/tasks'

// Meeting types with hex colors
const meetingTypes = [
  { value: 'initial_consultation', label: 'Initial Consultation', icon: Users, color: 'bg-blue-500', hex: '#3B82F6' },
  { value: 'review_meeting', label: 'Review Meeting', icon: FileText, color: 'bg-green-500', hex: '#10B981' },
  { value: 'phone_call', label: 'Phone Call', icon: Phone, color: 'bg-yellow-500', hex: '#F59E0B' },
  { value: 'video_call', label: 'Video Call', icon: Video, color: 'bg-purple-500', hex: '#8B5CF6' },
  { value: 'coffee_meeting', label: 'Coffee Meeting', icon: Coffee, color: 'bg-orange-500', hex: '#F97316' }
]

// Review types configuration
const reviewTypes = [
  { value: 'annual', label: 'Annual Review', icon: Calendar, color: 'bg-emerald-500', hex: '#10B981' },
  { value: 'periodic', label: 'Periodic Review', icon: RefreshCw, color: 'bg-blue-500', hex: '#3B82F6' },
  { value: 'regulatory', label: 'Regulatory Review', icon: Shield, color: 'bg-amber-500', hex: '#F59E0B' },
  { value: 'ad_hoc', label: 'Ad Hoc Review', icon: FileText, color: 'bg-purple-500', hex: '#8B5CF6' }
]

// Task priority colors for calendar display
const taskPriorityColors = {
  urgent: '#DC2626',    // red-600
  high: '#EA580C',      // orange-600
  medium: '#CA8A04',    // yellow-600
  low: '#16A34A',       // green-600
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  clientName: string
  clientId: string
  type: string
  location: string
  notes: string
  duration: number
  eventType?: string // 'meeting' | 'review' | 'task'
  color?: string
  status?: string
  relatedEntityType?: string
  relatedEntityId?: string
  // Task-specific properties
  taskPriority?: 'low' | 'medium' | 'high' | 'urgent'
  taskStatus?: string
  taskType?: string
}

interface Client {
  id: string
  client_ref: string
  personal_details: {
    firstName?: string
    lastName?: string
  }
}

// Add styles for tooltips
const tooltipStyles = `
  <style>
    .event-tooltip {
      position: relative;
    }
    
    .event-tooltip-content {
      visibility: hidden;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: normal;
      z-index: 1000;
      margin-bottom: 8px;
      min-width: 200px;
      max-width: 300px;
      text-align: left;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .event-tooltip:hover .event-tooltip-content {
      visibility: visible;
      opacity: 1;
    }
    
    .event-tooltip-content::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: rgba(0, 0, 0, 0.9);
    }
  </style>
`;

export default function CalendarPage() {

  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), []) // Create client instance
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<CalendarEvent[]>([])
  const [showTasks, setShowTasks] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    date: '',
    time: '',
    type: 'initial_consultation',
    location: '',
    duration: 60,
    notes: ''
  })

  // Inject tooltip styles
  useEffect(() => {
    const styleElement = document.createElement('div')
    styleElement.innerHTML = tooltipStyles
    document.head.appendChild(styleElement.querySelector('style')!)
    
    return () => {
      const style = document.head.querySelector('style')
      if (style && style.innerHTML.includes('event-tooltip')) {
        style.remove()
      }
    }
  }, [])

  // Handle month navigation
  const handleMonthChange = async (newDate: Date) => {
    setCurrentDate(newDate)
    await loadEvents()
  }

  const loadEvents = useCallback(async () => {
    // Get date range for the current month view
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), -7)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 7)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch events directly from Supabase
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        clients!calendar_events_client_id_fkey (
          id,
          client_ref,
          personal_details
        )
      `)
      .eq('user_id', user.id)
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString())
      .order('start_date', { ascending: true })

    if (!error && data) {
      // Format events for calendar display
      const formattedEvents = data.map((event: any) => {
        try {
          // Calculate duration from start and end times
          const duration = event.end_date ?
            Math.round((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 60000) :
            60
          
	          return {
	            id: event.id,
	            title: event.title,
	            description: event.description,
	            date: new Date(event.start_date).toISOString().split('T')[0],
	            time: new Date(event.start_date).toTimeString().slice(0, 5),
	            duration: duration,
	            clientId: event.client_id || '',
	            clientName: event.clients ? 
	              `${(event.clients.personal_details as any)?.firstName || ''} ${(event.clients.personal_details as any)?.lastName || ''}`.trim() || 'Unknown Client' : 
	              'Unknown Client',
	            clientRef: event.clients?.client_ref || '',
	            type: event.event_type || 'meeting',
	            location: '',
	            notes: event.description || '',
	            color: event.color || undefined,
	            status: 'scheduled',
	            eventType: event.event_type || undefined,
	            relatedEntityType: event.related_entity_type || undefined,
	            relatedEntityId: event.related_entity_id || undefined
	          }
        } catch (err) {
          console.error('Error formatting event:', err, event)
          // Return a basic version if formatting fails
	          return {
	            id: event.id,
	            title: event.title || 'Untitled Event',
	            description: event.description || '',
	            date: new Date().toISOString().split('T')[0],
	            time: '09:00',
	            duration: 60,
	            clientId: event.client_id || '',
	            clientName: 'Unknown Client',
	            clientRef: '',
	            type: 'meeting',
	            location: '',
	            notes: event.description || '',
	            color: event.color || '#6B7280',
	            status: 'scheduled',
	            eventType: event.event_type || undefined,
	            relatedEntityType: event.related_entity_type || undefined,
	            relatedEntityId: event.related_entity_id || undefined
	          }
        }
      })
      
      setEvents(formattedEvents)
    } else if (error) {
      console.error('Error loading events:', error)
    }
  }, [currentDate, supabase])

	  const loadClients = useCallback(async () => {
	    const { data, error } = await supabase
	      .from('clients')
	      .select('id, client_ref, personal_details')
	      .eq('status', 'active')

	    if (!error && data) {
	      const mappedClients: Client[] = (data as any[]).map((c) => ({
	        id: c.id,
	        client_ref: c.client_ref,
	        personal_details: (c.personal_details as any) || {}
	      }))

	      // Sort clients by name
	      const sortedClients = mappedClients.sort((a, b) => {
	        const aName = `${a.personal_details?.firstName || ''} ${a.personal_details?.lastName || ''}`.trim()
	        const bName = `${b.personal_details?.firstName || ''} ${b.personal_details?.lastName || ''}`.trim()
	        return aName.localeCompare(bName)
	      })
	      setClients(sortedClients)
	    }
	  }, [supabase])

  // Load tasks with due dates for the current month
  const loadTasks = useCallback(async () => {
    // Get date range for the current month view (with buffer for previous/next month overflow)
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), -7)
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 7)

    try {
      // Use server-side date filtering for efficiency
      const response = await fetch(
        `/api/tasks?` + new URLSearchParams({
          sortBy: 'due_date',
          sortOrder: 'asc',
          perPage: '500',
          dueAfter: startDate.toISOString(),
          dueBefore: endDate.toISOString(),
          status: 'pending,in_progress', // Exclude completed and cancelled
        })
      )

      if (!response.ok) {
        console.error('Failed to fetch tasks')
        return
      }

      const data = await response.json()
      // Tasks are already filtered by date range and status on the server
      const tasksWithDueDates = (data.tasks || []).filter((task: any) => task.dueDate)

      // Convert tasks to CalendarEvent format
      const taskEvents: CalendarEvent[] = tasksWithDueDates.map((task: any) => {
        const dueDate = new Date(task.dueDate)
        const priority = task.priority as 'low' | 'medium' | 'high' | 'urgent'

        return {
          id: task.id,
          title: task.title,
          date: dueDate.toISOString().split('T')[0],
          time: dueDate.toTimeString().slice(0, 5) || '09:00',
          clientId: task.clientId || '',
          clientName: task.clientFirstName && task.clientLastName
            ? `${task.clientFirstName} ${task.clientLastName}`.trim()
            : task.clientRef || 'No client',
          type: task.type || 'general',
          location: '',
          notes: task.description || '',
          duration: 30, // Default duration for tasks
          eventType: 'task',
          color: taskPriorityColors[priority] || taskPriorityColors.medium,
          status: task.status,
          relatedEntityType: 'task',
          relatedEntityId: task.id,
          taskPriority: priority,
          taskStatus: task.status,
          taskType: task.type,
        }
      })

      setTasks(taskEvents)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [currentDate])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadEvents(),
        loadClients(),
        loadTasks()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load calendar data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [loadClients, loadEvents, loadTasks, toast])

  // Initial load - runs once on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Get calendar grid
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    type CalendarDay = { date: Date; isCurrentMonth: boolean }
    const days: CalendarDay[] = []
    
    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    
    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    
    return days
  }

  const days = getDaysInMonth(currentDate)
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Navigation
  const goToPreviousMonth = () => {
    handleMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const goToNextMonth = () => {
    handleMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    handleMonthChange(new Date())
    setSelectedDate(new Date())
  }

  // Event functions
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const calendarEvents = events.filter(e => e.date === dateStr)
    const taskEvents = showTasks ? tasks.filter(t => t.date === dateStr) : []
    return [...calendarEvents, ...taskEvents].sort((a, b) => a.time.localeCompare(b.time))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleNewMeeting = () => {
    const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    setFormData({
      clientId: '',
      clientName: '',
      date: dateStr,
      time: '09:00',
      type: 'initial_consultation',
      location: 'Office',
      duration: 60,
      notes: ''
    })
    setEditingEvent(null)
    setShowMeetingModal(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    // If it's a task event, navigate to the tasks page
    if (event.eventType === 'task' && event.relatedEntityId) {
      router.push(`/tasks?taskId=${event.relatedEntityId}`)
      return
    }

    // If it's a review event, navigate to the review tab on client page
    if (event.eventType === 'review' && event.relatedEntityId) {
      router.push(`/clients/${event.clientId}?tab=reviews`)
      return
    }

    setFormData({
      clientId: event.clientId,
      clientName: event.clientName,
      date: event.date,
      time: event.time,
      type: event.type,
      location: event.location,
      duration: event.duration,
      notes: event.notes
    })
    setEditingEvent(event)
    setShowMeetingModal(true)
  }

  const handleSaveMeeting = async () => {
    if (!formData.clientId || !formData.date || !formData.time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const meetingType = meetingTypes.find(t => t.value === formData.type)
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + formData.duration * 60000)

      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: `${meetingType?.label} - ${formData.clientName}`,
            description: formData.notes,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            client_id: formData.clientId,
            event_type: 'meeting',
            color: meetingType?.hex || '#6B7280'
          })
          .eq('id', editingEvent.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new event
        const { error } = await supabase
          .from('calendar_events')
          .insert({
            user_id: user.id,
            title: `${meetingType?.label} - ${formData.clientName}`,
            description: formData.notes,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            all_day: false,
            event_type: 'meeting',
            client_id: formData.clientId,
            color: meetingType?.hex || '#6B7280',
            reminders: []
          })

        if (error) throw error
      }

      toast({
        title: 'Success',
        description: editingEvent ? 'Meeting updated successfully' : 'Meeting scheduled successfully',
        variant: 'default'
      })

      setShowMeetingModal(false)
      loadEvents()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save meeting',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
        variant: 'default'
      })

      loadEvents()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive'
      })
    }
  }

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value
    const client = clients.find(c => c.id === clientId)
    if (client) {
      const clientName = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Unnamed Client'
      setFormData({
        ...formData,
        clientId: client.id,
        clientName: clientName
      })
    }
  }

  // Get event type config (for meetings, reviews, and tasks)
  const getEventTypeConfig = (event: CalendarEvent) => {
    // For task events
    if (event.eventType === 'task') {
      const priority = event.taskPriority || 'medium'
      const priorityLabel = TASK_PRIORITY_LABELS[priority] || 'Medium'
      const typeLabel = event.taskType ? (TASK_TYPE_LABELS[event.taskType as keyof typeof TASK_TYPE_LABELS] || 'Task') : 'Task'
      return {
        label: `${typeLabel} (${priorityLabel})`,
        icon: CheckSquare,
        color: `bg-${priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : priority === 'low' ? 'green' : 'yellow'}-500`,
        hex: taskPriorityColors[priority] || taskPriorityColors.medium
      }
    }

    // For review events, try to determine the subtype from the title
    if (event.eventType === 'review') {
      if (event.title.includes('Annual')) {
        return { label: 'Annual Review', icon: Calendar, color: 'bg-emerald-500', hex: '#10B981' };
      } else if (event.title.includes('Periodic')) {
        return { label: 'Periodic Review', icon: RefreshCw, color: 'bg-blue-500', hex: '#3B82F6' };
      } else if (event.title.includes('Regulatory')) {
        return { label: 'Regulatory Review', icon: Shield, color: 'bg-amber-500', hex: '#F59E0B' };
      } else if (event.title.includes('Ad Hoc')) {
        return { label: 'Ad Hoc Review', icon: FileText, color: 'bg-purple-500', hex: '#8B5CF6' };
      }
      return { label: 'Review', icon: FileText, color: 'bg-gray-500', hex: '#6B7280' };
    }

    return meetingTypes.find(t => t.value === event.type) ||
      { label: 'Meeting', icon: Users, color: 'bg-gray-500', hex: '#6B7280' };
  };

  // Format tooltip content
  const getTooltipContent = (event: CalendarEvent) => {
    const config = getEventTypeConfig(event);
    let content = `${event.title}\n`;

    // For tasks, show priority and status
    if (event.eventType === 'task') {
      const priorityLabel = event.taskPriority ? (TASK_PRIORITY_LABELS[event.taskPriority] || event.taskPriority) : 'Medium'
      content += `Priority: ${priorityLabel}\n`;
      content += `Status: ${event.taskStatus || 'Pending'}\n`;
      if (event.notes) {
        content += `Description: ${event.notes.substring(0, 100)}${event.notes.length > 100 ? '...' : ''}\n`;
      }
      content += 'Click to view task details';
      return content;
    }

    content += `Time: ${event.time} (${event.duration} min)\n`;

    if (event.notes) {
      // Extract next review date if present
      const nextReviewMatch = event.notes.match(/Next Review: (.+)/);
      if (nextReviewMatch) {
        content += `Next Review: ${nextReviewMatch[1]}\n`;
      }

      // Add other notes
      const cleanNotes = event.notes.replace(/Next Review: .+\n?/, '');
      if (cleanNotes.trim()) {
        content += `Notes: ${cleanNotes.trim()}\n`;
      }
    }

    content += event.eventType === 'review' ? 'Click to view review details' : 'Click to edit';
    return content;
  };

  // Get selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-600">Schedule meetings and view upcoming client reviews</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold">{monthYear}</h2>
                <button 
                  onClick={goToToday}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Today
                </button>
              </div>
              
              <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = getEventsForDate(day.date)
                const isToday = day.date.toDateString() === new Date().toDateString()
                const isSelected = selectedDate?.toDateString() === day.date.toDateString()
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day.date)}
                    className={`
                      min-h-[100px] p-2 border-r border-b cursor-pointer hover:bg-gray-50 transition-colors
                      ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
                      ${isToday ? 'bg-yellow-50' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isToday ? 'text-yellow-700' : ''}
                      ${isSelected ? 'text-blue-700' : ''}
                    `}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Event indicators with tooltips */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, i) => {
                        const config = getEventTypeConfig(event)
                        const tooltipContent = getTooltipContent(event)
                        const isTask = event.eventType === 'task'

                        return (
                          <div
                            key={i}
                            className={`
                              text-xs p-1 rounded truncate text-white cursor-pointer event-tooltip
                              ${event.eventType === 'review' ? 'font-semibold' : ''}
                              ${isTask ? 'flex items-center gap-1' : ''}
                            `}
                            style={{ backgroundColor: event.color || config.hex || '#6B7280' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditEvent(event)
                            }}
                          >
                            {isTask ? (
                              <>
                                <CheckSquare className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{event.title}</span>
                              </>
                            ) : (
                              <>{event.time} - {event.clientName}</>
                            )}
                            <div className="event-tooltip-content">
                              {tooltipContent.split('\n').map((line, idx) => (
                                <div key={idx}>{line}</div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="space-y-6">
          {/* Selected Date Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select a date'}
              </h3>
              {selectedDate && (
                <button
                  onClick={handleNewMeeting}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Meeting</span>
                </button>
              )}
            </div>

            {/* Events for selected date */}
            {selectedDate && (
              <div className="space-y-3">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No events scheduled</p>
                ) : (
                  selectedDateEvents.map(event => {
                    const config = getEventTypeConfig(event)
                    const Icon = config.icon
                    const isTask = event.eventType === 'task'

                    return (
                      <div
                        key={event.id}
                        className={`border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors ${isTask ? 'border-l-4' : ''}`}
                        style={isTask ? { borderLeftColor: event.color || config.hex } : {}}
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg`}
                            style={{ backgroundColor: event.color || config.hex || '#6B7280' }}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            {isTask ? (
                              // Task display
                              <>
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{event.title}</h4>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    event.taskStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                    event.taskStatus === 'pending' ? 'bg-gray-100 text-gray-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {event.taskStatus || 'pending'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {config.label}
                                </p>
                                {event.clientName && event.clientName !== 'No client' && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Client: {event.clientName}
                                  </p>
                                )}
                                {event.notes && (
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {event.notes}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center text-xs text-blue-600">
                                  <CheckSquare className="h-3 w-3 mr-1" />
                                  Click to view task details
                                </div>
                              </>
                            ) : (
                              // Meeting/Review display
                              <>
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{event.clientName}</h4>
                                  <span className="text-sm text-gray-500">
                                    {event.time} ({event.duration} min)
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {config.label}
                                </p>
                                {event.notes && (
                                  <div className="text-sm text-gray-600 mt-2">
                                    {event.notes.split('\n').map((line, idx) => {
                                      if (line.startsWith('Next Review:')) {
                                        return (
                                          <p key={idx} className="font-medium text-blue-600">
                                            {line}
                                          </p>
                                        );
                                      }
                                      return line.trim() ? (
                                        <p key={idx} className="italic">&quot;{line.trim()}&quot;</p>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                                {event.eventType === 'review' && (
                                  <div className="mt-2 flex items-center text-xs text-blue-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Click to view review details
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">This Month</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Events</span>
                <span className="font-medium">{events.length + (showTasks ? tasks.length : 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client Reviews</span>
                <span className="font-medium text-green-600">
                  {events.filter(e => e.eventType === 'review').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Meetings</span>
                <span className="font-medium">
                  {events.filter(e => e.eventType !== 'review').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tasks Due</span>
                <span className="font-medium text-amber-600">
                  {tasks.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Consultations</span>
                <span className="font-medium">
                  {events.filter(e => e.type === 'initial_consultation').length}
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">Event Types</h3>
            <div className="space-y-2">
              {/* Tasks section with toggle */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-700">Tasks</div>
                <button
                  onClick={() => setShowTasks(!showTasks)}
                  className={`text-xs px-2 py-1 rounded ${showTasks ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {showTasks ? 'Showing' : 'Hidden'}
                </button>
              </div>
              {showTasks && (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: taskPriorityColors.urgent }}></div>
                    <span>Urgent Priority</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: taskPriorityColors.high }}></div>
                    <span>High Priority</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: taskPriorityColors.medium }}></div>
                    <span>Medium Priority</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: taskPriorityColors.low }}></div>
                    <span>Low Priority</span>
                  </div>
                </>
              )}
              <div className="text-sm font-medium text-gray-700 mb-1 mt-3">Reviews</div>
              {reviewTypes.map(type => (
                <div key={type.value} className="flex items-center space-x-2 text-sm">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: type.hex }}
                  ></div>
                  <span>{type.label}</span>
                </div>
              ))}
              <div className="text-sm font-medium text-gray-700 mb-1 mt-3">Meetings</div>
              {meetingTypes.map(type => (
                <div key={type.value} className="flex items-center space-x-2 text-sm">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: type.hex }}
                  ></div>
                  <span>{type.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingEvent ? 'Edit Meeting' : 'New Meeting'}
              </h3>
              <button
                onClick={() => setShowMeetingModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={handleClientSelect}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => {
                    const clientName = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Unnamed Client'
                    return (
                      <option key={client.id} value={client.id}>
                        {clientName} ({client.client_ref})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {meetingTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Meeting agenda, preparation notes..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between mt-6">
              {editingEvent && !editingEvent.relatedEntityType && (
                <button
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  Delete
                </button>
              )}
              <div className="flex space-x-3 ml-auto">
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeeting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
