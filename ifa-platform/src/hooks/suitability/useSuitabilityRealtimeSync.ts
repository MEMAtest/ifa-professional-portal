import { useCallback, useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { isSupabaseRealtimeEnabled } from '@/lib/supabase/realtime'
import type { RealtimeSyncEvent } from '@/types/suitability'
import clientLogger from '@/lib/logging/clientLogger'

export function useSuitabilityRealtimeSync(params: {
  supabase: SupabaseClient | null
  enabled: boolean
  clientId: string | null
  onRemoteFieldUpdate: (event: RealtimeSyncEvent) => void
}) {
  const { supabase, enabled, clientId, onRemoteFieldUpdate } = params
  const syncSubscriptionRef = useRef<any>(null)

  const broadcastUpdate = useCallback(
    (event: Omit<RealtimeSyncEvent, 'timestamp' | 'userId'> & { userId?: string }) => {
      if (!enabled || !clientId || !supabase) return
      if (!isSupabaseRealtimeEnabled()) return
      if (!syncSubscriptionRef.current) return

      const payload: RealtimeSyncEvent = {
        ...event,
        timestamp: new Date().toISOString(),
        userId: event.userId || 'current_user_id'
      } as RealtimeSyncEvent

      try {
        syncSubscriptionRef.current.send({
          type: 'broadcast',
          event: 'field_update',
          payload
        })
      } catch (error) {
        clientLogger.error('Broadcast error:', error)
      }
    },
    [clientId, enabled, supabase]
  )

  useEffect(() => {
    if (!enabled || !clientId || !supabase) return
    if (!isSupabaseRealtimeEnabled()) return

    const channel = supabase
      .channel(`suitability_${clientId}`)
      .on('broadcast', { event: 'field_update' }, (payload) => {
        const event = payload.payload as RealtimeSyncEvent
        if (!event) return
        if (event.userId === 'current_user_id') return
        onRemoteFieldUpdate(event)
      })
      .subscribe()

    syncSubscriptionRef.current = channel

    return () => {
      try {
        channel.unsubscribe()
      } finally {
        syncSubscriptionRef.current = null
      }
    }
  }, [clientId, enabled, onRemoteFieldUpdate, supabase])

  useEffect(() => {
    return () => {
      if (syncSubscriptionRef.current) {
        try {
          syncSubscriptionRef.current.unsubscribe()
        } finally {
          syncSubscriptionRef.current = null
        }
      }
    }
  }, [])

  return { broadcastUpdate }
}

