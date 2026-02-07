export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: true })
    }

    const supabase: any = getSupabaseServiceClient()
    const normalizedEmail = email.toLowerCase()
    const emailParts = normalizedEmail.split('@')
    if (emailParts.length !== 2 || !emailParts[1]) {
      return NextResponse.json({ ok: true })
    }
    const emailDomain = emailParts[1]

    // Find the user's firm
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!profile?.firm_id) {
      // No profile — nothing to restrict
      return NextResponse.json({ ok: true })
    }

    // Check firm's allowed domains
    const { data: firm } = await supabase
      .from('firms')
      .select('settings')
      .eq('id', profile.firm_id)
      .single()

    const allowedDomains: string[] = (firm?.settings as any)?.allowedDomains || []

    if (allowedDomains.length > 0 && !allowedDomains.some((d: string) => d.toLowerCase() === emailDomain)) {
      return NextResponse.json(
        { error: 'Domain restricted', message: 'Your email domain is not authorized to access this firm. Please use your company email.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Fail secure — deny access on unexpected errors
    return NextResponse.json(
      { error: 'Unable to verify domain', message: 'Please try again.' },
      { status: 500 }
    )
  }
}
