function normalizeRole(role: string | undefined | null): string | null {
  if (!role) return null
  const normalized = role.trim().toLowerCase()
  return normalized ? normalized : null
}

export function isPlatformOwnerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'owner'
}

export function isPlatformAdminUser(user?: {
  email?: string | null
  role?: string | null
  isPlatformAdmin?: boolean | null
}): boolean {
  if (!user) return false
  return Boolean(user.isPlatformAdmin) || isPlatformOwnerRole(user.role)
}
