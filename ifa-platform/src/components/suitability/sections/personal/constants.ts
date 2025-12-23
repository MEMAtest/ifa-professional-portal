import { Briefcase, Calendar, Heart, Users, User } from 'lucide-react'

export const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select...', disabled: true },
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Civil Partnership', label: 'Civil Partnership' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' }
]

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select...', disabled: true },
  { value: 'Employed', label: 'Employed Full-Time' },
  { value: 'Employed Part-Time', label: 'Employed Part-Time' },
  { value: 'Self-Employed', label: 'Self-Employed' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Not Working', label: 'Not Working' },
  { value: 'Student', label: 'Student' }
]

export const FIELD_ICONS = {
  client_name: User,
  date_of_birth: Calendar,
  marital_status: Heart,
  employment_status: Briefcase,
  dependents: Users
}

export const REQUIRED_FIELDS = ['client_name', 'date_of_birth', 'marital_status', 'employment_status']

