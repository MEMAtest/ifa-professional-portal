'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'

const TAGS = [
  'pdf',
  'word-document',
  'spreadsheet',
  'email',
  'correspondence',
  'image',
  'text',
  'identification',
  'tax',
  'pension',
  'insurance',
  'bank-statement',
  'estate-planning',
  'property',
  'investment',
]

const TAG_COLORS: Record<string, string> = {
  pdf: 'bg-red-100 text-red-700',
  'word-document': 'bg-blue-100 text-blue-700',
  spreadsheet: 'bg-green-100 text-green-700',
  email: 'bg-purple-100 text-purple-700',
  correspondence: 'bg-purple-100 text-purple-700',
  image: 'bg-amber-100 text-amber-700',
  text: 'bg-gray-100 text-gray-700',
  identification: 'bg-cyan-100 text-cyan-700',
  tax: 'bg-orange-100 text-orange-700',
  pension: 'bg-teal-100 text-teal-700',
  insurance: 'bg-indigo-100 text-indigo-700',
  'bank-statement': 'bg-emerald-100 text-emerald-700',
  'estate-planning': 'bg-rose-100 text-rose-700',
  property: 'bg-lime-100 text-lime-700',
  investment: 'bg-sky-100 text-sky-700',
}

interface TagEditorProps {
  documentId: string
  currentTags: string[]
  onTagsUpdated?: () => void
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  for (const item of b) {
    if (!setA.has(item)) return false
  }
  return true
}

export function TagEditor({ documentId, currentTags, onTagsUpdated }: TagEditorProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentTags || [])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const initialRef = useRef<string[]>(currentTags || [])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSelected(currentTags || [])
    initialRef.current = currentTags || []
  }, [documentId, currentTags])

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  const normalizedSelection = useMemo(
    () => Array.from(new Set(selected)).sort(),
    [selected]
  )

  const flashError = useCallback((message: string) => {
    setSaveError(message)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setSaveError(null), 2000)
  }, [])

  const applyTags = useCallback(async () => {
    if (arraysEqual(normalizedSelection, initialRef.current)) return
    setSaving(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: normalizedSelection }),
      })
      if (!response.ok) {
        throw new Error('Failed to save tags')
      }
      initialRef.current = normalizedSelection
      onTagsUpdated?.()
    } catch {
      flashError('Failed to save tags')
      throw new Error('Failed to save tags')
    } finally {
      setSaving(false)
    }
  }, [documentId, normalizedSelection, onTagsUpdated, flashError])

  const closeAndSave = useCallback(async () => {
    try {
      await applyTags()
      setOpen(false)
    } catch {
      // Error already surfaced via flashError
    }
  }, [applyTags])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return
      closeAndSave().catch(() => {
        // Error handled in closeAndSave
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, closeAndSave])

  const toggleTag = (tag: string) => {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div ref={rootRef} className="relative inline-flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {normalizedSelection.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
            TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {tag}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
        title="Add tags"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-3">
          <div className="max-h-56 overflow-auto space-y-2">
            {TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={selected.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tag}
                </span>
              </label>
            ))}
          </div>
          {saveError && (
            <div className="mt-2 text-xs text-red-600">{saveError}</div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSelected(initialRef.current)
                setOpen(false)
              }}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void closeAndSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
