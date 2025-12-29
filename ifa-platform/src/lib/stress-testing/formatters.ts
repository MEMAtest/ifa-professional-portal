import type { Client } from '@/types/client'

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '£0'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const getClientInitials = (client: Client): string => {
  const firstName = client.personalDetails?.firstName || ''
  const lastName = client.personalDetails?.lastName || ''
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  return initials || 'XX'
}

export const getClientAge = (client: Client): number => {
  if (client.personalDetails?.dateOfBirth) {
    const dob = new Date(client.personalDetails.dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1
    }
    return age
  }
  return 45
}
