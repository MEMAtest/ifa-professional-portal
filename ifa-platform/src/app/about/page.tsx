import { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { AboutTimeline } from '@/components/marketing/AboutTimeline'
import { AboutHero } from '@/components/marketing/AboutHero'
import { AboutExperience } from '@/components/marketing/AboutExperience'
import { AboutValueProps } from '@/components/marketing/AboutValueProps'
import { AboutComparison } from '@/components/marketing/AboutComparison'
import { FeatureComparison } from '@/components/marketing/FeatureComparison'

export const metadata: Metadata = {
  title: 'About | Plannetic',
  description: 'Learn about Plannetic and our mission to modernise advisory firms.'
}

export default function AboutPage() {
  return (
    <MarketingShell>
      {/* Hero Section - Not Your Typical Firm */}
      <AboutHero />

      {/* Value Propositions */}
      <AboutValueProps />

      {/* Our Firsthand Experience */}
      <AboutExperience />

      {/* Cost Comparison Chart */}
      <AboutComparison />

      {/* Feature Comparison Table */}
      <FeatureComparison />

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600 mb-3">
              Our Journey
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              From consulting to platform
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From regulatory consulting to a purpose-built regtech platform, our timeline shows the milestones that shaped Plannetic.
            </p>
          </div>
          <AboutTimeline />
        </div>
      </section>

      {/* Built for Regulated Firms */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Partner with us
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Whether you are a single adviser or a national firm, we will tailor onboarding and support to your governance structure.
            Get in touch to discuss a plan that fits your operating model.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              Get in touch
            </a>
            <a
              href="/demo"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition-colors"
            >
              Book a demo
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
