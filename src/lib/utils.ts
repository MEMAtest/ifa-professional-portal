import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { camelCase, snakeCase, isObject } from 'lodash'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Risk level utilities for IFA platform
export const getRiskLevelColor = (level: number | string): string => {
  const numLevel = typeof level === 'string' ? parseInt(level, 10) : level
  
  const colors: Record<number, string> = {
    1: 'bg-green-100 text-green-800 border-green-200', // Conservative
    2: 'bg-blue-100 text-blue-800 border-blue-200',    // Moderate
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Balanced
    4: 'bg-orange-100 text-orange-800 border-orange-200', // Adventurous
    5: 'bg-red-100 text-red-800 border-red-200'        // Speculative
  }
  
  return colors[numLevel] || colors[3] // Default to balanced
}

export const getRiskLevelName = (level: number | string): string => {
  const numLevel = typeof level === 'string' ? parseInt(level, 10) : level
  
  const names: Record<number, string> = {
    1: 'Conservative',
    2: 'Moderate', 
    3: 'Balanced',
    4: 'Adventurous',
    5: 'Speculative'
  }
  
  return names[numLevel] || 'Unknown'
}

export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) {
    return '£0.00'
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(numAmount)
}

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) {
    return 'Not set'
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(dateObj)
}

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) {
    return 'Not set'
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

export const calculateAge = (dateOfBirth: string | Date | null | undefined): number => {
  if (!dateOfBirth) return 0
  
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  
  if (isNaN(birthDate.getTime())) return 0

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return Math.max(0, age) // Ensure non-negative age
}

// Status utilities
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'prospect': 'bg-blue-100 text-blue-800 border-blue-200',
    'active': 'bg-green-100 text-green-800 border-green-200',
    'review_due': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'inactive': 'bg-gray-100 text-gray-800 border-gray-200',
    'archived': 'bg-red-100 text-red-800 border-red-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'overdue': 'bg-red-100 text-red-800 border-red-200'
  }
  
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
}

// ENHANCED Data Transformation Utilities with PostgreSQL JSONB support
export const toCamel = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(v => toCamel(v))
  }
  
  if (isObject(obj) && !(obj instanceof Date) && !(obj instanceof RegExp)) {
    return Object.keys(obj).reduce<Record<string, any>>((result, key) => {
      const camelKey = camelCase(key)
      let value = (obj as Record<string, any>)[key]
      
      // FIX: Handle PostgreSQL JSONB strings that need parsing
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value)
        } catch {
          // If parsing fails, keep as string
        }
      }
      
      result[camelKey] = toCamel(value)
      return result
    }, {})
  }
  
  return obj
}

export const toSnake = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(v => toSnake(v))
  }
  
  if (isObject(obj) && !(obj instanceof Date) && !(obj instanceof RegExp)) {
    return Object.keys(obj).reduce<Record<string, any>>((result, key) => {
      const snakeKey = snakeCase(key)
      result[snakeKey] = toSnake((obj as Record<string, any>)[key])
      return result
    }, {})
  }
  
  return obj
}

// String utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text
  }
  
  return text.slice(0, maxLength).trim() + '...'
}

export const capitalizeFirst = (str: string): string => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const formatPhone = (phone: string): string => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Format UK phone numbers
  if (digits.startsWith('44')) {
    // International format
    return `+${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
  } else if (digits.startsWith('0')) {
    // UK domestic format
    if (digits.length === 11) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`
    }
  }
  
  return phone // Return original if can't format
}

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPostcode = (postcode: string): boolean => {
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
  return postcodeRegex.test(postcode.trim())
}

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+44|0)[0-9]{10}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Number utilities
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

// Array utilities
export const groupBy = <T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFn(item)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export const sortBy = <T>(array: T[], keyFn: (item: T) => any, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a)
    const bVal = keyFn(b)
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Sleep utility for testing/development
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}