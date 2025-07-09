// ===== FILE #4: next.config.js =====
// CHANGE: Add explicit env injection (ADD 3 LINES)

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
  
  // 🔧 ADD THIS: Explicit environment variable injection
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Security headers (NO CHANGES)
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
  // Redirects (NO CHANGES)
  async redirects() {
    return [
      {
        source: '/assessment',
        destination: '/assessments',
        permanent: true,
      },
    ]
  },
  // ✅ VERCEL-SAFE: Minimal experimental features (NO CHANGES)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Remove powered by header (NO CHANGES)
  poweredByHeader: false,
  // Enable compression (Vercel handles this) (NO CHANGES)
  compress: true,
  // Generate ETags (NO CHANGES)
  generateEtags: true,
  // Page extensions (NO CHANGES)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // No trailing slash (NO CHANGES)
  trailingSlash: false,
}

module.exports = nextConfig
