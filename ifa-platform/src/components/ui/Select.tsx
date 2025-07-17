// ===================================================================
// FIXED SELECT COMPONENT - No Duplicate Exports
// File: src/components/ui/Select.tsx
// ===================================================================

'use client'

import React, { createContext, useContext, useState } from 'react'

// Context for Select state
interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = createContext<SelectContextType | undefined>(undefined)

const useSelectContext = () => {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

// Main Select component
interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export const Select: React.FC<SelectProps> = ({ 
  value, 
  onValueChange, 
  children, 
  className = '' 
}) => {
  const [open, setOpen] = useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={`relative ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// Select Trigger component
interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  className = '' 
}) => {
  const { open, setOpen } = useSelectContext()

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`
        w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md 
        shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        flex items-center justify-between
        ${className}
      `}
    >
      {children}
      <svg
        className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

// Select Value component
interface SelectValueProps {
  placeholder?: string
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = useSelectContext()
  
  return (
    <span className={value ? 'text-gray-900' : 'text-gray-500'}>
      {value || placeholder}
    </span>
  )
}

// Select Content component
interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export const SelectContent: React.FC<SelectContentProps> = ({ 
  children, 
  className = '' 
}) => {
  const { open, setOpen } = useSelectContext()

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-10" 
        onClick={() => setOpen(false)}
      />
      {/* Content */}
      <div className={`
        absolute top-full left-0 right-0 z-20 mt-1 
        bg-white border border-gray-300 rounded-md shadow-lg
        max-h-60 overflow-auto
        ${className}
      `}>
        {children}
      </div>
    </>
  )
}

// Select Item component
interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export const SelectItem: React.FC<SelectItemProps> = ({ 
  value, 
  children, 
  className = '' 
}) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
  const isSelected = selectedValue === value

  const handleClick = () => {
    onValueChange(value)
    setOpen(false)
  }

  return (
    <div
      onClick={handleClick}
      className={`
        px-3 py-2 cursor-pointer hover:bg-gray-100
        ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
        ${className}
      `}
    >
      {children}
    </div>
  )
}