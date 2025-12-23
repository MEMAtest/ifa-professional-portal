'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

export const Card = ({
  children,
  className = '',
  onClick
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) => (
  <div
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${
      onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
    } ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)

export const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        variants[variant as keyof typeof variants] || variants.default
      }`}
    >
      {children}
    </span>
  )
}

export const Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
  loading = false
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: string
  size?: string
  className?: string
  loading?: boolean
}) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  }

  const sizes = {
    default: 'px-4 py-2',
    sm: 'px-3 py-1.5 text-sm',
    lg: 'px-6 py-3'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-lg font-medium transition-colors inline-flex items-center ${
        variants[variant as keyof typeof variants] || variants.default
      } ${sizes[size as keyof typeof sizes] || sizes.default} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}

export const Alert = ({
  children,
  variant = 'default',
  className = ''
}: {
  children: React.ReactNode
  variant?: string
  className?: string
}) => {
  const variants = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }

  return (
    <div className={`p-4 rounded-lg border ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>
      {children}
    </div>
  )
}

