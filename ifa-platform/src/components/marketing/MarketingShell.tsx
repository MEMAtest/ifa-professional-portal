'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MarketingShellProps {
  children: React.ReactNode
}

const navLinks = [
  { label: 'Features', href: '/marketing#features', match: (pathname: string) => pathname.startsWith('/marketing') },
  { label: 'Tour', href: '/marketing#tour', match: (pathname: string) => pathname.startsWith('/marketing') },
  { label: 'Security', href: '/marketing#security', match: (pathname: string) => pathname.startsWith('/marketing') },
  { label: 'Blog', href: '/blog', match: (pathname: string) => pathname.startsWith('/blog') },
  { label: 'Contact', href: '/contact', match: (pathname: string) => pathname === '/contact' }
]

export const MarketingShell = ({ children }: MarketingShellProps) => {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-40 transition-all',
          isScrolled ? 'bg-white/95 shadow-sm backdrop-blur border-b border-gray-200' : 'bg-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/marketing" className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center">P</span>
              <span className="text-lg font-semibold text-gray-900">plannetic</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    link.match(pathname) ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Login
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden p-2 rounded-lg border border-gray-200"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={isMobileOpen}
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>

        {isMobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm font-medium text-gray-700"
                  onClick={() => setIsMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-gray-600"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="pt-20">
        {children}
      </main>

      <Footer />
    </div>
  )
}

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-gray-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">plannetic</span>
            </div>
            <p className="text-sm">Turning Plans into Performance</p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/marketing#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/marketing#tour" className="hover:text-white transition-colors">Tour</Link></li>
              <li><Link href="/marketing#security" className="hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/gdpr" className="hover:text-white transition-colors">GDPR</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm">&copy; {new Date().getFullYear()} Plannetic. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="text-xs flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cyber Essentials Certified
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
