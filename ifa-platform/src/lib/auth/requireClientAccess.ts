import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'
import { canAccessClient, ROLES, type AuthContext } from '@/lib/auth/apiAuth'

type RequireClientAccessArgs = {
  supabase: SupabaseClient<Database>
  clientId: string
  ctx: AuthContext
  select?: string
}

export async function requireClientAccess({ supabase, clientId, ctx, select = '*' }: RequireClientAccessArgs) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select(select)
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
  }

  if (ctx.role !== ROLES.ADMIN && ctx.role !== ROLES.OWNER) {
    if (ctx.firmId && (client as any).firm_id && ctx.firmId !== (client as any).firm_id) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if ((client as any).advisor_id && !canAccessClient(ctx, String((client as any).advisor_id))) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  return { ok: true as const, client }
}
