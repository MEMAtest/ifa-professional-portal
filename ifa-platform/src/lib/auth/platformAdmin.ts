const DEFAULT_PLATFORM_ADMINS = ['ademola@memaconsultants.com']

function parseEmailList(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeRole(role: string | undefined | null): string | null {
  if (!role) return null
  const normalized = role.trim().toLowerCase()
  return normalized ? normalized : null
}

export function isPlatformOwnerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'owner'
}

export function isPlatformAdminUser(user?: { email?: string | null; role?: string | null }): boolean {
  if (!user) return false
  return isPlatformAdminEmail(user.email) || isPlatformOwnerRole(user.role)
}

export function getPlatformAdminEmails(): string[] {
  const envList = parseEmailList(
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS ?? process.env.PLATFORM_ADMIN_EMAILS
  )
  if (!envList.length) return DEFAULT_PLATFORM_ADMINS
  return Array.from(new Set([...DEFAULT_PLATFORM_ADMINS, ...envList]))
}

export function isPlatformAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return getPlatformAdminEmails().includes(normalized)
}
