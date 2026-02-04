// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Auto-populate client profile fields from analysed documents

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

interface ExtractedProfile {
  personal_details?: Record<string, unknown>
  contact_info?: Record<string, unknown>
  financial_profile?: Record<string, unknown>
}

interface ProfileUpdates {
  personal_details?: Record<string, unknown>
  contact_info?: Record<string, unknown>
  financial_profile?: Record<string, unknown>
}

type DocumentCandidate = {
  id: string
  name: string
  status?: string | null
  classification: string
  confidence: number
  entities?: {
    clientNames?: string[]
    dates?: string[]
    providerNames?: string[]
    policyNumbers?: string[]
    financialAmounts?: { amount: number; currency: string; context: string }[]
    addresses?: string[]
    referenceNumbers?: string[]
  }
}

type CandidateWithSources = {
  value: string | number
  sources: string[]  // document names that contributed this candidate
}

type Proposal = {
  section: 'personal_details' | 'contact_info' | 'financial_profile'
  key: string
  path: string
  label: string
  currentValue: string | number | null
  suggestedValue: string | number | null
  candidates: CandidateWithSources[]
}

const AI_TIMEOUT_MS = 60_000
const PROFILE_MAX_TOKENS = 2_000
const PROFILE_MAX_CHARS = 30_000

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

const PERSONAL_KEYS_BY_LABEL: Record<string, string> = Object.entries(PERSONAL_LABELS).reduce((acc, [key, label]) => {
  acc[label] = key
  return acc
}, {} as Record<string, string>)

const CONTACT_KEYS_BY_LABEL: Record<string, string> = Object.entries(CONTACT_LABELS).reduce((acc, [key, label]) => {
  acc[label] = key
  return acc
}, {} as Record<string, string>)

const ADDRESS_KEYS_BY_LABEL: Record<string, string> = Object.entries(ADDRESS_LABELS).reduce((acc, [key, label]) => {
  acc[label] = key
  return acc
}, {} as Record<string, string>)

const FINANCIAL_KEYS_BY_LABEL: Record<string, string> = Object.entries(FINANCIAL_LABELS).reduce((acc, [key, label]) => {
  acc[label] = key
  return acc
}, {} as Record<string, string>)

