const DEFAULT_PLATFORM_ADMINS = ['ademola@memaconsultants.com']

function parseEmailList(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function getPlatformAdminEmails(): string[] {
  const envList = parseEmailList(
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS ?? process.env.PLATFORM_ADMIN_EMAILS
  )
  return envList.length ? envList : DEFAULT_PLATFORM_ADMINS
}

export function isPlatformAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return getPlatformAdminEmails().includes(normalized)
}
