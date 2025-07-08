// src/components/ui/Badge.tsx
import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent',
    outline: 'text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    success: 'bg-green-500 text-white hover:bg-green-600 border-transparent',
    warning: 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600 border-transparent'
  }

  // Fallback to basic Tailwind classes if the design token classes don't work
  const fallbackClasses = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100',
    success: 'bg-green-500 text-white hover:bg-green-600',
    warning: 'bg-yellow-500 text-yellow-900 hover:bg-yellow-600'
  }

  return (
    <div className={`${baseClasses} ${fallbackClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}