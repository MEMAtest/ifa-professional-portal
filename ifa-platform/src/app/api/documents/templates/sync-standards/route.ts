export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { rateLimit } from '@/lib/security/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'
import { ensurePlanneticSigningTemplatesInstalled } from '@/lib/documents/standardTemplates/installPlanneticSigningTemplates'

type SyncStandardsRequest = {
  assessmentTypes?: string[]
  force?: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rateLimitResponse = await rateLimit(request, 'api')
    if (rateLimitResponse) return rateLimitResponse

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) return firmResult
    const { firmId } = firmResult

    const body = (await parseRequestBody(request)) as Partial<SyncStandardsRequest>
    const assessmentTypes = Array.isArray(body.assessmentTypes)
      ? body.assessmentTypes.map((v) => String(v || '').trim()).filter(Boolean)
      : undefined
    const force = body.force === true

    const supabase = getSupabaseServiceClient()

    const result = await ensurePlanneticSigningTemplatesInstalled({
      supabase,
      firmId,
      userId: auth.context.userId,
      assessmentTypes,
      syncUpdates: true,
      force
    })

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    log.error('Error syncing standard templates', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

