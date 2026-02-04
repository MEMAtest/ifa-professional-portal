import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
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

  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/')

  // Public routes that don't require authentication
  const publicRoutes = [
    '/', // Redirects to login
    '/marketing', // Marketing landing page (public)
    '/client/assessment', // Client assessment portal (public access via token)
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
    return response
  }

  // Public API routes (webhooks and token-based access)
  const publicApiRoutes = [
    '/api/auth/accept-invite',
    '/api/auth/verify-invite',
    '/api/stripe/webhook',
    '/api/signatures/webhook',
    '/api/health',
    '/api/readiness'
  ]

  const isPublicApiRoute =
    publicApiRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    pathname.startsWith('/api/assessments/share/')

  if (isApiRoute && isPublicApiRoute) {
    return response
  }

  const authHeader =
    request.headers.get('authorization') ?? request.headers.get('Authorization')
  const hasBearerToken = authHeader?.toLowerCase().startsWith('bearer ')

  // Allow API requests that supply a bearer token to be validated by route handlers.
  if (isApiRoute && hasBearerToken) {
    return response
  }

  // Refresh session if expired - required for Server Components.
  // On auth failure, redirect to login for page routes.
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // Auth failed — redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  } catch (error) {
    // Transient errors (network, Supabase outage)
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Redirect to login rather than silently serving a protected page.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
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
