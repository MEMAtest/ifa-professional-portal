import { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { ContactForm } from '@/components/marketing/ContactForm'
import { ContactFAQ } from '@/components/marketing/ContactFAQ'

export const metadata: Metadata = {
  title: 'Contact | Plannetic',
  description: 'Get in touch with the Plannetic team.'
}

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="bg-slate-50 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 mb-3">Contact</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Let us know what you need</h1>
              <p className="text-lg text-gray-600 mb-6">
                We help advisory firms streamline suitability, modelling, and compliance workflows. Tell us about your firm and the
                outcomes you want to achieve.
              </p>

              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900">Sales and demos</p>
                  <p className="text-sm text-gray-600">Book a walkthrough with our advisory specialists.</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900">Security and compliance</p>
                  <p className="text-sm text-gray-600">Request our controls pack and data processing agreement.</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900">Support</p>
                  <p className="text-sm text-gray-600">Existing customers can reach support at support@plannetic.com.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <ContactFAQ />
    </MarketingShell>
  )
}
