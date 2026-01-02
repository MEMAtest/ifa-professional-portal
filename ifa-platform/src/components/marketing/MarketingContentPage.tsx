import { MarketingShell } from '@/components/marketing/MarketingShell'
import { cn } from '@/lib/utils'

interface MarketingContentPageProps {
  title: string
  subtitle?: string
  kicker?: string
  updated?: string
  children: React.ReactNode
  tone?: 'default' | 'subtle'
}

export const MarketingContentPage = ({
  title,
  subtitle,
  kicker,
  updated,
  children,
  tone = 'default'
}: MarketingContentPageProps) => {
  return (
    <MarketingShell>
      <section className={cn('py-16 lg:py-20', tone === 'subtle' ? 'bg-slate-50' : 'bg-white')}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            {kicker && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 mb-3">
                {kicker}
              </p>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl">
                {subtitle}
              </p>
            )}
            {updated && (
              <p className="text-sm text-gray-500 mt-3">Last updated: {updated}</p>
            )}
          </div>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            {children}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
