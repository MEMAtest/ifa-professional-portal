import type {
  ClientAddress,
  ClientFinancialProfile,
  ClientObjectives,
  ClientRiskProfile,
  MappedFinancialData,
  SuitabilityFormData
} from '@/types/suitability'
import { suitabilitySections } from '@/config/suitability/sections'

// Helper to ensure sections exist before use
export function seedEmptySections(data: SuitabilityFormData): SuitabilityFormData {
  let needsClone = false

  for (const section of suitabilitySections) {
    if (!(data as any)[section.id]) {
      needsClone = true
      break
    }
  }

  if (!data._metadata || !data._aiSuggestions) {
    needsClone = true
  }

  if (!needsClone) return data

  const seeded: SuitabilityFormData = { ...data }
  suitabilitySections.forEach((section) => {
    if (!seeded[section.id as keyof SuitabilityFormData]) {
      ;(seeded as any)[section.id] = {}
    }
  })
  if (!seeded._metadata) {
    seeded._metadata = {
      updatedAt: new Date().toISOString(),
      isDirty: false,
      version: '1.0',
      createdAt: new Date().toISOString(),
      completionPercentage: 0,
      aiEnabled: true,
      pulledData: {}
    }
  }
  if (!seeded._aiSuggestions) {
    seeded._aiSuggestions = {}
  }
  return seeded
}

export function mergeSectionUpdates(
  base: SuitabilityFormData,
  updates: Partial<SuitabilityFormData>
): SuitabilityFormData {
  if (!updates || Object.keys(updates).length === 0) return base

  let changed = false
  const merged: SuitabilityFormData = { ...base }
  for (const [key, value] of Object.entries(updates || {})) {
    if (value === null || value === undefined) continue
    if (typeof value !== 'object') continue
    if (key.startsWith('_')) {
      const prev = (merged as any)[key]
      const next = { ...(prev as any), ...(value as any) }
      if (prev !== next) changed = true
      ;(merged as any)[key] = next
      continue
    }
    const prev = (merged as any)[key]
    const next = { ...(prev as any), ...(value as any) }
    if (prev !== next) changed = true
    ;(merged as any)[key] = next
  }
  return changed ? merged : base
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  const stringify = (v: any): any => {
    if (v === null || v === undefined) return v
    if (typeof v !== 'object') return v
    if (seen.has(v)) return '[Circular]'
    seen.add(v)
    if (Array.isArray(v)) return v.map(stringify)
    const keys = Object.keys(v).sort()
    const out: Record<string, any> = {}
    for (const k of keys) out[k] = stringify(v[k])
    return out
  }
  return JSON.stringify(stringify(value))
}

export function fingerprintFormDataForHydration(data: SuitabilityFormData): string {
  const sectionsOnly: Record<string, any> = {}
  for (const section of suitabilitySections) {
    sectionsOnly[section.id] = (data as any)?.[section.id] || {}
  }
  return stableStringify(sectionsOnly)
}

export const generateClientReference = (): string => {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `C${timestamp}${random}`
}

export const calculateAge = (dateOfBirth?: string): number => {
  if (!dateOfBirth) return 0
  const today = new Date()
  const birthDate = new Date(dateOfBirth)

  if (isNaN(birthDate.getTime())) return 0

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age >= 0 && age <= 150 ? age : 0
}

export const mapEmploymentStatus = (status?: string): string => {
  if (!status) return 'Not Working'
  const normalized = String(status).trim().toLowerCase().replace(/\s+/g, '_')
  const statusMap: Record<string, string> = {
    employed: 'Employed',
    self_employed: 'Self-Employed',
    retired: 'Retired',
    unemployed: 'Not Working',
    not_working: 'Not Working',
    student: 'Student',
    other: 'Other'
  }
  return statusMap[normalized] || status
}

export const mapMaritalStatus = (status?: string): string => {
  if (!status) return ''
  const normalized = String(status).trim().toLowerCase().replace(/\s+/g, '_')
  const map: Record<string, string> = {
    single: 'Single',
    married: 'Married',
    civil_partnership: 'Civil Partnership',
    divorced: 'Divorced',
    widowed: 'Widowed'
  }
  return map[normalized] || (String(status).charAt(0).toUpperCase() + String(status).slice(1))
}

