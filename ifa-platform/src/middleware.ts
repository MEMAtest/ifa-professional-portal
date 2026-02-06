import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { CSRF_COOKIE_NAME, csrfError, validateCsrfWithExemptions, withCsrfCookie } from '@/lib/security'

export async function middleware(request: NextRequest) {
  // Generate per-request nonce for Content Security Policy (128 bits of entropy)
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')

  // Build CSP BEFORE creating the response so it can be set on request headers.
  // Next.js reads the CSP from the request header to detect nonce mode and
  // automatically applies nonce="..." to its inline <script> tags.
  const pathname = request.nextUrl.pathname
  const isDev = process.env.NODE_ENV === 'development'
  const isPreviewRoute = pathname.startsWith('/api/documents/preview/')

  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com`

  const isSignRoute = pathname.startsWith('/sign/') || pathname.startsWith('/api/public/sign/')
  const frameAncestors = (isPreviewRoute || isSignRoute)
    ? "frame-ancestors 'self' https://www.plannetic.com https://plannetic.com"
    : "frame-ancestors 'none'"

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    frameAncestors,
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    scriptSrc,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "child-src 'self' blob: data:",
    "frame-src 'self' blob: data: https://js.stripe.com",
  ].join('; ')

  // Set nonce AND CSP on request headers so Next.js applies nonces to inline scripts
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Helper: apply CSRF cookie + CSP header to any response
  const finalizeResponse = (res: NextResponse) => {
    const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
    res.headers.set('Content-Security-Policy', csp)
    return withCsrfCookie(res, existingToken || undefined)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return finalizeResponse(response)
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const isApiRoute = pathname.startsWith('/api/')

  // Public routes that don't require authentication
  const publicRoutes = [
    '/', // Redirects to login
    '/marketing', // Marketing landing page (public)
    '/client/assessment', // Client assessment portal (public access via token)
    '/sign', // Public e-signature pages (token-based, no auth required)
    '/login',
    '/signup',
    '/auth',
    '/forgot-password',
    '/reset-password'
  ]

  const isPublicRoute = publicRoutes.some(route => {
    // Exact match for root path to avoid matching all routes
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })

  // Skip auth check for public routes
  if (isPublicRoute) {
    return finalizeResponse(response)
  }

  // Public API routes (webhooks and token-based access)
  const publicApiRoutes = [
    '/api/auth/accept-invite',
    '/api/auth/verify-invite',
    '/api/stripe/webhook',
    '/api/signatures/webhook',
    '/api/public/sign', // Public e-signature API (token-based, no auth required)
    '/api/health',
    '/api/readiness'
  ]

  const isPublicApiRoute =
    publicApiRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    pathname.startsWith('/api/assessments/share/')

  if (isApiRoute && isPublicApiRoute) {
    return finalizeResponse(response)
  }

  const authHeader =
    request.headers.get('authorization') ?? request.headers.get('Authorization')
  const hasBearerToken = authHeader?.toLowerCase().startsWith('bearer ')

  // CSRF validation for state-changing requests (skip for Bearer-token requests
  // which are inherently CSRF-safe — the Authorization header cannot be set
  // cross-origin without CORS preflight approval)
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  if (isApiRoute && isStateChanging && !hasBearerToken) {
    const csrfValid = await validateCsrfWithExemptions(request)
    if (!csrfValid) {
      return finalizeResponse(csrfError())
    }
  }

  // Allow API requests that supply a bearer token to be validated by route handlers.
  if (isApiRoute && hasBearerToken) {
    return finalizeResponse(response)
  }

  // Refresh session if expired - required for Server Components.
  // On auth failure, redirect to login for page routes.
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      if (isApiRoute) {
        return finalizeResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }
      // Auth failed — redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return finalizeResponse(NextResponse.redirect(loginUrl))
    }
  } catch (error) {
    // Transient errors (network, Supabase outage)
    if (isApiRoute) {
      return finalizeResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    // Redirect to login rather than silently serving a protected page.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return finalizeResponse(NextResponse.redirect(loginUrl))
  }

  return finalizeResponse(response)
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
