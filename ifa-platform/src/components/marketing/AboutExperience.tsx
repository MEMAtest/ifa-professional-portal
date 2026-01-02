'use client'

export const AboutExperience = () => {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 mb-4">
              Our Firsthand Experience
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              We&apos;ve been on both sides of the table
            </h2>

            <div className="space-y-5 text-gray-700 leading-relaxed">
              <p className="text-lg">
                We started looking for an investment management provider to help manage our own portfolios. What we found was frustrating:
                <span className="font-semibold text-gray-900"> it was nearly impossible to see the actual results of our investments.</span>
              </p>

              <p>
                In 2019 and 2020, we worked closely with an advisory firm. We saw firsthand how much time advisers spent wrestling with spreadsheets,
                chasing documentation, and trying to demonstrate suitability. The tools available simply weren&apos;t built for the way modern advice works.
              </p>

              <p>
                That experience became the catalyst for Plannetic. We realised that investment management firms and their advisers deserve better:
                clear visibility into outcomes, streamlined compliance, and tools that actually make their work easier.
              </p>

              <blockquote className="border-l-4 border-teal-500 pl-5 py-2 my-6 bg-white rounded-r-lg">
                <p className="text-gray-900 font-medium italic">
                  &ldquo;We built what we wished existed when we were clients looking for transparency, and what advisers told us they needed to serve those clients better.&rdquo;
                </p>
              </blockquote>
            </div>
          </div>

          {/* Visual Timeline of Pain Points */}
          <div className="relative">
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">What we experienced</h3>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Opaque investment results</p>
                    <p className="text-sm text-gray-600">Couldn&apos;t see real performance against goals</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Fragmented documentation</p>
                    <p className="text-sm text-gray-600">Evidence scattered across systems</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Manual compliance burden</p>
                    <p className="text-sm text-gray-600">Hours lost to spreadsheets and admin</p>
                  </div>
                </div>

                <div className="h-px bg-gray-200 my-6" />

                <h4 className="text-lg font-bold text-gray-900 mb-4">What we built instead</h4>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Transparent outcomes</p>
                    <p className="text-sm text-gray-600">Clear visibility into performance and goals</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Unified evidence trail</p>
                    <p className="text-sm text-gray-600">Everything in one auditable platform</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Automated workflows</p>
                    <p className="text-sm text-gray-600">More time for clients, less for admin</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 -top-4 -right-4 w-full h-full bg-teal-100/50 rounded-3xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
