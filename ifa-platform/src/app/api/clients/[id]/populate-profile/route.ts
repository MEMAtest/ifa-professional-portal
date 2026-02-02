// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Auto-populate client profile fields from analysed documents (bulk setup only)

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'

interface ExtractedProfile {
  personal_details?: Record<string, unknown>
  contact_info?: Record<string, unknown>
  financial_profile?: Record<string, unknown>
}

const AI_TIMEOUT_MS = 60_000
const PROFILE_MAX_TOKENS = 1_200
const PROFILE_MAX_CHARS = 18_000

function truncate(text: string, maxChars: number): string {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars)
}

function parseJsonResponse(raw: string): ExtractedProfile | null {
  if (!raw) return null
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '')
  }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) return null
  const jsonString = cleaned.slice(firstBrace, lastBrace + 1)
  try {
    return JSON.parse(jsonString) as ExtractedProfile
  } catch {
    return null
  }
}

function mergeString(current: unknown, incoming: unknown): string | undefined {
  const currentValue = typeof current === 'string' ? current.trim() : ''
  const incomingValue = typeof incoming === 'string' ? incoming.trim() : ''
  if (!currentValue && incomingValue) return incomingValue
  return currentValue || undefined
}

function mergeNumber(current: unknown, incoming: unknown): number | undefined {
  const currentNumber = typeof current === 'number' && Number.isFinite(current) ? current : 0
  const incomingNumber = typeof incoming === 'number' && Number.isFinite(incoming) ? incoming : 0
  if (currentNumber === 0 && incomingNumber > 0) return incomingNumber
  return currentNumber > 0 ? currentNumber : undefined
}

function mergeArray(current: unknown, incoming: unknown): unknown[] | undefined {
  const currentArray = Array.isArray(current) ? current : []
  const incomingArray = Array.isArray(incoming) ? incoming : []
  if (currentArray.length === 0 && incomingArray.length > 0) return incomingArray
  return currentArray.length > 0 ? currentArray : undefined
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

function collectUpdatedFields(
  current: Record<string, unknown>,
  merged: Record<string, unknown>,
  labels: Record<string, string>
): string[] {
  const updated: string[] = []
  const keys = new Set([...Object.keys(current), ...Object.keys(merged)])
  keys.forEach((key) => {
    const currentValue = current[key]
    const mergedValue = merged[key]
    if (isEmptyValue(currentValue) && !isEmptyValue(mergedValue)) {
      updated.push(labels[key] || key)
    }
  })
  return updated
}

const PERSONAL_LABELS: Record<string, string> = {
  title: 'Title',
  firstName: 'First name',
  lastName: 'Last name',
  dateOfBirth: 'Date of birth',
  gender: 'Gender',
  nationality: 'Nationality',
  maritalStatus: 'Marital status',
  dependents: 'Dependants',
  employmentStatus: 'Employment status',
  occupation: 'Occupation',
  retirementAge: 'Retirement age',
}

const CONTACT_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  preferredContact: 'Preferred contact',
}

const ADDRESS_LABELS: Record<string, string> = {
  line1: 'Address line 1',
  line2: 'Address line 2',
  city: 'City',
  county: 'County',
  postcode: 'Postcode',
  country: 'Country',
}

const FINANCIAL_LABELS: Record<string, string> = {
  annualIncome: 'Annual income',
  monthlyExpenses: 'Monthly expenses',
  netWorth: 'Net worth',
  liquidAssets: 'Liquid assets',
  investmentTimeframe: 'Investment timeframe',
  investmentObjectives: 'Investment objectives',
  existingInvestments: 'Existing investments',
  pensionArrangements: 'Pension arrangements',
  insurancePolicies: 'Insurance policies',
}

function buildProfilePrompt(existingProfile: ExtractedProfile, documentBlocks: string): string {
  return [
    'You are extracting client profile data from financial documents for a UK IFA firm.',
    'Return ONLY valid JSON matching this schema. Use null for unknown fields. Do not guess.',
    '',
    '{',
    '  "personal_details": {',
    '    "title": null,',
    '    "firstName": null,',
    '    "lastName": null,',
    '    "dateOfBirth": null,',
    '    "gender": null,',
    '    "nationality": null,',
    '    "maritalStatus": null,',
    '    "dependents": null,',
    '    "employmentStatus": null,',
    '    "occupation": null,',
    '    "retirementAge": null',
    '  },',
    '  "contact_info": {',
    '    "email": null,',
    '    "phone": null,',
    '    "mobile": null,',
    '    "preferredContact": null,',
    '    "address": {',
    '      "line1": null,',
    '      "line2": null,',
    '      "city": null,',
    '      "county": null,',
    '      "postcode": null,',
    '      "country": null',
    '    }',
    '  },',
    '  "financial_profile": {',
    '    "annualIncome": null,',
    '    "monthlyExpenses": null,',
    '    "netWorth": null,',
    '    "liquidAssets": null,',
    '    "investmentTimeframe": null,',
    '    "investmentObjectives": [],',
    '    "existingInvestments": [],',
    '    "pensionArrangements": [],',
    '    "insurancePolicies": []',
    '  }',
    '}',
    '',
    'Rules:',
    '- Use ISO dates (YYYY-MM-DD).',
    '- Monetary values must be numbers in GBP (no commas, no currency symbols).',
    '- Do not infer values from context; only use explicit document evidence.',
    '- Prefer values found in multiple documents, otherwise leave null.',
    '',
    'Existing client profile (may be incomplete):',
    JSON.stringify(existingProfile, null, 2),
    '',
    'Documents:',
    documentBlocks,
  ].join('\n')
}

