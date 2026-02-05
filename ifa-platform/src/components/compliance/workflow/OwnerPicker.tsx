'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import clientLogger from '@/lib/logging/clientLogger'

interface OwnerOption {
  id: string
  full_name: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url: string | null
}

interface OwnerPickerProps {
  value?: string | null
  firmId?: string | null
  onChange: (value: string | null) => void
  compact?: boolean
}

export default function OwnerPicker({ value, firmId, onChange, compact }: OwnerPickerProps) {
  const supabase = createClient()
  const [owners, setOwners] = useState<OwnerOption[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadOwners = async () => {
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .order('full_name')

        if (firmId) {
          query = query.eq('firm_id', firmId)
        }

        const { data, error: queryError } = await query
        if (!isMounted) return
        if (queryError) {
          clientLogger.error('OwnerPicker: Failed to load profiles', queryError)
          setError(true)
          return
        }
        setOwners(data || [])
        setError(false)
      } catch (err) {
        if (isMounted) {
          clientLogger.error('OwnerPicker: Unexpected error', err)
          setError(true)
        }
      }
    }

    loadOwners()
    return () => {
      isMounted = false
    }
  }, [supabase, firmId])

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Assign owner"
      className={`w-full rounded-md border bg-white px-2 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none ${
        error ? 'border-red-300' : 'border-gray-200'
      } ${compact ? 'py-1 text-xs' : ''}`}
    >
      <option value="">{error ? 'Failed to load' : 'Unassigned'}</option>
      {owners.map((owner) => {
        const name = owner.full_name || `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Unknown'
        return (
          <option key={owner.id} value={owner.id}>
            {name}
          </option>
        )
      })}
    </select>
  )
}
