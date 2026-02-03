/** @type {import('next').NextConfig} */
function getDevPortFromArgv() {
  const argv = Array.isArray(process.argv) ? process.argv : []
  const idx = argv.findIndex((arg) => arg === '-p' || arg === '--port')
  const value = idx !== -1 ? argv[idx + 1] : undefined
  return value || process.env.PORT || process.env.NEXT_PORT
}

const isDev = process.env.NODE_ENV === 'development'
const devPort = getDevPortFromArgv()

const baseContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com"
].join('; ')

const previewContentSecurityPolicy = baseContentSecurityPolicy.replace(
  "frame-ancestors 'none'",
  "frame-ancestors 'self' https://www.plannetic.com https://plannetic.com"
)

const nextConfig = {
  // Avoid .next corruption when multiple `next dev` processes run concurrently.
  // Each port gets an isolated output dir.
  distDir: isDev && devPort ? `.next-dev-${devPort}` : '.next',

  // Images configuration
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'plannetic.com',
      },
      {
        protocol: 'https',
        hostname: '*.plannetic.com',
      },
    ],
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },

  // Force all API routes to be dynamic
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // React-PDF relies on the full React runtime (not the `react-server` export
    // condition used by Next's RSC bundler). Externalising these packages
    // prevents Next from bundling them and avoids runtime errors like
    // `Component is not a constructor` in Route Handlers.
    serverComponentsExternalPackages: [
      '@react-pdf/renderer',
      '@react-pdf/reconciler',
      'pdf-to-img',
      'pdfjs-dist',
      'tesseract.js',
    ],
    // Prevent build-time API calls
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
      ],
    },
    // Ensure native render deps are bundled for PDF extraction
    outputFileTracingIncludes: {
      '*': [
        'node_modules/pdf-to-img/**',
        'node_modules/pdfjs-dist/**',
        'node_modules/@napi-rs/canvas/**',
        'node_modules/@napi-rs/canvas-*/**',
      ],
    },
  },

  // Explicitly inject environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Security headers
  async headers() {
    return [
      // Allow document preview routes to be embedded in iframes
      {
        source: '/api/documents/preview/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: previewContentSecurityPolicy,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      // Default security headers for all other routes
      {
        source: '/((?!api/documents/preview).*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: baseContentSecurityPolicy,
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/assessment',
        destination: '/assessments',
        permanent: true,
      },
    ]
  },
  
  // Remove powered by header
  poweredByHeader: false,
  // Enable compression (Vercel handles this)
  compress: true,
  // Generate ETags
  generateEtags: true,
  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // No trailing slash
  trailingSlash: false,
}

module.exports = nextConfig
