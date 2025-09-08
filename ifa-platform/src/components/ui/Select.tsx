// =====================================================
// FILE: /src/components/ui/Select.tsx
// COMPLETE PRODUCTION-READY SELECT COMPONENT
// =====================================================

'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

// =====================================================
// CONTEXT FOR SELECT STATE
// =====================================================

interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  disabled?: boolean
}

const SelectContext = createContext<SelectContextType | undefined>(undefined)

const useSelectContext = () => {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

// =====================================================
// MAIN SELECT COMPONENT
// =====================================================

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  disabled = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, disabled }}>
      <div ref={selectRef} className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// =====================================================
// SELECT TRIGGER COMPONENT
// =====================================================

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = ''
}) => {
  const { open, setOpen, disabled } = useSelectContext()

  return (
    <button
      type="button"
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md",
        "shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
        "flex items-center justify-between",
        "hover:bg-gray-50 transition-colors",
        disabled && "opacity-50 cursor-not-allowed bg-gray-100",
        className
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      {children}
      <svg
        className={cn(
          "w-4 h-4 transition-transform ml-2 flex-shrink-0",
          open && "rotate-180"
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M19 9l-7 7-7-7" 
        />
      </svg>
    </button>
  )
}

// =====================================================
// SELECT VALUE COMPONENT
// =====================================================

interface SelectValueProps {
  placeholder?: string
  className?: string
}

export const SelectValue: React.FC<SelectValueProps> = ({ 
  placeholder = "Select an option",
  className = ""
}) => {
  const { value } = useSelectContext()
  
  return (
    <span className={cn(
      value ? "text-gray-900" : "text-gray-500",
      className
    )}>
      {value || placeholder}
    </span>
  )
}

// =====================================================
// SELECT CONTENT COMPONENT
// =====================================================

interface SelectContentProps {
  children: React.ReactNode
  className?: string
  position?: 'top' | 'bottom'
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = '',
  position = 'bottom'
}) => {
  const { open, setOpen } = useSelectContext()
  const [isPositioned, setIsPositioned] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Position dropdown to avoid viewport overflow
  useEffect(() => {
    if (open && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      if (spaceBelow < 100 && spaceAbove > spaceBelow) {
        contentRef.current.style.bottom = '100%'
        contentRef.current.style.top = 'auto'
        contentRef.current.style.marginBottom = '0.25rem'
        contentRef.current.style.marginTop = '0'
      } else {
        contentRef.current.style.top = '100%'
        contentRef.current.style.bottom = 'auto'
        contentRef.current.style.marginTop = '0.25rem'
        contentRef.current.style.marginBottom = '0'
      }
      setIsPositioned(true)
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 sm:hidden"
        onClick={() => setOpen(false)}
      />
      
      {/* Dropdown content */}
      <div
        ref={contentRef}
        className={cn(
          "absolute left-0 right-0 z-50",
          "bg-white border border-gray-300 rounded-md shadow-lg",
          "max-h-60 overflow-auto",
          "animate-in fade-in-0 zoom-in-95",
          !isPositioned && "opacity-0",
          className
        )}
        role="listbox"
      >
        {children}
      </div>
    </>
  )
}

// =====================================================
// SELECT ITEM COMPONENT
// =====================================================

interface SelectItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  disabled = false,
  className = ''
}) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
  const isSelected = selectedValue === value

  const handleClick = () => {
    if (!disabled) {
      onValueChange(value)
      setOpen(false)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-3 py-2 cursor-pointer transition-colors",
        "hover:bg-gray-100 active:bg-gray-200",
        isSelected && "bg-blue-50 text-blue-700 font-medium",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-between">
        {children}
        {isSelected && (
          <svg
            className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </div>
  )
}

// =====================================================
// SELECT GROUP (OPTIONAL) FOR GROUPED OPTIONS
// =====================================================

interface SelectGroupProps {
  children: React.ReactNode
  label?: string
  className?: string
}

export const SelectGroup: React.FC<SelectGroupProps> = ({
  children,
  label,
  className = ''
}) => {
  return (
    <div className={cn("py-1", className)}>
      {label && (
        <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

// =====================================================
// SELECT SEPARATOR (OPTIONAL)
// =====================================================

export const SelectSeparator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  return (
    <div className={cn("h-px bg-gray-200 my-1", className)} />
  )
}

// =====================================================
// EXPORTS
// =====================================================

export default Select