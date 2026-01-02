import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BlogCoverProps {
  tone: 'teal' | 'blue' | 'amber'
  icon: 'compliance' | 'suitability' | 'planning'
  label: string
  imageSrc?: string
  imageAlt?: string
  compact?: boolean
}

const toneStyles = {
  teal: {
    wrapper: 'bg-teal-50 border-teal-100',
    icon: 'bg-teal-600 text-white',
    label: 'text-teal-700'
  },
  blue: {
    wrapper: 'bg-blue-50 border-blue-100',
    icon: 'bg-blue-600 text-white',
    label: 'text-blue-700'
  },
  amber: {
    wrapper: 'bg-amber-50 border-amber-100',
    icon: 'bg-amber-600 text-white',
    label: 'text-amber-700'
  }
} as const

export const BlogCover = ({ tone, icon, label, imageSrc, imageAlt, compact }: BlogCoverProps) => {
  const palette = toneStyles[tone]

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 flex items-center gap-4',
        palette.wrapper,
        compact ? 'h-24' : 'h-36'
      )}
    >
      {imageSrc ? (
        <div className={cn('relative overflow-hidden rounded-2xl', compact ? 'h-16 w-28' : 'h-24 w-40')}>
          <Image
            src={imageSrc}
            alt={imageAlt || label}
            fill
            className="object-cover"
            sizes={compact ? '112px' : '160px'}
          />
        </div>
      ) : (
        <div className={cn('flex items-center justify-center rounded-2xl', palette.icon, compact ? 'h-12 w-12' : 'h-16 w-16')}>
          <CoverIcon type={icon} compact={compact} />
        </div>
      )}
      <div className="flex-1">
        <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', palette.label)}>{label}</p>
        <p className="text-sm text-gray-700 mt-2">Structured guidance and evidence-ready outputs.</p>
      </div>
    </div>
  )
}

const CoverIcon = ({ type, compact }: { type: BlogCoverProps['icon']; compact?: boolean }) => {
  const size = compact ? 22 : 28

  if (type === 'suitability') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M2 12l5 5" />
        <path d="M2 6h8" />
        <path d="M2 18h8" />
      </svg>
    )
  }

  if (type === 'planning') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M6 15l4-4 4 3 5-7" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
