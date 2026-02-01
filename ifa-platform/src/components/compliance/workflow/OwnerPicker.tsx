'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OwnerOption {
  id: string
  first_name: string | null
  last_name: string | null
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

  useEffect(() => {
    let isMounted = true
    const loadOwners = async () => {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .order('first_name')

      if (firmId) {
        query = query.eq('firm_id', firmId)
      }

      const { data } = await query
      if (isMounted) {
        setOwners(data || [])
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
      className={`w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none ${
        compact ? 'py-1 text-xs' : ''
      }`}
    >
      <option value="">Unassigned</option>
      {owners.map((owner) => {
        const name = `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Unknown'
        return (
          <option key={owner.id} value={owner.id}>
            {name}
          </option>
        )
      })}
    </select>
  )
}