export const mapPreferredContact = (method?: string): string => {
  if (!method) return 'Email'
  const normalized = String(method).trim().toLowerCase()
  const map: Record<string, string> = {
    email: 'Email',
    phone: 'Phone',
    mobile: 'Phone',
    post: 'Post',
    sms: 'SMS',
    text: 'SMS',
    letter: 'Post'
  }
  return map[normalized] || (String(method).charAt(0).toUpperCase() + String(method).slice(1))
}

export const formatAddress = (address?: ClientAddress | string): string => {
  if (!address) return ''
  if (typeof address === 'string') return address
  return [address.line1, address.line2, address.city, address.county, address.postcode, address.country]
    .filter(Boolean)
    .join('\n')
}

export const mapClientFinancialData = (profile?: ClientFinancialProfile): MappedFinancialData => {
  if (!profile) {
    return {
      annual_income: 0,
      monthly_expenditure: 0,
      liquid_assets: 0,
      property_value: 0,
      outstanding_mortgage: 0,
      other_liabilities: 0,
      net_worth: 0
    }
  }

  const investmentTotal = Array.isArray(profile.existingInvestments)
    ? profile.existingInvestments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0)
    : 0

  const pensionTotal = Array.isArray(profile.pensionArrangements)
    ? profile.pensionArrangements.reduce((sum, pension) => sum + (pension.currentValue || 0), 0)
    : 0

  return {
    annual_income: profile.annualIncome || 0,
    monthly_expenditure: profile.monthlyExpenses || 0,
    liquid_assets: profile.liquidAssets || 0,
    property_value: investmentTotal + pensionTotal,
    outstanding_mortgage: 0,
    other_liabilities: 0,
    net_worth: profile.netWorth || 0
  }
}

export interface ExtractedRiskProfile {
  attitudeToRisk: string
  maxAcceptableLoss: number
  riskTolerance: string
  riskCapacity: string
}

