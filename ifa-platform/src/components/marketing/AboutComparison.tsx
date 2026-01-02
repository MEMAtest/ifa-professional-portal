'use client'

const timeMetrics = [
  { label: 'Suitability reports', traditional: 4, plannetic: 0.5, unit: 'hrs' },
  { label: 'Annual review prep', traditional: 3, plannetic: 0.25, unit: 'hrs' },
  { label: 'Compliance audits', traditional: 8, plannetic: 1, unit: 'hrs' },
  { label: 'Client onboarding', traditional: 5, plannetic: 1.5, unit: 'hrs' }
]

export const AboutComparison = () => {
  const maxValue = Math.max(...timeMetrics.map(m => m.traditional))

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 mb-3">
            Time Savings
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Reclaim hours every week
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Traditional advisory workflows vs Plannetic&apos;s integrated platform. More time with clients, less time on admin.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Bar Chart */}
          <div className="bg-slate-50 rounded-3xl p-8 border border-gray-200">
            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300" />
                <span className="text-sm text-gray-600">Traditional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-teal-500" />
                <span className="text-sm text-gray-600">Plannetic</span>
              </div>
            </div>

            <div className="space-y-6">
              {timeMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-900">{metric.label}</span>
                    <span className="text-gray-500">
                      {metric.traditional}{metric.unit} → {metric.plannetic}{metric.unit}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-300 rounded-full transition-all duration-700"
                        style={{ width: `${(metric.traditional / maxValue) * 100}%` }}
                      />
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${(metric.plannetic / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-2xl p-6 border border-teal-200/50">
              <div className="text-4xl font-bold text-teal-600 mb-2">75%</div>
              <div className="font-semibold text-gray-900 mb-1">Time saved</div>
              <p className="text-sm text-gray-600">On average across advisory workflows</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200/50">
              <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
              <div className="font-semibold text-gray-900 mb-1">Audit trail</div>
              <p className="text-sm text-gray-600">Every decision documented automatically</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200/50">
              <div className="text-4xl font-bold text-purple-600 mb-2">1</div>
              <div className="font-semibold text-gray-900 mb-1">Platform</div>
              <p className="text-sm text-gray-600">Suitability, modelling, and compliance unified</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-6 border border-amber-200/50">
              <div className="text-4xl font-bold text-amber-600 mb-2">CD</div>
              <div className="font-semibold text-gray-900 mb-1">Consumer Duty Ready</div>
              <p className="text-sm text-gray-600">Fair value & outcome monitoring built-in</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 bg-slate-100 rounded-full px-6 py-3">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-gray-700">
              Average adviser recovers <span className="font-semibold text-gray-900">10+ hours per month</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
