// =====================================================
// FILE: src/lib/security/csrfClient.ts
// PURPOSE: Client-side helpers for CSRF token access
// =====================================================

import { CSRF_COOKIE_NAME } from '@/lib/security/csrfConstants'

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}
