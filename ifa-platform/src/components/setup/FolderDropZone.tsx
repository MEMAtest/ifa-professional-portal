'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, FolderOpen, AlertCircle } from 'lucide-react'
import { parseFileList, readDirectoryEntry } from '@/lib/folder-parser'
import type { ParsedClientFolder } from '@/types/bulk-setup'

interface FolderDropZoneProps {
  onParsed: (folders: ParsedClientFolder[]) => void
}

export function FolderDropZone({ onParsed }: FolderDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList) => {
      setError(null)
      if (fileList.length === 0) {
        setError('No files found in folder')
        return
      }

      let folders
      try {
        folders = parseFileList(fileList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse folder')
        return
      }

      if (folders.length === 0) {
        setError('No client folders detected')
        return
      }

      // Check if any folder has files
      const hasFiles = folders.some((f) => f.files.length > 0)
      if (!hasFiles) {
        setError('No files found in folder')
        return
      }

      onParsed(folders)
    },
    [onParsed]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setError(null)
      setLoading(true)

      try {
        const items = e.dataTransfer.items
        if (!items || items.length === 0) {
          setError('No files found in drop')
          setLoading(false)
          return
        }

        // Try to use webkitGetAsEntry for directory support
        const firstItem = items[0]
        const entry = firstItem.webkitGetAsEntry?.()

        if (entry && entry.isDirectory) {
          const files = await readDirectoryEntry(
            entry as FileSystemDirectoryEntry
          )
          if (files.length === 0) {
            setError('No files found in folder')
            setLoading(false)
            return
          }

          // Create a pseudo-FileList from the collected files
          const dt = new DataTransfer()
          for (const file of files) {
            dt.items.add(file)
          }
          handleFiles(dt.files)
        } else {
          // Fallback: use the regular files from the drop event
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files)
          } else {
            setError('Please drop a folder, not individual files')
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to read dropped folder'
        )
      } finally {
        setLoading(false)
      }
    },
    [handleFiles]
  )

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Select or drop a folder to upload client files"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[280px] p-8
          border-2 border-dashed rounded-xl
          transition-colors cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
          ${loading ? 'pointer-events-none opacity-60' : ''}
        `}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          // @ts-expect-error -- webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          className={`
          flex items-center justify-center w-16 h-16 rounded-full mb-4
          ${isDragging ? 'bg-blue-100' : 'bg-gray-200'}
        `}
        >
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          ) : isDragging ? (
            <FolderOpen className="h-8 w-8 text-blue-500" />
          ) : (
            <Upload className="h-8 w-8 text-gray-500" />
          )}
        </div>

        <p className="text-lg font-medium text-gray-700 mb-1">
          {loading
            ? 'Reading folder...'
            : isDragging
              ? 'Drop folder here'
              : 'Select or drop a folder'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Drag a client folder here, or click to browse
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Select Folder
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Supported: PDF, DOC, DOCX, XLSX, MSG, TXT, PNG, JPG, GIF
        </p>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
