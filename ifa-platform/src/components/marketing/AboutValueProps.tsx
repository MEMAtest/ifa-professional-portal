'use client'

const values = [
  {
    icon: (
      // Unique: Shield with handshake - represents trust & compliance partnership
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5}>
        {/* Shield base */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 3L5 8v7c0 7.2 4.7 13.5 11 15.5 6.3-2 11-8.3 11-15.5V8L16 3z"
        />
        {/* Handshake - left hand */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 15.5c0-1 .8-1.5 1.5-1.5h2l2.5 2"
        />
        {/* Handshake - right hand */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M23 15.5c0-1-.8-1.5-1.5-1.5h-2l-2.5 2"
        />
        {/* Handshake - joined hands */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.5 16l2 2.5h3l2-2.5"
        />
        {/* Decorative sparkle */}
        <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: 'Trustworthy',
    description: 'Built by compliance professionals who understand the regulatory landscape. Every feature is designed with FCA expectations in mind.',
    color: 'teal'
  },
  {
    icon: (
      // Unique: Central hub with connected nodes - enterprise power made simple
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5}>
        {/* Central hub */}
        <circle cx="16" cy="16" r="4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2" fill="currentColor" />
        {/* Top node */}
        <circle cx="16" cy="5" r="2.5" />
        <line x1="16" y1="7.5" x2="16" y2="12" strokeLinecap="round" />
        {/* Top-right node */}
        <circle cx="25.5" cy="10" r="2.5" />
        <line x1="23.5" y1="11.5" x2="19" y2="14" strokeLinecap="round" />
        {/* Bottom-right node */}
        <circle cx="25.5" cy="22" r="2.5" />
        <line x1="23.5" y1="20.5" x2="19" y2="18" strokeLinecap="round" />
        {/* Bottom node */}
        <circle cx="16" cy="27" r="2.5" />
        <line x1="16" y1="24.5" x2="16" y2="20" strokeLinecap="round" />
        {/* Bottom-left node */}
        <circle cx="6.5" cy="22" r="2.5" />
        <line x1="8.5" y1="20.5" x2="13" y2="18" strokeLinecap="round" />
        {/* Top-left node */}
        <circle cx="6.5" cy="10" r="2.5" />
        <line x1="8.5" y1="11.5" x2="13" y2="14" strokeLinecap="round" />
      </svg>
    ),
    title: 'Accessible',
    description: 'Enterprise-grade capability without enterprise complexity. Modern tooling that any adviser can use, regardless of firm size.',
    color: 'blue'
  },
  {
    icon: (
      // Unique: Stacked building blocks with checkmarks - evidence-based layers
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.5}>
        {/* Bottom layer - widest */}
        <rect x="3" y="22" width="26" height="6" rx="1.5" strokeLinecap="round" />
        {/* Middle layer */}
        <rect x="6" y="14" width="20" height="6" rx="1.5" strokeLinecap="round" />
        {/* Top layer - smallest */}
        <rect x="9" y="6" width="14" height="6" rx="1.5" strokeLinecap="round" />
        {/* Checkmark on top layer */}
        <path d="M13 9l1.5 1.5L18 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        {/* Small checkmark on middle */}
        <path d="M14 17l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        {/* Small checkmark on bottom */}
        <path d="M14 25l1 1 2-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        {/* Progress dots on right side */}
        <circle cx="24" cy="25" r="1" fill="currentColor" />
        <circle cx="22" cy="17" r="1" fill="currentColor" />
        <circle cx="20" cy="9" r="1" fill="currentColor" />
      </svg>
    ),
    title: 'Foundational',
    description: 'We provide evidence-based advice infrastructure. Every recommendation is documented, every decision is traceable, every outcome is measurable.',
    color: 'purple'
  }
]

const colorStyles = {
  teal: {
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    line: 'bg-teal-500'
  },
  blue: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    line: 'bg-blue-500'
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    line: 'bg-purple-500'
  }
}

export const AboutValueProps = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 mb-3">
            Why Plannetic
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Built for advisory excellence
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We combine suitability, modelling, and compliance workflows into one platform so every decision is evidence-backed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {values.map((value) => {
            const colors = colorStyles[value.color as keyof typeof colorStyles]
            return (
              <div key={value.title} className="relative group">
                <div className={`absolute top-0 left-0 right-0 h-1 ${colors.line} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="pt-6">
                  <div className={`w-16 h-16 rounded-2xl ${colors.iconBg} ${colors.iconColor} flex items-center justify-center mb-5`}>
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
