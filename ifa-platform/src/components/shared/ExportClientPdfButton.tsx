'use client'

// =====================================================
// FILE: src/components/shared/ExportClientPdfButton.tsx
// Centralized UI component for client PDF exports
// Single component for all export buttons across the app
// =====================================================

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'
import {
  useExportClientPdf,
  type ClientPdfPreset,
  type ClientPdfKind
} from '@/hooks/useExportClientPdf'

export interface ExportClientPdfButtonProps {
  /** Client ID to export */
  clientId: string
  /** Client reference/token for filename (e.g., client name or ref number) */
  clientToken: string
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Whether to show dropdown with options or just a single button */
  showDropdown?: boolean
  /** Default preset if showDropdown is false */
  defaultPreset?: ClientPdfPreset
  /** Whether to open in new tab by default */
  openInNewTab?: boolean
  /** Custom button label */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Callback after successful export */
  onExportSuccess?: (kind: ClientPdfKind) => void
  /** Callback on export error */
  onExportError?: (error: Error) => void
  /** Whether the button is disabled */
  disabled?: boolean
}

/**
 * Centralized button component for exporting client PDFs
 * Use this component throughout the app for consistent export UX
 */
export function ExportClientPdfButton({
  clientId,
  clientToken,
  variant = 'outline',
  size = 'default',
  showDropdown = true,
  defaultPreset = 'profile',
  openInNewTab = false,
  label,
  className,
  onExportSuccess,
  onExportError,
  disabled = false
}: ExportClientPdfButtonProps) {
  const { toast } = useToast()
  const [localOpenInNewTab, setLocalOpenInNewTab] = useState(openInNewTab)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { exportPdf, exportPreset, isLoading, currentKind } = useExportClientPdf({
    onSuccess: (kind) => {
      const kindLabel = kind === 'profile' ? 'Client Profile' : 'Print Pack'
      toast({
        title: 'Export Complete',
        description: `${kindLabel} has been ${localOpenInNewTab ? 'opened in a new tab' : 'downloaded'}.`
      })
      onExportSuccess?.(kind)
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error.message || 'An error occurred while exporting.',
        variant: 'destructive'
      })
      onExportError?.(error)
    }
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportSingle = async (kind: ClientPdfKind) => {
    setIsDropdownOpen(false)
    await exportPdf({
      clientId,
      clientToken,
      kind,
      openInNewTab: localOpenInNewTab
    })
  }

  const handleExportPreset = async (preset: ClientPdfPreset) => {
    setIsDropdownOpen(false)
    await exportPreset({
      clientId,
      clientToken,
      preset,
      openInNewTab: localOpenInNewTab
    })
  }

  const handleSimpleClick = async () => {
    await handleExportPreset(defaultPreset)
  }

  const getLoadingLabel = () => {
    if (!currentKind) return 'Exporting...'
    return currentKind === 'profile' ? 'Exporting Profile...' : 'Exporting Print Pack...'
  }

  // Simple button without dropdown
  if (!showDropdown) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleSimpleClick}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {getLoadingLabel()}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {label || 'Export PDF'}
          </>
        )}
      </Button>
    )
  }

  // Dropdown button with options
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isLoading}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {getLoadingLabel()}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            {label || 'Export'}
            <ChevronDown className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {isDropdownOpen && !isLoading && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Export Options
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />

            <button
              onClick={() => handleExportSingle('profile')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Client Profile
            </button>

            <button
              onClick={() => handleExportSingle('print_pack')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Client Print Pack
            </button>

            <hr className="border-gray-200 dark:border-gray-700" />

            <button
              onClick={() => handleExportPreset('both')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Both
            </button>

            <hr className="border-gray-200 dark:border-gray-700" />

            <button
              onClick={() => setLocalOpenInNewTab(!localOpenInNewTab)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="mr-2">{localOpenInNewTab ? '✓' : '○'}</span>
              Open in New Tab
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportClientPdfButton
