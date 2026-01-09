import type { SuitabilityFormData } from '@/types/suitability'
import type { ContactInfo } from '@/types/client'

type ContactInfoUpdate = ContactInfo

const pickString = (...values: Array<unknown>): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

const normalizePreferredContact = (value: string | undefined): ContactInfo['preferredContact'] => {
  const normalized = (value || '').toLowerCase()
  if (normalized.includes('mobile')) return 'mobile'
  if (normalized.includes('phone') || normalized.includes('call')) return 'phone'
  if (normalized.includes('post')) return 'post'
  return 'email'
}

export function mapSuitabilityToClientContactInfo(params: {
  formData: SuitabilityFormData
  existingContact?: Partial<ContactInfo> | null
}): ContactInfoUpdate {
  const existing = params.existingContact || {}
  const existingAddress = (existing.address || {}) as Partial<ContactInfo['address']>

  const contact = (params.formData.contact_details || {}) as Record<string, any>
  const components = (contact.addressComponents || {}) as Record<string, any>

  const line1 = pickString(
    contact.address_line_1,
    contact.addressLine1,
    components.line1,
    existingAddress.line1,
    contact.address
  )
  const line2 = pickString(contact.address_line_2, contact.addressLine2, components.line2, existingAddress.line2)
  const city = pickString(contact.city, components.city, existingAddress.city)
  const county = pickString(contact.county, components.county, existingAddress.county)
  const postcode = pickString(contact.postcode, components.postcode, existingAddress.postcode)
  const country = pickString(contact.country, components.country, existingAddress.country, 'United Kingdom')

  return {
    email: pickString(contact.email, existing.email, '') || '',
    phone: pickString(contact.phone, contact.phone_number, existing.phone),
    mobile: pickString(contact.mobile, existing.mobile),
    address: {
      line1: line1 || '',
      line2: line2 || '',
      city: city || '',
      county: county || '',
      postcode: postcode || '',
      country: country || 'United Kingdom'
    },
    preferredContact: normalizePreferredContact(pickString(contact.preferred_contact, existing.preferredContact, 'email')),
    communicationPreferences: existing.communicationPreferences || {
      marketing: false,
      newsletters: false,
      smsUpdates: false
    }
  }
}
