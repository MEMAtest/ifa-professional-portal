import { advisorContextService } from '@/services/AdvisorContextService'

type ClientLike = {
  client_ref?: string
  personal_details?: any
  contact_info?: any
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function safeHexColor(value: unknown): string {
  const s = safeString(value)
  if (!s) return ''
  // Allow common hex formats: #RGB, #RRGGBB, #RRGGBBAA
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(s)) return s
  return ''
}

function getClientDisplayName(personalDetails: any): string {
  if (!personalDetails || typeof personalDetails !== 'object') return ''

  const title = safeString(personalDetails.title)
  const firstName = safeString(personalDetails.firstName || personalDetails.first_name)
  const lastName = safeString(personalDetails.lastName || personalDetails.last_name)

  const parts = [title, firstName, lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(' ').trim()

  const fullName = safeString(personalDetails.fullName || personalDetails.full_name)
  if (fullName) return fullName

  const clientName = safeString(personalDetails.clientName || personalDetails.client_name)
  if (clientName) return clientName

  return ''
}

function formatAddress(address: any): string {
  if (!address) return ''
  if (typeof address === 'string') return address.trim()
  if (typeof address !== 'object') return safeString(address)

  const parts = [
    address.line1,
    address.line2,
    address.street,
    address.town,
    address.city,
    address.county,
    address.postcode,
    address.zip,
    address.country
  ]
    .map((p: any) => safeString(p))
    .filter(Boolean)

  return parts.join(', ')
}

export async function buildFirmClientTemplateVariables(args: {
  userId?: string
  firmId: string
  client: ClientLike
  now?: Date
}): Promise<Record<string, any>> {
  const now = args.now || new Date()

  const reportContext = await advisorContextService.getReportContext(args.userId, args.firmId)

  const personalDetails = (args.client as any)?.personal_details
  const contactInfo = (args.client as any)?.contact_info

  const clientName =
    getClientDisplayName(personalDetails) || safeString((args.client as any)?.client_ref) || 'Client'

  const clientEmail = safeString(contactInfo?.email)
  const clientRef = safeString((args.client as any)?.client_ref)
  const clientPhone = safeString(contactInfo?.phone || contactInfo?.mobile)
  const clientAddress = formatAddress(contactInfo?.address)

  return {
    // Core doc metadata
    REPORT_DATE: now.toLocaleDateString('en-GB'),
    GENERATED_AT: now.toISOString(),
    GENERATED_DATE: reportContext.generatedDate,
    COMPLIANCE_REF: reportContext.complianceRef,

    // Client
    CLIENT_NAME: clientName,
    CLIENT_EMAIL: clientEmail,
    CLIENT_REF: clientRef,
    CLIENT_PHONE: clientPhone,
    CLIENT_ADDRESS: clientAddress,

    // Advisor
    ADVISOR_NAME: reportContext.advisorName,
    ADVISOR_TITLE: reportContext.advisorTitle,
    ADVISOR_QUALIFICATIONS: reportContext.advisorQualifications,
    ADVISOR_SIGNATURE_URL: reportContext.advisorSignatureUrl,

    // Firm
    FIRM_NAME: reportContext.firmName,
    FIRM_ADDRESS: reportContext.firmAddress,
    FIRM_PHONE: reportContext.firmPhone,
    FIRM_EMAIL: reportContext.firmEmail,
    FIRM_FCA_NUMBER: reportContext.firmFcaNumber,
    FIRM_WEBSITE: reportContext.firmWebsite,
    FIRM_LOGO_URL: reportContext.firmLogoUrl,
    // Keep colors safe because they're interpolated into CSS in signing templates.
    FIRM_PRIMARY_COLOR: safeHexColor(reportContext.firmPrimaryColor),
    FIRM_ACCENT_COLOR: safeHexColor(reportContext.firmAccentColor),
    FIRM_FOOTER_TEXT: reportContext.firmFooterText
  }
}
