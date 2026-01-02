'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const milestones = [
  {
    year: '2019',
    title: 'Foundation',
    tag: 'Founded',
    summary: 'Started as regulatory consultants helping advisory firms build FCA-ready governance and oversight.',
    bullets: [
      'Audit-ready governance playbooks',
      'Early compliance delivery for regulated firms'
    ],
    tone: 'teal',
    icon: 'foundation',
    animation: 'float'
  },
  {
    year: '2020',
    title: 'Delivery',
    tag: 'Expanded',
    summary: 'Scaled delivery with consistent review cadences and reporting across regulated client work.',
    bullets: [
      'Repeatable monitoring routines',
      'Structured review outputs'
    ],
    tone: 'blue',
    icon: 'delivery',
    animation: 'slide'
  },
  {
    year: '2021',
    title: 'Consistency',
    tag: 'Strengthened',
    summary: 'Strengthened frameworks so suitability evidence is clear, consistent, and reviewable.',
    bullets: [
      'Improved evidence quality',
      'Aligned coverage across teams'
    ],
    tone: 'amber',
    icon: 'consistency',
    animation: 'pulse'
  },
  {
    year: '2022',
    title: 'R&D',
    tag: 'Explored',
    summary: 'Explored automation and data models to reduce admin load and improve oversight.',
    bullets: [
      'Mapped future operating data model',
      'Validated demand for a unified platform'
    ],
    tone: 'purple',
    icon: 'research',
    animation: 'scan'
  },
  {
    year: '2023',
    title: 'Platform',
    tag: 'Formed',
    summary: 'Formed the regtech build, defining FCA-aligned workflows and platform architecture.',
    bullets: [
      'Governance-first workflows',
      'Product architecture defined'
    ],
    tone: 'emerald',
    icon: 'platform',
    animation: 'orbit'
  },
  {
    year: '2025',
    title: 'Pilot',
    tag: 'Prototype',
    summary: 'Built and tested a working prototype with advisory firms to validate outcomes.',
    bullets: [
      'Validated cash flow and suitability tooling',
      'Captured compliance feedback'
    ],
    tone: 'sky',
    icon: 'pilot',
    animation: 'bounce'
  },
  {
    year: '2026',
    title: 'Release',
    tag: 'Launch',
    summary: 'Launching Plannetic with production-ready workflows and analytics for regulated firms.',
    bullets: [
      'Full platform rollout',
      'Operational onboarding support'
    ],
    tone: 'rose',
    icon: 'launch',
    animation: 'rocket'
  }
]

const toneStyles = {
  teal: {
    tag: 'bg-teal-100 text-teal-700',
    tagActive: 'bg-teal-500 text-white',
    icon: 'bg-teal-500 text-white',
    ring: 'ring-teal-300',
    dot: 'border-teal-400',
    dotActive: 'bg-teal-500 border-teal-500',
    accent: 'text-teal-600'
  },
  blue: {
    tag: 'bg-blue-100 text-blue-700',
    tagActive: 'bg-blue-500 text-white',
    icon: 'bg-blue-500 text-white',
    ring: 'ring-blue-300',
    dot: 'border-blue-400',
    dotActive: 'bg-blue-500 border-blue-500',
    accent: 'text-blue-600'
  },
  amber: {
    tag: 'bg-amber-100 text-amber-700',
    tagActive: 'bg-amber-500 text-white',
    icon: 'bg-amber-500 text-white',
    ring: 'ring-amber-300',
    dot: 'border-amber-400',
    dotActive: 'bg-amber-500 border-amber-500',
    accent: 'text-amber-600'
  },
  purple: {
    tag: 'bg-purple-100 text-purple-700',
    tagActive: 'bg-purple-500 text-white',
    icon: 'bg-purple-500 text-white',
    ring: 'ring-purple-300',
    dot: 'border-purple-400',
    dotActive: 'bg-purple-500 border-purple-500',
    accent: 'text-purple-600'
  },
  emerald: {
    tag: 'bg-emerald-100 text-emerald-700',
    tagActive: 'bg-emerald-500 text-white',
    icon: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-300',
    dot: 'border-emerald-400',
    dotActive: 'bg-emerald-500 border-emerald-500',
    accent: 'text-emerald-600'
  },
  sky: {
    tag: 'bg-sky-100 text-sky-700',
    tagActive: 'bg-sky-500 text-white',
    icon: 'bg-sky-500 text-white',
    ring: 'ring-sky-300',
    dot: 'border-sky-400',
    dotActive: 'bg-sky-500 border-sky-500',
    accent: 'text-sky-600'
  },
  rose: {
    tag: 'bg-rose-100 text-rose-700',
    tagActive: 'bg-rose-500 text-white',
    icon: 'bg-rose-500 text-white',
    ring: 'ring-rose-300',
    dot: 'border-rose-400',
    dotActive: 'bg-rose-500 border-rose-500',
    accent: 'text-rose-600'
  }
} as const

type ToneKey = keyof typeof toneStyles

type IconType = 'foundation' | 'delivery' | 'consistency' | 'research' | 'platform' | 'pilot' | 'launch'

type AnimationType = 'float' | 'slide' | 'pulse' | 'scan' | 'orbit' | 'bounce' | 'rocket'

