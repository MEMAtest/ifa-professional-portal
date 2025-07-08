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
  
  // 🚨 REMOVED: output: 'standalone' - This breaks Vercel deployment
  // 🚨 REMOVED: removeConsole compiler option - Can cause build issues
  
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
  
  // ✅ VERCEL-SAFE: Minimal experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
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