const TITLE_TOKENS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof'])
const POSTCODE_REGEX = /([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i

function normalizeCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeDateCandidate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = new Date(trimmed)
  if (!Number.isFinite(parsed.getTime())) return null
  const year = parsed.getFullYear()
  const nowYear = new Date().getFullYear()
  if (year < 1900 || year > nowYear - 18) return null
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// A pool entry maps candidate value → list of source document names
type SourcedPool<T extends string | number = string> = Map<T, string[]>

function addToPool<T extends string | number>(pool: SourcedPool<T>, value: T, docName: string) {
  const existing = pool.get(value)
  if (existing) {
    if (!existing.includes(docName)) existing.push(docName)
  } else {
    pool.set(value, [docName])
  }
}

type EntityPool = {
  title: SourcedPool<string>
  firstName: SourcedPool<string>
  lastName: SourcedPool<string>
  gender: SourcedPool<string>
  dateOfBirth: SourcedPool<string>
  addressLine1: SourcedPool<string>
  postcode: SourcedPool<string>
  county: SourcedPool<string>
  annualIncome: SourcedPool<number>
  monthlyExpenses: SourcedPool<number>
  netWorth: SourcedPool<number>
  liquidAssets: SourcedPool<number>
  existingInvestments: SourcedPool<string>
  pensionArrangements: SourcedPool<string>
}

function collectEntityCandidates(
  documents: DocumentCandidate[],
  clientFirstName?: string,
  clientLastName?: string
): EntityPool {
  const pool: EntityPool = {
    title: new Map(),
    firstName: new Map(),
    lastName: new Map(),
    gender: new Map(),
    dateOfBirth: new Map(),
    addressLine1: new Map(),
    postcode: new Map(),
    county: new Map(),
    annualIncome: new Map(),
    monthlyExpenses: new Map(),
    netWorth: new Map(),
    liquidAssets: new Map(),
    existingInvestments: new Map(),
    pensionArrangements: new Map(),
  }

  const MALE_TITLES = new Set(['mr', 'sir'])
  const FEMALE_TITLES = new Set(['mrs', 'ms', 'miss', 'dame'])

  // Normalise the known client name for matching
  const knownFirst = (clientFirstName || '').toLowerCase().trim()
  const knownLast = (clientLastName || '').toLowerCase().trim()

  documents.forEach((doc) => {
    const docName = doc.name || 'Document'
    const entities = doc.entities || {}

    // --- Names: only extract title/gender from names matching the client ---
    const names = Array.isArray(entities.clientNames) ? entities.clientNames : []
    for (const rawName of names) {
      const normalized = normalizeCandidate(rawName)
      if (!normalized) continue
      const parts = normalized.split(/\s+/)
      const first = parts[0]?.toLowerCase()

      // Check if this name plausibly belongs to the client using token matching
      // If we don't know the client name yet, accept all names
      const nameTokens = normalized.toLowerCase().split(/\s+/)
      const hasKnownName = Boolean(knownFirst || knownLast)
      const matchesClient = !hasKnownName ||
        (knownFirst && nameTokens.some((t) => t === knownFirst)) ||
        (knownLast && nameTokens.some((t) => t === knownLast))

      if (first && TITLE_TOKENS.has(first)) {
        const titleToken = first.charAt(0).toUpperCase() + first.slice(1)
        parts.shift()
        // Only use title/gender from names matching the client identity
        if (matchesClient) {
          addToPool(pool.title, titleToken, docName)
          if (MALE_TITLES.has(first)) addToPool(pool.gender, 'male', docName)
          if (FEMALE_TITLES.has(first)) addToPool(pool.gender, 'female', docName)
        }
      }
      if (matchesClient) {
        if (parts.length > 0) addToPool(pool.firstName, parts[0], docName)
        if (parts.length > 1) addToPool(pool.lastName, parts[parts.length - 1], docName)
      }
    }

    // --- Dates ---
    const dates = Array.isArray(entities.dates) ? entities.dates : []
    for (const rawDate of dates) {
      const normalizedDate = normalizeDateCandidate(String(rawDate))
      if (normalizedDate) addToPool(pool.dateOfBirth, normalizedDate, docName)
    }

    // --- Addresses: skip obvious provider/office addresses ---
    const providerNames = Array.isArray(entities.providerNames) ? entities.providerNames : []
    const providerSet = new Set(providerNames.map((p: string) => (p || '').toLowerCase()))

    const addresses = Array.isArray(entities.addresses) ? entities.addresses : []
    for (const rawAddress of addresses) {
      const normalized = normalizeCandidate(rawAddress)
      if (!normalized) continue
      // Skip addresses that start with a known provider name (likely their office)
      const addrLower = normalized.toLowerCase()
      let isProviderAddress = false
      providerSet.forEach((prov) => {
        if (prov && prov.length > 3 && addrLower.startsWith(prov)) isProviderAddress = true
      })
      if (isProviderAddress) continue

      addToPool(pool.addressLine1, normalized, docName)
      const postcodeMatch = normalized.match(POSTCODE_REGEX)
      if (postcodeMatch?.[1]) addToPool(pool.postcode, postcodeMatch[1].toUpperCase(), docName)
    }

    // --- Provider names as investment/pension entries ---
    const classification = (doc.classification || '').toLowerCase()
    for (const provider of providerNames) {
      const norm = normalizeCandidate(provider)
      if (!norm) continue
      if (classification.includes('pension') || classification.includes('sipp')) {
        addToPool(pool.pensionArrangements, norm, docName)
      }
      if (classification.includes('investment') || classification.includes('portfolio')) {
        addToPool(pool.existingInvestments, norm, docName)
      }
    }

    // --- Financial amounts ---
    const amounts = Array.isArray(entities.financialAmounts) ? entities.financialAmounts : []
    for (const amount of amounts) {
      if (!amount || typeof amount.amount !== 'number') continue
      const context = String(amount.context || '').toLowerCase()
      if (context.includes('income') || context.includes('salary') || context.includes('pay') || context.includes('wage')) {
        addToPool(pool.annualIncome, amount.amount, docName)
      }
      if (context.includes('expense') || context.includes('outgoing') || context.includes('expenditure')) {
        addToPool(pool.monthlyExpenses, amount.amount, docName)
      }
      if (context.includes('net worth')) {
        addToPool(pool.netWorth, amount.amount, docName)
      }
      if (context.includes('balance') || context.includes('savings') || context.includes('cash') || context.includes('liquid')) {
        addToPool(pool.liquidAssets, amount.amount, docName)
      }
    }
  })

  return pool
}

function buildCandidateList(
  key: string,
  suggestedValue: string | number | null,
  suggestedSource: string,
  pool: EntityPool
): CandidateWithSources[] {
  const candidates: CandidateWithSources[] = []
  const seen = new Set<string | number>()

  const add = (value: string | number | null | undefined, sources: string[]) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string' && !value.trim()) return
    if (typeof value === 'number' && !Number.isFinite(value)) return
    if (seen.has(value)) return
    seen.add(value)
    candidates.push({ value, sources })
  }

  // Add AI-suggested value first
  add(suggestedValue, suggestedSource ? [suggestedSource] : ['AI extraction'])

  // Add entity pool candidates with their document sources
  const poolMap: Record<string, SourcedPool<any>> = {
    title: pool.title,
    firstName: pool.firstName,
    lastName: pool.lastName,
    gender: pool.gender,
    dateOfBirth: pool.dateOfBirth,
    line1: pool.addressLine1,
    postcode: pool.postcode,
    county: pool.county,
    annualIncome: pool.annualIncome,
    monthlyExpenses: pool.monthlyExpenses,
    netWorth: pool.netWorth,
    liquidAssets: pool.liquidAssets,
  }

  const sourcedPool = poolMap[key]
  if (sourcedPool) {
    sourcedPool.forEach((sources: string[], entry: string | number) => {
      add(entry, sources)
    })
  }

  return candidates.slice(0, 6)
}

function buildProposals(args: {
  updatedFields: { personal_details: string[]; contact_info: string[]; financial_profile: string[] }
  currentPersonal: Record<string, unknown>
  currentContact: Record<string, unknown>
  currentAddress: Record<string, unknown>
  currentFinancial: Record<string, unknown>
  mergedPersonal: Record<string, unknown>
  mergedContact: Record<string, unknown>
  mergedAddress: Record<string, unknown>
  mergedFinancial: Record<string, unknown>
  candidatePool: EntityPool
}): Proposal[] {
  const proposals: Proposal[] = []
  const proposedPaths = new Set<string>()

  const pushProposal = (
    section: Proposal['section'],
    key: string,
    path: string,
    label: string,
    currentValue: unknown,
    suggestedValue: unknown
  ) => {
    if (!isEmptyValue(currentValue)) return
    if (isEmptyValue(suggestedValue)) return
    if (proposedPaths.has(path)) return
    // Allow arrays through — they contain useful data like pension/investment lists
    if (typeof suggestedValue === 'object' && !Array.isArray(suggestedValue)) return
    const normalizedSuggested =
      typeof suggestedValue === 'number' || typeof suggestedValue === 'string'
        ? suggestedValue
        : Array.isArray(suggestedValue)
          ? String(suggestedValue.join(', '))
          : String(suggestedValue)
    const candidates = buildCandidateList(key, normalizedSuggested as any, 'AI extraction', args.candidatePool)
    proposals.push({
      section,
      key,
      path,
      label,
      currentValue: currentValue as any,
      suggestedValue: normalizedSuggested as any,
      candidates,
    })
    proposedPaths.add(path)
  }

  // Phase 1: Proposals from AI-merged data
  for (const label of args.updatedFields.personal_details) {
    const key = PERSONAL_KEYS_BY_LABEL[label]
    if (!key) continue
    pushProposal(
      'personal_details',
      key,
      `personal_details.${key}`,
      label,
      args.currentPersonal[key],
      args.mergedPersonal[key]
    )
  }

  for (const label of args.updatedFields.contact_info) {
    const contactKey = CONTACT_KEYS_BY_LABEL[label]
    if (contactKey) {
      pushProposal(
        'contact_info',
        contactKey,
        `contact_info.${contactKey}`,
        label,
        args.currentContact[contactKey],
        args.mergedContact[contactKey]
      )
      continue
    }
    const addressKey = ADDRESS_KEYS_BY_LABEL[label]
    if (addressKey) {
      pushProposal(
        'contact_info',
        addressKey,
        `contact_info.address.${addressKey}`,
        label,
        args.currentAddress[addressKey],
        args.mergedAddress[addressKey]
      )
    }
  }

  for (const label of args.updatedFields.financial_profile) {
    const key = FINANCIAL_KEYS_BY_LABEL[label]
    if (!key) continue
    pushProposal(
      'financial_profile',
      key,
      `financial_profile.${key}`,
      label,
      args.currentFinancial[key],
      args.mergedFinancial[key]
    )
  }

  // Phase 2: Fill gaps from entity candidates when AI returned nothing
  // This ensures proposals appear even when AI is conservative
  const entityFieldMap: Array<{
    section: Proposal['section']
    key: string
    path: string
    label: string
    currentObj: Record<string, unknown>
    poolKey: keyof EntityPool
  }> = [
    { section: 'personal_details', key: 'title', path: 'personal_details.title', label: 'Title', currentObj: args.currentPersonal, poolKey: 'title' },
    { section: 'personal_details', key: 'gender', path: 'personal_details.gender', label: 'Gender', currentObj: args.currentPersonal, poolKey: 'gender' },
    { section: 'personal_details', key: 'firstName', path: 'personal_details.firstName', label: 'First name', currentObj: args.currentPersonal, poolKey: 'firstName' },
    { section: 'personal_details', key: 'lastName', path: 'personal_details.lastName', label: 'Last name', currentObj: args.currentPersonal, poolKey: 'lastName' },
    { section: 'personal_details', key: 'dateOfBirth', path: 'personal_details.dateOfBirth', label: 'Date of birth', currentObj: args.currentPersonal, poolKey: 'dateOfBirth' },
    { section: 'contact_info', key: 'line1', path: 'contact_info.address.line1', label: 'Address line 1', currentObj: args.currentAddress, poolKey: 'addressLine1' },
    { section: 'contact_info', key: 'postcode', path: 'contact_info.address.postcode', label: 'Postcode', currentObj: args.currentAddress, poolKey: 'postcode' },
    { section: 'financial_profile', key: 'annualIncome', path: 'financial_profile.annualIncome', label: 'Annual income', currentObj: args.currentFinancial, poolKey: 'annualIncome' },
    { section: 'financial_profile', key: 'liquidAssets', path: 'financial_profile.liquidAssets', label: 'Liquid assets', currentObj: args.currentFinancial, poolKey: 'liquidAssets' },
  ]

  for (const field of entityFieldMap) {
    if (proposedPaths.has(field.path)) continue
    if (!isEmptyValue(field.currentObj[field.key])) continue
    const poolMap = args.candidatePool[field.poolKey]
    if (!poolMap || poolMap.size === 0) continue
    // Get first candidate from the pool
    const iter = poolMap.entries().next()
    if (iter.done || !iter.value) continue
    const [firstValue] = iter.value as [any, string[]]
    const candidates = buildCandidateList(field.key, firstValue, '', args.candidatePool)
    if (candidates.length === 0) continue
    proposals.push({
      section: field.section,
      key: field.key,
      path: field.path,
      label: field.label,
      currentValue: null,
      suggestedValue: firstValue as any,
      candidates,
    })
    proposedPaths.add(field.path)
  }

  return proposals
}

function applyProfileUpdates(current: ExtractedProfile, updates: ProfileUpdates) {
  const currentPersonal = current.personal_details || {}
  const currentContact = current.contact_info || {}
  const currentAddress = (currentContact as any).address || {}
  const currentFinancial = current.financial_profile || {}

  const nextPersonal = { ...currentPersonal }
  const nextContact = { ...currentContact }
  const nextAddress = { ...currentAddress }
  const nextFinancial = { ...currentFinancial }

  const updatedPersonal: string[] = []
  const updatedContact: string[] = []
  const updatedAddress: string[] = []
  const updatedFinancial: string[] = []

  if (updates.personal_details) {
    for (const [key, value] of Object.entries(updates.personal_details)) {
      if (isEmptyValue((nextPersonal as any)[key]) && !isEmptyValue(value)) {
        ;(nextPersonal as any)[key] = value
        updatedPersonal.push(PERSONAL_LABELS[key] || key)
      }
    }
  }

  if (updates.contact_info) {
    for (const [key, value] of Object.entries(updates.contact_info)) {
      if (key === 'address' && value && typeof value === 'object') {
        for (const [addrKey, addrValue] of Object.entries(value as Record<string, unknown>)) {
          if (isEmptyValue((nextAddress as any)[addrKey]) && !isEmptyValue(addrValue)) {
            ;(nextAddress as any)[addrKey] = addrValue
            updatedAddress.push(ADDRESS_LABELS[addrKey] || addrKey)
          }
        }
        continue
      }
      if (isEmptyValue((nextContact as any)[key]) && !isEmptyValue(value)) {
        ;(nextContact as any)[key] = value
        updatedContact.push(CONTACT_LABELS[key] || key)
      }
    }
  }

  if (updates.financial_profile) {
    for (const [key, value] of Object.entries(updates.financial_profile)) {
      if (isEmptyValue((nextFinancial as any)[key]) && !isEmptyValue(value)) {
        ;(nextFinancial as any)[key] = value
        updatedFinancial.push(FINANCIAL_LABELS[key] || key)
      }
    }
  }

  const merged = {
    personal_details: nextPersonal,
    contact_info: { ...nextContact, address: nextAddress },
    financial_profile: nextFinancial,
  }

  const updatedFields = {
    personal_details: updatedPersonal,
    contact_info: [...updatedContact, ...updatedAddress],
    financial_profile: updatedFinancial,
  }

  const totalUpdated = updatedPersonal.length + updatedContact.length + updatedAddress.length + updatedFinancial.length

  return { merged, updatedFields, totalUpdated }
}

function buildProfilePrompt(existingProfile: ExtractedProfile, documentBlocks: string): string {
  // Identify which fields are currently empty so the AI focuses on those
  const personal = existingProfile.personal_details || {}
  const contact = existingProfile.contact_info || {}
  const address = (contact as any).address || {}
  const financial = existingProfile.financial_profile || {}

  const emptyFields: string[] = []
  const checkEmpty = (section: string, obj: Record<string, unknown>, labels: Record<string, string>) => {
    for (const [key, label] of Object.entries(labels)) {
      if (isEmptyValue(obj[key])) emptyFields.push(`${section}.${label}`)
    }
  }
  checkEmpty('personal_details', personal, PERSONAL_LABELS)
  checkEmpty('contact_info', contact, CONTACT_LABELS)
  checkEmpty('address', address, ADDRESS_LABELS)
  checkEmpty('financial_profile', financial, FINANCIAL_LABELS)

  return [
    'You are extracting client profile data from financial documents for a UK IFA firm.',
    'Your task is to find NEW information for fields that are currently empty in the client profile.',
    'Return ONLY valid JSON matching this schema. Use null only when genuinely absent from all documents.',
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
    '- Extract values from document evidence. A single clear mention in one document is sufficient.',
    '- Look for titles (Mr, Mrs, Dr) in names, email addresses in correspondence, phone numbers, etc.',
    '- For "existingInvestments", list investment/pension products with provider names and amounts if available.',
    '- For "pensionArrangements", list all pension schemes mentioned (provider name + type).',
    '- If a name appears as "Mr Mark Bucknill", extract the title "Mr".',
    '- If you can determine gender from the title (Mr = male, Mrs/Ms = female), include it.',
    '',
    'IMPORTANT: Focus on filling these currently EMPTY fields:',
    emptyFields.join(', '),
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

    const body = await parseRequestBody(request, undefined, { allowEmpty: true })
    const documentIds = body?.documentIds
    const previewOnly = Boolean(body?.preview)
    const applyUpdates = Boolean(body?.apply)
    const updatesPayload = body?.updates as ProfileUpdates | undefined

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

    if (applyUpdates && updatesPayload) {
      const currentProfile: ExtractedProfile = {
        personal_details: (client.personal_details || {}) as Record<string, unknown>,
        contact_info: (client.contact_info || {}) as Record<string, unknown>,
        financial_profile: (client.financial_profile || {}) as Record<string, unknown>,
      }

      const { merged, updatedFields, totalUpdated } = applyProfileUpdates(currentProfile, updatesPayload)

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
        logger.error('Failed to apply profile updates from documents', updateError, { clientId })
        return NextResponse.json({ success: false, error: 'Failed to update client profile' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        updated: true,
        updatedFields,
        totalUpdated,
      })
    }

    let documentCounts = { total: 0, analyzed: 0 }
    try {
      const { data: statusRows } = await supabase
        .from('documents')
        .select('status')
        .eq('client_id', clientId)
        .eq('firm_id', firmId)
      const statuses = statusRows || []
      documentCounts.total = statuses.length
      documentCounts.analyzed = statuses.filter((row: any) => row.status === 'analyzed').length
    } catch {
      // Non-blocking
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

    const documentSources = (documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.file_name || doc.name || 'Document',
      status: 'analyzed',
      classification: doc.metadata?.ai_analysis?.classification || 'unknown',
      confidence: doc.metadata?.ai_analysis?.confidence || 0,
      entities: doc.metadata?.ai_analysis?.entities || {},
    })) as DocumentCandidate[]

    if (docsError || !documents || documents.length === 0) {
      if (previewOnly) {
        return NextResponse.json({
          success: true,
          preview: true,
          updated: false,
          updatedFields: { personal_details: [], contact_info: [], financial_profile: [] },
          totalUpdated: 0,
          proposals: [] as Proposal[],
          documentSources: [],
          documentCounts,
          message: 'No analysed documents found',
        })
      }
      return NextResponse.json({ success: false, error: 'No analysed documents found', documentSources: [] }, { status: 400 })
    }

    // Prioritize document types that contain the most personal/financial profile data
    const HIGH_PRIORITY_TYPES = new Set([
      'meeting_notes', 'identity_document', 'correspondence', 'application_form',
      'client_agreement', 'fact_find', 'know_your_client',
    ])
    const sortedDocs = [...documents].sort((a: any, b: any) => {
      const aType = a.metadata?.ai_analysis?.classification || ''
      const bType = b.metadata?.ai_analysis?.classification || ''
      const aPriority = HIGH_PRIORITY_TYPES.has(aType) ? 0 : 1
      const bPriority = HIGH_PRIORITY_TYPES.has(bType) ? 0 : 1
      return aPriority - bPriority
    })

    // Give high-priority docs more text budget
    const highPriorityCount = sortedDocs.filter((d: any) =>
      HIGH_PRIORITY_TYPES.has(d.metadata?.ai_analysis?.classification || '')
    ).length
    const lowPriorityCount = sortedDocs.length - highPriorityCount
    const highLimit = highPriorityCount > 0
      ? Math.max(800, Math.floor((PROFILE_MAX_CHARS * 0.7) / highPriorityCount))
      : 0
    const lowLimit = lowPriorityCount > 0
      ? Math.max(400, Math.floor((PROFILE_MAX_CHARS * 0.3) / lowPriorityCount))
      : 0

    const documentBlocks = sortedDocs.map((doc: any, index: number) => {
      const meta = doc.metadata || {}
      const analysis = meta.ai_analysis || {}
      const classification = analysis.classification || ''
      const limit = HIGH_PRIORITY_TYPES.has(classification) ? highLimit : lowLimit
      return [
        `--- Document ${index + 1}: ${doc.file_name || doc.name || 'Document'} (${classification}) ---`,
        `Summary: ${analysis.summary || 'No summary available'}`,
        `Entities: ${JSON.stringify(analysis.entities || {})}`,
        `Extracted Text (excerpt): ${truncate(meta.extracted_text || '', limit)}`,
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

    // Attempt AI extraction, but fall back to entity-only mode if AI fails
    let extracted: ExtractedProfile | null = null

    if (apiKey) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_PROFILE_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You extract structured client profile data from documents. Focus on finding NEW data not already in the existing profile.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: PROFILE_MAX_TOKENS,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        })

        if (response.ok) {
          const data = await response.json()
          const raw = data.choices?.[0]?.message?.content || ''
          extracted = parseJsonResponse(raw)
          if (!extracted) {
            logger.error('Failed to parse AI response for profile extraction', new Error('Parse failure'), {
              clientId,
              rawLength: raw.length,
              rawPreview: raw.slice(0, 300),
            })
          }
        } else {
          const errorText = await response.text()
          logger.error('Profile extraction AI error', new Error(`status ${response.status}`), {
            status: response.status,
            body: errorText.slice(0, 500),
          })
        }
      } catch (aiError) {
        logger.error('AI extraction call failed, falling back to entity-based extraction', aiError, { clientId })
      }
    }

    // Use empty profile if AI failed — entity candidates will still generate proposals
    if (!extracted) {
      extracted = { personal_details: {}, contact_info: {}, financial_profile: {} }
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

    const cfn = typeof currentPersonal.firstName === 'string' && currentPersonal.firstName.trim() ? currentPersonal.firstName : undefined
    const cln = typeof currentPersonal.lastName === 'string' && currentPersonal.lastName.trim() ? currentPersonal.lastName : undefined
    const candidatePool = collectEntityCandidates(documentSources, cfn, cln)
    const proposals = buildProposals({
      updatedFields,
      currentPersonal,
      currentContact,
      currentAddress,
      currentFinancial,
      mergedPersonal,
      mergedContact,
      mergedAddress,
      mergedFinancial,
      candidatePool,
    })

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        updated: false,
        updatedFields,
        totalUpdated,
        proposals,
        documentSources,
        documentCounts,
      })
    }

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
      documentSources,
      documentCounts,
    })
  } catch (error) {
    logger.error('Profile auto-population error', error)
    return NextResponse.json({ success: false, error: 'Failed to populate profile' }, { status: 500 })
  }
}