export const AboutTimeline = () => {
  const [activeYear, setActiveYear] = useState(milestones[0].year)
  const active = milestones.find((milestone) => milestone.year === activeYear) ?? milestones[0]
  const activeTone = toneStyles[active.tone as ToneKey]

  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Year Selector Pills */}
      <div className="bg-slate-50 border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {milestones.map((milestone) => {
            const isActive = milestone.year === activeYear
            const palette = toneStyles[milestone.tone as ToneKey]

            return (
              <button
                key={milestone.year}
                type="button"
                onClick={() => setActiveYear(milestone.year)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                  isActive
                    ? `${palette.tagActive} shadow-md scale-105`
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                )}
              >
                {milestone.year}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] min-h-[400px]">
        {/* Timeline Navigation */}
        <div className="relative border-r border-gray-100 bg-slate-50/50 py-6 px-4 hidden lg:block">
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200" />
          <ol className="space-y-1 relative">
            {milestones.map((milestone, index) => {
              const isActive = milestone.year === activeYear
              const palette = toneStyles[milestone.tone as ToneKey]

              return (
                <li key={milestone.year} className="relative pl-8">
                  <span
                    className={cn(
                      'absolute left-[6px] top-4 h-3.5 w-3.5 rounded-full border-2 bg-white transition-all duration-200',
                      isActive ? palette.dotActive : palette.dot,
                      isActive && `ring-4 ring-opacity-30 ${palette.ring} scale-110`
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setActiveYear(milestone.year)}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left transition-all duration-200',
                      isActive
                        ? 'bg-white shadow-sm border border-gray-200'
                        : 'hover:bg-white/70'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className={cn(
                          'text-lg font-bold transition-colors',
                          isActive ? palette.accent : 'text-gray-500'
                        )}>
                          {milestone.year}
                        </p>
                        <p className={cn(
                          'text-sm transition-colors',
                          isActive ? 'text-gray-700' : 'text-gray-400'
                        )}>
                          {milestone.title}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Detail Panel */}
        <div className="p-8 lg:p-10">
          <div
            key={active.year}
            className="timeline-detail"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={cn(
                'text-xs font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full',
                activeTone.tagActive
              )}>
                {active.tag}
              </span>
              <span className={cn('text-sm font-medium', activeTone.accent)}>
                {active.year}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start gap-8">
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                  {active.title}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  {active.summary}
                </p>
                <ul className="space-y-3">
                  {active.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className={cn(
                        'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5',
                        activeTone.icon
                      )}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-gray-700 font-medium">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0">
                <div
                  className={cn(
                    'h-20 w-20 lg:h-24 lg:w-24 rounded-2xl flex items-center justify-center shadow-lg',
                    activeTone.icon,
                    `timeline-${active.animation}`
                  )}
                >
                  <TimelineIcon type={active.icon as IconType} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .timeline-detail {
          animation: timeline-detail 0.3s ease-out;
        }
        .timeline-float {
          animation: timeline-float 2.6s ease-in-out infinite;
        }
        .timeline-slide {
          animation: timeline-slide 2.6s ease-in-out infinite;
        }
        .timeline-pulse {
          animation: timeline-pulse 2.2s ease-in-out infinite;
        }
        .timeline-scan {
          animation: timeline-scan 2.8s ease-in-out infinite;
        }
        .timeline-orbit {
          animation: timeline-orbit 2.6s ease-in-out infinite;
        }
        .timeline-bounce {
          animation: timeline-bounce 2.4s ease-in-out infinite;
        }
        .timeline-rocket {
          animation: timeline-rocket 2.4s ease-in-out infinite;
        }
        .rocket-flame {
          animation: rocket-flame 1.2s ease-in-out infinite;
        }
        @keyframes timeline-detail {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes timeline-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes timeline-slide {
          0% { transform: translateX(0); }
          50% { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
        @keyframes timeline-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes timeline-scan {
          0% { transform: translateX(-4px); }
          50% { transform: translateX(6px); }
          100% { transform: translateX(-4px); }
        }
        @keyframes timeline-orbit {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes timeline-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes timeline-rocket {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes rocket-flame {
          0%, 100% { transform: scaleY(0.8); opacity: 0.7; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const TimelineIcon = ({ type }: { type: IconType }) => {
  if (type === 'foundation') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10h18" />
        <path d="M5 10v8" />
        <path d="M9 10v8" />
        <path d="M15 10v8" />
        <path d="M19 10v8" />
        <path d="M2 18h20" />
      </svg>
    )
  }

  if (type === 'delivery') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="11" height="8" />
        <path d="M14 11h4l3 3v1h-7" />
        <circle cx="7" cy="17" r="1.5" />
        <circle cx="18" cy="17" r="1.5" />
      </svg>
    )
  }

  if (type === 'consistency') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M5 7h14" />
        <path d="M7 7l-2 4h14l-2-4" />
      </svg>
    )
  }

  if (type === 'research') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="5" />
        <path d="M21 21l-4.3-4.3" />
        <path d="M8 11h6" />
        <path d="M11 8v6" />
      </svg>
    )
  }

  if (type === 'platform') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 6h8M6 8v8M18 8v8M8 18h8" />
      </svg>
    )
  }

  if (type === 'pilot') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6" />
        <path d="M10 3v7l-4 7a2 2 0 002 3h8a2 2 0 002-3l-4-7V3" />
      </svg>
    )
  }

  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l4 7-4 3-4-3 4-7z" />
      <path d="M9 12l-3 8h12l-3-8" />
      <path className="rocket-flame" d="M12 20v2" />
    </svg>
  )
}
