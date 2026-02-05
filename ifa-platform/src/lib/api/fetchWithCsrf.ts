// =====================================================
// FILE: src/lib/api/fetchWithCsrf.ts
// PURPOSE: Fetch wrapper that attaches CSRF token headers
// =====================================================

import { CSRF_HEADER_NAME } from '@/lib/security'
import { getCsrfToken } from '@/lib/security/csrfClient'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function getBaseFetch(): typeof fetch {
  if (typeof window !== 'undefined') {
    const w = window as typeof window & { __csrfOriginalFetch?: typeof fetch }
    if (w.__csrfOriginalFetch) {
      return w.__csrfOriginalFetch
    }
  }
  return fetch
}

function getRequestMethod(input: RequestInfo, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return (input.method || 'GET').toUpperCase()
  }
  return 'GET'
}

function isSameOriginUrl(url: string): boolean {
  if (!url) return true
  if (url.startsWith('/')) return true
  if (typeof window === 'undefined') return false
  return url.startsWith(window.location.origin)
}

function mergeHeaders(existing: HeadersInit | undefined, next: Record<string, string>): Headers {
  const headers = new Headers(existing || {})
  Object.entries(next).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  })
  return headers
}

export async function fetchWithCsrf(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const method = getRequestMethod(input, init)

  if (SAFE_METHODS.has(method)) {
    return getBaseFetch()(input, init)
  }

  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
  if (!isSameOriginUrl(url)) {
    return getBaseFetch()(input, init)
  }

  const token = getCsrfToken()
  if (!token) {
    return getBaseFetch()(input, init)
  }

  const headers = mergeHeaders(init.headers, { [CSRF_HEADER_NAME]: token })
  return getBaseFetch()(input, { ...init, headers })
}

export function installFetchWithCsrf(): void {
  if (typeof window === 'undefined') return
  const w = window as typeof window & { __csrfFetchInstalled?: boolean; __csrfOriginalFetch?: typeof fetch }
  if (w.__csrfFetchInstalled) return

  w.__csrfOriginalFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo, init?: RequestInit) => {
    return fetchWithCsrf(input, init)
  }) as typeof fetch

  w.__csrfFetchInstalled = true
}
