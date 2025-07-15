'use client'
import { useState } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => supabaseBrowser)

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
}
