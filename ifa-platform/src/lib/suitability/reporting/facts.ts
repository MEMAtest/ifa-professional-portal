import type { SuitabilityFormData } from '@/types/suitability'
import type { SuitabilityReportFacts } from './types'
import { asObject, asTrimmedString, parseOptionalNumber, splitLines } from './utils'

export function detectFacts(formData: SuitabilityFormData): SuitabilityReportFacts {
  const pi = asObject(formData.personal_information)
  const existing = asObject(formData.existing_arrangements)

  const maritalStatus = asTrimmedString(pi.marital_status)?.toLowerCase()
  const hasPartner =
    maritalStatus === 'married' || maritalStatus === 'civil partnership' || Boolean(asTrimmedString(pi.partner_name))

  const dependents = parseOptionalNumber(pi.dependents) ?? 0
  const hasDependants = dependents > 0

  const hasPensionsRaw = asTrimmedString(existing.has_pension)
  const hasPensions = hasPensionsRaw === 'Yes' ? true : hasPensionsRaw === 'No' ? false : null

  const pensionSchemeRaw = asTrimmedString((pi as any).pension_scheme)?.toLowerCase()
  const pensionTypes = splitLines((existing as any).pension_type).map((v) => v.toLowerCase())
  const hasDbPension =
    hasPensions === false
      ? false
      : pensionSchemeRaw
        ? pensionSchemeRaw === 'defined benefit'
        : pensionTypes.length
          ? pensionTypes.some((v) => v.includes('defined benefit') || v.includes('(db)'))
          : null

  const protectionSelections = splitLines(existing.has_protection)
  const hasProtection =
    protectionSelections.length === 0 ? null : protectionSelections.some((v) => String(v).toLowerCase() !== 'none')

  const dbTransferRaw = asTrimmedString((existing as any).db_transfer_considered)
  const dbTransferConsidered = dbTransferRaw === 'Yes' ? true : dbTransferRaw === 'No' ? false : null

  return {
    hasPartner,
    hasDependants,
    hasPensions,
    hasDbPension,
    hasProtection,
    dbTransferConsidered
  }
}

