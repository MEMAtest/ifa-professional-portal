export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isUUID } from '@/lib/utils'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'
import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'
import { buildFieldPrompt } from '@/lib/suitability/ai/fieldPrompts'
import { isAIGeneratableField } from '@/lib/suitability/ai/fieldRegistry'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  fieldId: z.string(),
  formData: z.record(z.any()),
  pulledData: z.record(z.any()).optional()
})

const extractGeneratedText = (content: string): string => {
  const trimmed = content?.trim()
  if (!trimmed) return ''

  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed?.generatedText === 'string') return parsed.generatedText.trim()
    if (typeof parsed?.text === 'string') return parsed.text.trim()
    if (typeof parsed === 'string') return parsed.trim()
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(trimmed.slice(start, end + 1))
        if (typeof parsed?.generatedText === 'string') return parsed.generatedText.trim()
        if (typeof parsed?.text === 'string') return parsed.text.trim()
      } catch {
        // fall through to raw content
      }
    }
  }

  return trimmed
}

export async function POST(
  request: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!

    const { assessmentId } = params
    if (!assessmentId || !isUUID(assessmentId)) {
      return NextResponse.json({ error: 'Invalid assessmentId format' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = requestSchema.parse(body)

    if (!isAIGeneratableField(parsed.fieldId)) {
      return NextResponse.json({ error: 'Unsupported fieldId' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const access = await requireClientAccess({
      supabase,
      clientId: parsed.clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const { data: assessment, error: assessmentError } = await supabase
      .from('suitability_assessments')
      .select('id,client_id')
      .eq('id', assessmentId)
      .maybeSingle()

    if (assessmentError) {
      log.warn('Field AI generation: assessment lookup failed', {
        assessmentId,
        error: assessmentError.message
      })
      return NextResponse.json({ error: 'Assessment lookup failed' }, { status: 500 })
    }

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.client_id !== parsed.clientId) {
      return NextResponse.json({ error: 'Assessment does not belong to client' }, { status: 403 })
    }

    const formData = parsed.formData as SuitabilityFormData
    const pulledData = parsed.pulledData as PulledPlatformData | undefined
    const prompt = buildFieldPrompt({ fieldId: parsed.fieldId, formData, pulledData })

    const aiUrl = new URL('/api/ai/complete', request.url)
    const aiResponse = await fetch(aiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': ctx.userId
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.3,
        max_tokens: 900
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '')
      log.warn('Field AI generation failed', { status: aiResponse.status, errorText })
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })
    }

    const aiPayload = await aiResponse.json()
    const generatedText = extractGeneratedText(aiPayload?.content || '')

    if (!generatedText) {
      return NextResponse.json({ error: 'AI response was empty' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      fieldId: parsed.fieldId,
      generatedText,
      provider: aiPayload?.provider
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    log.error('Field AI generation error', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