function mergeProfiles(current: ExtractedProfile, extracted: ExtractedProfile): ExtractedProfile {
  const currentPersonal = current.personal_details || {}
  const incomingPersonal = extracted.personal_details || {}
  const currentContact = current.contact_info || {}
  const incomingContact = extracted.contact_info || {}
  const currentAddress = (currentContact as any).address || {}
  const incomingAddress = (incomingContact as any).address || {}
  const currentFinancial = current.financial_profile || {}
  const incomingFinancial = extracted.financial_profile || {}

  const mergedPersonal = {
    ...currentPersonal,
    title: mergeString(currentPersonal.title, incomingPersonal.title),
    firstName: mergeString(currentPersonal.firstName, incomingPersonal.firstName),
    lastName: mergeString(currentPersonal.lastName, incomingPersonal.lastName),
    dateOfBirth: mergeString(currentPersonal.dateOfBirth, incomingPersonal.dateOfBirth),
    gender: mergeString(currentPersonal.gender, incomingPersonal.gender),
    nationality: mergeString(currentPersonal.nationality, incomingPersonal.nationality),
    maritalStatus: mergeString(currentPersonal.maritalStatus, incomingPersonal.maritalStatus),
    dependents:
      typeof currentPersonal.dependents === 'number' && currentPersonal.dependents > 0
        ? currentPersonal.dependents
        : typeof incomingPersonal.dependents === 'number'
          ? incomingPersonal.dependents
          : currentPersonal.dependents,
    employmentStatus: mergeString(currentPersonal.employmentStatus, incomingPersonal.employmentStatus),
    occupation: mergeString(currentPersonal.occupation, incomingPersonal.occupation),
    retirementAge:
      typeof currentPersonal.retirementAge === 'number' && currentPersonal.retirementAge > 0
        ? currentPersonal.retirementAge
        : typeof incomingPersonal.retirementAge === 'number'
          ? incomingPersonal.retirementAge
          : currentPersonal.retirementAge,
  }

  const mergedContact = {
    ...currentContact,
    email: mergeString(currentContact.email, incomingContact.email),
    phone: mergeString(currentContact.phone, incomingContact.phone),
    mobile: mergeString(currentContact.mobile, incomingContact.mobile),
    preferredContact: mergeString(currentContact.preferredContact, incomingContact.preferredContact),
    address: {
      ...currentAddress,
      line1: mergeString(currentAddress.line1, incomingAddress.line1),
      line2: mergeString(currentAddress.line2, incomingAddress.line2),
      city: mergeString(currentAddress.city, incomingAddress.city),
      county: mergeString(currentAddress.county, incomingAddress.county),
      postcode: mergeString(currentAddress.postcode, incomingAddress.postcode),
      country: mergeString(currentAddress.country, incomingAddress.country),
    },
  }

  const mergedFinancial = {
    ...currentFinancial,
    annualIncome: mergeNumber(currentFinancial.annualIncome, incomingFinancial.annualIncome),
    monthlyExpenses: mergeNumber(currentFinancial.monthlyExpenses, incomingFinancial.monthlyExpenses),
    netWorth: mergeNumber(currentFinancial.netWorth, incomingFinancial.netWorth),
    liquidAssets: mergeNumber(currentFinancial.liquidAssets, incomingFinancial.liquidAssets),
    investmentTimeframe: mergeString(currentFinancial.investmentTimeframe, incomingFinancial.investmentTimeframe),
    investmentObjectives: mergeArray(currentFinancial.investmentObjectives, incomingFinancial.investmentObjectives),
    existingInvestments: mergeArray(currentFinancial.existingInvestments, incomingFinancial.existingInvestments),
    pensionArrangements: mergeArray(currentFinancial.pensionArrangements, incomingFinancial.pensionArrangements),
    insurancePolicies: mergeArray(currentFinancial.insurancePolicies, incomingFinancial.insurancePolicies),
  }

  return {
    personal_details: mergedPersonal,
    contact_info: mergedContact,
    financial_profile: mergedFinancial,
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const logger = createRequestLogger(request)

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const firmId = getValidatedFirmId(auth.context)
    if (!firmId) {
      return NextResponse.json({ success: false, error: 'Firm ID required' }, { status: 403 })
    }

    const clientId = context?.params?.id
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 })
    }

    const { documentIds } = await request.json().catch(() => ({ documentIds: null }))

    const supabase = getSupabaseServiceClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, personal_details, contact_info, financial_profile, firm_id')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    let docsQuery = supabase
      .from('documents')
      .select('id, file_name, name, metadata')
      .eq('client_id', clientId)
      .eq('firm_id', firmId)
      .eq('status', 'analyzed')

    if (Array.isArray(documentIds) && documentIds.length > 0) {
      docsQuery = docsQuery.in('id', documentIds)
    }

    const { data: documents, error: docsError } = await docsQuery

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json({ success: false, error: 'No analysed documents found' }, { status: 400 })
    }

    const perDocLimit = Math.max(500, Math.floor(PROFILE_MAX_CHARS / documents.length))
    const documentBlocks = documents.map((doc: any, index: number) => {
      const meta = doc.metadata || {}
      const analysis = meta.ai_analysis || {}
      return [
        `--- Document ${index + 1}: ${doc.file_name || doc.name || 'Document'} ---`,
        `Summary: ${analysis.summary || 'No summary available'}`,
        `Entities: ${JSON.stringify(analysis.entities || {})}`,
        `Extracted Text (excerpt): ${truncate(meta.extracted_text || '', perDocLimit)}`,
        '',
      ].join('\n')
    }).join('\n')

    const prompt = buildProfilePrompt(
      {
        personal_details: (client.personal_details || {}) as Record<string, unknown>,
        contact_info: (client.contact_info || {}) as Record<string, unknown>,
        financial_profile: (client.financial_profile || {}) as Record<string, unknown>,
      },
      documentBlocks
    )

    const apiKey = process.env.DEEPSEEK_API_KEY || null
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'AI API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_PROFILE_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You extract structured client profile data from documents.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: PROFILE_MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Profile extraction AI error', new Error(`status ${response.status}`), {
        status: response.status,
        body: errorText.slice(0, 500),
      })
      return NextResponse.json({ success: false, error: 'AI extraction failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const extracted = parseJsonResponse(raw)
    if (!extracted) {
      return NextResponse.json({ success: false, error: 'Failed to parse extracted profile' }, { status: 500 })
    }

    const merged = mergeProfiles(
      {
        personal_details: (client.personal_details || {}) as Record<string, unknown>,
        contact_info: (client.contact_info || {}) as Record<string, unknown>,
        financial_profile: (client.financial_profile || {}) as Record<string, unknown>,
      },
      extracted
    )

    const currentPersonal = (client.personal_details || {}) as Record<string, unknown>
    const currentContact = (client.contact_info || {}) as Record<string, unknown>
    const currentAddress = ((currentContact as any).address || {}) as Record<string, unknown>
    const currentFinancial = (client.financial_profile || {}) as Record<string, unknown>
    const mergedPersonal = (merged.personal_details || {}) as Record<string, unknown>
    const mergedContact = (merged.contact_info || {}) as Record<string, unknown>
    const mergedAddress = ((mergedContact as any).address || {}) as Record<string, unknown>
    const mergedFinancial = (merged.financial_profile || {}) as Record<string, unknown>

    const updatedPersonal = collectUpdatedFields(currentPersonal, mergedPersonal, PERSONAL_LABELS)
    const updatedContact = collectUpdatedFields(currentContact, mergedContact, CONTACT_LABELS)
    const updatedAddress = collectUpdatedFields(currentAddress, mergedAddress, ADDRESS_LABELS)
    const updatedFinancial = collectUpdatedFields(currentFinancial, mergedFinancial, FINANCIAL_LABELS)

    const updatedFields = {
      personal_details: updatedPersonal,
      contact_info: [...updatedContact, ...updatedAddress],
      financial_profile: updatedFinancial,
    }

    const totalUpdated =
      updatedPersonal.length + updatedContact.length + updatedAddress.length + updatedFinancial.length

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        personal_details: merged.personal_details as any,
        contact_info: merged.contact_info as any,
        financial_profile: merged.financial_profile as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .select('id')
      .single()

    if (updateError || !updatedClient) {
      logger.error('Failed to update client profile from documents', updateError, { clientId })
      return NextResponse.json({ success: false, error: 'Failed to update client profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: true,
      updatedFields,
      totalUpdated,
    })
  } catch (error) {
    logger.error('Profile auto-population error', error)
    return NextResponse.json({ success: false, error: 'Failed to populate profile' }, { status: 500 })
  }
}