// Helper to fill empty form fields with client-derived data
// This ensures auto-generation happens even when loading from a draft
// Note: using any type here for flexibility
export const fillEmptyFieldsFromClient = (formData: SuitabilityFormData, client: any): SuitabilityFormData => {
  if (!client) {
    console.log('[fillEmptyFieldsFromClient] No client data available')
    return formData
  }

  const personalDetails = client.personalDetails || client.personal_details || {}
  const contactInfo = client.contactInfo || client.contact_info || {}
  const clientRef = client.clientRef || client.client_ref

  console.log('[fillEmptyFieldsFromClient] Client data:', {
    hasPersonalDetails: !!client.personalDetails || !!client.personal_details,
    firstName: personalDetails?.firstName || personalDetails?.first_name,
    lastName: personalDetails?.lastName || personalDetails?.last_name,
    clientRef
  })

  const personal = { ...((formData.personal_information as any) || {}) }
  const contact = { ...((formData.contact_details as any) || {}) }
  let changed = false

  // Personal info (fill + normalize to match Suitability select options)
  if (!personal.client_name) {
    const title = personalDetails?.title || ''
    const firstName = personalDetails?.firstName || personalDetails?.first_name || ''
    const lastName = personalDetails?.lastName || personalDetails?.last_name || ''
    const fullName = [title, firstName, lastName].filter(Boolean).join(' ').trim()
    console.log('[fillEmptyFieldsFromClient] Generated fullName:', fullName)
    if (fullName) {
      personal.client_name = fullName
      changed = true
    }
  }
  if (!personal.client_reference && clientRef) {
    personal.client_reference = clientRef
    changed = true
  }
  if (!personal.date_of_birth) {
    const dob = personalDetails?.dateOfBirth || personalDetails?.date_of_birth
    if (dob) {
      personal.date_of_birth = dob
      changed = true
    }
  }
  if (!personal.occupation && (personalDetails?.occupation || personalDetails?.jobTitle || personalDetails?.job_title)) {
    personal.occupation = personalDetails.occupation || personalDetails.jobTitle || personalDetails.job_title
    changed = true
  }

  if (personal.marital_status) {
    const mapped = mapMaritalStatus(personal.marital_status)
    if (mapped !== personal.marital_status) {
      personal.marital_status = mapped
      changed = true
    }
  } else if (personalDetails?.maritalStatus || personalDetails?.marital_status) {
    const mapped = mapMaritalStatus(personalDetails.maritalStatus || personalDetails.marital_status)
    if (mapped && mapped !== personal.marital_status) {
      personal.marital_status = mapped
      changed = true
    }
  }

  if (personal.employment_status) {
    const mapped = mapEmploymentStatus(personal.employment_status)
    if (mapped !== personal.employment_status) {
      personal.employment_status = mapped
      changed = true
    }
  } else if (personalDetails?.employmentStatus || personalDetails?.employment_status) {
    const mapped = mapEmploymentStatus(personalDetails.employmentStatus || personalDetails.employment_status)
    if (mapped && mapped !== personal.employment_status) {
      personal.employment_status = mapped
      changed = true
    }
  }

  if ((personal.dependents === undefined || personal.dependents === null) && personalDetails?.dependents !== undefined) {
    personal.dependents = personalDetails.dependents
    changed = true
  }

  // Contact details (fill + normalize)
  if (!contact.email && contactInfo?.email) {
    contact.email = contactInfo.email
    changed = true
  }

  const phone =
    contactInfo?.phone ||
    contactInfo?.mobile ||
    contactInfo?.alternativePhone ||
    (contactInfo as any)?.phoneNumber ||
    (contactInfo as any)?.telephone ||
    (contactInfo as any)?.tel ||
    (contactInfo as any)?.contactNumber ||
    (contactInfo as any)?.mobileNumber ||
    (contactInfo as any)?.homePhone ||
    (contactInfo as any)?.workPhone
  if (!contact.phone && phone) {
    contact.phone = phone
    changed = true
  }

  const postcode = (contactInfo as any)?.address?.postcode || (contactInfo as any)?.postcode
  if (!contact.postcode && postcode) {
    contact.postcode = postcode
    changed = true
  }

  if (contact.preferred_contact) {
    const mapped = mapPreferredContact(contact.preferred_contact)
    if (mapped !== contact.preferred_contact) {
      contact.preferred_contact = mapped
      changed = true
    }
  } else if (contactInfo?.preferredContact || contactInfo?.preferredContactMethod || (contactInfo as any)?.preferred_contact) {
    const mapped = mapPreferredContact(
      contactInfo.preferredContact || contactInfo.preferredContactMethod || (contactInfo as any).preferred_contact
    )
    if (mapped && mapped !== contact.preferred_contact) {
      contact.preferred_contact = mapped
      changed = true
    }
  }

  if (!contact.address && (contactInfo as any)?.address) {
    contact.address = formatAddress((contactInfo as any).address)
    changed = true
  }

  if (!changed) return formData

  const result = { ...formData }
  result.personal_information = personal as any
  result.contact_details = contact as any

  console.log('[fillEmptyFieldsFromClient] Result personal_information:', result.personal_information)
  return result
}

// Note: using any type here for flexibility
export const extractObjectives = (client: any): ClientObjectives | null => {
  if (!client) return null
  return client?.objectives || client?.investmentObjectives || client?.financialProfile?.objectives || client?.assessment?.objectives || null
}

// Note: using any type here for flexibility
export const extractRiskProfile = (client: any): ExtractedRiskProfile => {
  if (!client) {
    return {
      attitudeToRisk: '',
      maxAcceptableLoss: 15,
      riskTolerance: 'Moderate',
      riskCapacity: 'Medium'
    }
  }

  const profile =
    (client?.riskProfile || client?.risk_profile || client?.financialProfile?.riskProfile || {}) as ClientRiskProfile

  return {
    attitudeToRisk: (profile as any).attitudeToRisk || (profile as any).attitude_to_risk || '',
    maxAcceptableLoss: (profile as any).maxLoss || (profile as any).maxAcceptableLoss || (profile as any).max_acceptable_loss || 15,
    riskTolerance: (profile as any).riskTolerance || (profile as any).risk_tolerance || 'Moderate',
    riskCapacity: (profile as any).riskCapacity || (profile as any).risk_capacity || 'Medium'
  }
}
