import { BlogPost } from './BlogData'
import { cn } from '@/lib/utils'

type Highlight = NonNullable<BlogPost['highlights']>[number]
type Tone = BlogPost['cover']['tone']

const chartTone = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500'
} as const

interface HighlightTileProps {
  highlight: Highlight
  tone: Tone
  compact?: boolean
}

export const HighlightTile = ({ highlight, tone, compact = false }: HighlightTileProps) => {
  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white shadow-sm', compact ? 'p-4' : 'p-5')}>
      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
        <div className="min-w-0">
          <p className={cn('text-[10px] font-semibold uppercase text-gray-500', compact ? 'tracking-[0.2em]' : 'tracking-[0.25em]')}>
            {highlight.title}
          </p>
          <p className={cn('font-semibold text-gray-900 leading-tight mt-2', compact ? 'text-2xl' : 'text-3xl')}>{highlight.metric}</p>
          <p className={cn('text-gray-600 mt-2', compact ? 'text-xs' : 'text-sm')}>{highlight.detail}</p>
        </div>
        <div className={cn('shrink-0 rounded-xl border border-gray-200 bg-slate-50 flex items-center justify-center', compact ? 'h-10 w-10' : 'h-12 w-12')}>
          <MiniChart type={highlight.chart} tone={tone} />
        </div>
      </div>
      {!compact && (
        <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between text-[10px] text-gray-500">
          <span>Key indicator</span>
          <span className="text-teal-600 font-semibold">Insight</span>
        </div>
      )}
    </div>
  )
}

const MiniChart = ({ type, tone }: { type: Highlight['chart']; tone: Tone }) => {
  const accent = chartTone[tone]

  if (type === 'bars') {
    return (
      <div className="flex h-full w-full items-end justify-center gap-1">
        {[0.45, 0.7, 0.9].map((height, index) => (
          <div
            key={height}
            className={`rounded ${accent}`}
            style={{ height: `${height * 100}%`, width: '18%', opacity: 0.7 + index * 0.1 }}
          />
        ))}
      </div>
    )
  }

  if (type === 'stack') {
    return (
      <div className="flex w-full flex-col gap-2">
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-2 ${accent}`} style={{ width: '70%' }} />
        </div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-2 ${accent}`} style={{ width: '50%' }} />
        </div>
      </div>
    )
  }

  if (type === 'meter') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div className="w-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
          <div className={`${accent} w-2`} style={{ height: '68%' }} />
        </div>
        <div className={`h-2 w-6 rounded-full ${accent}`} />
      </div>
    )
  }

  const strokeClass = accent.replace('bg-', 'text-')

  return (
    <svg className="h-full w-full" viewBox="0 0 64 40" fill="none">
      <path d="M2 30 L16 22 L30 26 L44 14 L62 18" stroke="currentColor" strokeWidth="2" className={strokeClass} />
      <circle cx="16" cy="22" r="2" className={accent} />
      <circle cx="30" cy="26" r="2" className={accent} />
      <circle cx="44" cy="14" r="2" className={accent} />
    </svg>
  )
}
