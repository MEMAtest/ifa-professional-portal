// app/calendar/page.tsx
'use client'
import React, { useState } from 'react'
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
  Users
} from 'lucide-react'

// Meeting types
const meetingTypes = [
  { value: 'initial_consultation', label: 'Initial Consultation', icon: Users, color: 'bg-blue-500' },
  { value: 'review_meeting', label: 'Review Meeting', icon: FileText, color: 'bg-green-500' },
  { value: 'phone_call', label: 'Phone Call', icon: Phone, color: 'bg-yellow-500' },
  { value: 'video_call', label: 'Video Call', icon: Video, color: 'bg-purple-500' },
  { value: 'coffee_meeting', label: 'Coffee Meeting', icon: Coffee, color: 'bg-orange-500' }
]

// Mock clients for demo
const mockClients = [
  { id: '1', name: 'Geoffrey Clarkson', ref: 'C250626917' },
  { id: '2', name: 'Sarah Mitchell', ref: 'C250625166' },
  { id: '3', name: 'Robert Chen', ref: 'C250624155' },
  { id: '4', name: 'New Client', ref: 'NEW' }
]

interface Meeting {
  id: string
  date: string
  time: string
  clientName: string
  clientId: string
  type: string
  location: string
  notes: string
  duration: number
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([
    // Sample meetings for demo
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      clientName: 'Geoffrey Clarkson',
      clientId: '1',
      type: 'review_meeting',
      location: 'Office',
      notes: 'Annual review discussion',
      duration: 60
    }
  ])
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  
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

  // Get calendar grid
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
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
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Meeting functions
  const getMeetingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return meetings.filter(m => m.date === dateStr)
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
      location: '',
      duration: 60,
      notes: ''
    })
    setEditingMeeting(null)
    setShowMeetingModal(true)
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setFormData({
      clientId: meeting.clientId,
      clientName: meeting.clientName,
      date: meeting.date,
      time: meeting.time,
      type: meeting.type,
      location: meeting.location,
      duration: meeting.duration,
      notes: meeting.notes
    })
    setEditingMeeting(meeting)
    setShowMeetingModal(true)
  }

  const handleSaveMeeting = () => {
    if (!formData.clientName || !formData.date || !formData.time) {
      alert('Please fill in all required fields')
      return
    }

    const meeting: Meeting = {
      id: editingMeeting?.id || Date.now().toString(),
      ...formData
    }

    if (editingMeeting) {
      setMeetings(meetings.map(m => m.id === meeting.id ? meeting : m))
    } else {
      setMeetings([...meetings, meeting])
    }

    setShowMeetingModal(false)
  }

  const handleDeleteMeeting = (id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      setMeetings(meetings.filter(m => m.id !== id))
    }
  }

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value
    const client = mockClients.find(c => c.id === clientId)
    if (client) {
      setFormData({
        ...formData,
        clientId: client.id,
        clientName: client.name
      })
    }
  }

  // Get selected date meetings
  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : []

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-600">Schedule meetings and manage appointments with clients</p>
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
                const dayMeetings = getMeetingsForDate(day.date)
                const isToday = day.date.toDateString() === new Date().toDateString()
                const isSelected = selectedDate?.toDateString() === day.date.toDateString()
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day.date)}
                    className={`
                      min-h-[100px] p-2 border-r border-b cursor-pointer hover:bg-gray-50
                      ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
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
                    
                    {/* Meeting indicators */}
                    <div className="space-y-1">
                      {dayMeetings.slice(0, 3).map((meeting, i) => {
                        const meetingType = meetingTypes.find(t => t.value === meeting.type)
                        return (
                          <div
                            key={i}
                            className={`
                              text-xs p-1 rounded truncate
                              ${meetingType?.color || 'bg-gray-500'} text-white
                            `}
                          >
                            {meeting.time} - {meeting.clientName}
                          </div>
                        )
                      })}
                      {dayMeetings.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayMeetings.length - 3} more
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

            {/* Meetings for selected date */}
            {selectedDate && (
              <div className="space-y-3">
                {selectedDateMeetings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No meetings scheduled</p>
                ) : (
                  selectedDateMeetings.map(meeting => {
                    const meetingType = meetingTypes.find(t => t.value === meeting.type)
                    const Icon = meetingType?.icon || Users
                    
                    return (
                      <div
                        key={meeting.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleEditMeeting(meeting)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${meetingType?.color || 'bg-gray-500'}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{meeting.clientName}</h4>
                              <span className="text-sm text-gray-500">
                                {meeting.time} ({meeting.duration} min)
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {meetingType?.label}
                            </p>
                            {meeting.location && (
                              <p className="text-sm text-gray-500 mt-1 flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {meeting.location}
                              </p>
                            )}
                            {meeting.notes && (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                "{meeting.notes}"
                              </p>
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
                <span className="text-gray-600">Total Meetings</span>
                <span className="font-medium">{meetings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client Reviews</span>
                <span className="font-medium">
                  {meetings.filter(m => m.type === 'review_meeting').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Consultations</span>
                <span className="font-medium">
                  {meetings.filter(m => m.type === 'initial_consultation').length}
                </span>
              </div>
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
                {editingMeeting ? 'Edit Meeting' : 'New Meeting'}
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
                  Client
                </label>
                <select
                  value={formData.clientId}
                  onChange={handleClientSelect}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {mockClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.ref})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Office, Zoom link, client address..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
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
              {editingMeeting && (
                <button
                  onClick={() => handleDeleteMeeting(editingMeeting.id)}
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