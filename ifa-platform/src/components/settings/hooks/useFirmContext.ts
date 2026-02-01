import { useCallback, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

const isValidFirmId = (value?: string | null) => {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

interface UseFirmContextOptions {
  supabase: SupabaseClient
  userId?: string
  userFirmId?: string | null
}

export const useFirmContext = ({ supabase, userId, userFirmId }: UseFirmContextOptions) => {
  const [firmId, setFirmId] = useState<string | null>(null)

  const resolveFirmId = useCallback((override?: string | null) => {
    if (isValidFirmId(override)) return override || null
    if (isValidFirmId(firmId)) return firmId
    if (isValidFirmId(userFirmId)) return userFirmId || null
    return null
  }, [firmId, userFirmId])

  const resolveFirmIdFromAuth = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser()
    const authUser = authData?.user
    const metadataFirmId = authUser?.user_metadata?.firm_id || authUser?.user_metadata?.firmId
    if (isValidFirmId(metadataFirmId)) {
      setFirmId(metadataFirmId)
      return metadataFirmId
    }

    const lookupUserId = authUser?.id || userId
    if (lookupUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', lookupUserId)
        .maybeSingle()
      if (profile?.firm_id && isValidFirmId(profile.firm_id)) {
        setFirmId(profile.firm_id)
        return profile.firm_id
      }
    }

    return null
  }, [supabase, userId])

  return useMemo(() => ({
    firmId,
    setFirmId,
    resolveFirmId,
    resolveFirmIdFromAuth
  }), [firmId, resolveFirmId, resolveFirmIdFromAuth])
}
