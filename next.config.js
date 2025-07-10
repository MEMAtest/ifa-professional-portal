/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images configuration
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
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
  
  // 🚨 ADD THIS: Fix build-time database errors and env var injection
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Prevent build-time API calls that cause database errors
    outputFileTracingExcludes: {
      '*': [
        './src/app/api/monte-carlo/**/*',
      ],
    },
  },
  
  // 🚨 ADD THIS: Explicitly inject environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
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