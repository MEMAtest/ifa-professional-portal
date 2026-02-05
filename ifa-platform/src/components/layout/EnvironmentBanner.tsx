'use client'

/**
 * Environment Banner
 * Shows a banner for non-production environments (UAT, Demo, Preview)
 */

import { useEffect, useState } from 'react'

export function EnvironmentBanner() {
  const [resolvedEnv, setResolvedEnv] = useState<string | null>(
    process.env.NEXT_PUBLIC_ENV || null
  )

  useEffect(() => {
    if (resolvedEnv) return
    if (typeof window === 'undefined') return

    const host = window.location.hostname
    if (host.startsWith('demo.')) {
      setResolvedEnv('demo')
      return
    }
    if (host.includes('vercel.app')) {
      setResolvedEnv('preview')
      return
    }
    if (host === 'localhost' || host.endsWith('.local')) {
      setResolvedEnv('development')
      return
    }

    setResolvedEnv('development')
  }, [resolvedEnv])

  // Don't show in production
  if (!resolvedEnv || resolvedEnv === 'production') return null

  const config: Record<string, { bg: string; text: string; label: string; message: string }> = {
    demo: {
      bg: 'bg-blue-600',
      text: 'text-white',
      label: 'DEMO',
      message: 'This is a demo environment with sample data'
    },
    uat: {
      bg: 'bg-amber-500',
      text: 'text-amber-950',
      label: 'UAT',
      message: 'User Acceptance Testing - Changes do not affect production'
    },
    staging: {
      bg: 'bg-purple-600',
      text: 'text-white',
      label: 'STAGING',
      message: 'Staging environment - Final review before production'
    },
    development: {
      bg: 'bg-gray-700',
      text: 'text-white',
      label: 'DEV',
      message: 'Local development environment'
    },
    preview: {
      bg: 'bg-emerald-600',
      text: 'text-white',
      label: 'PREVIEW',
      message: 'Preview deployment'
    }
  }

  const { bg, text, label, message } = config[resolvedEnv] || config.development

  return (
    <div className={`${bg} ${text} text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2`}>
      <span className="font-bold text-xs px-2 py-0.5 bg-black/20 rounded">{label}</span>
      <span>{message}</span>
    </div>
  )
}
