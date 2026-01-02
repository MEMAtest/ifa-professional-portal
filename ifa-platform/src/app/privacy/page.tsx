import { Metadata } from 'next'
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage'

export const metadata: Metadata = {
  title: 'Privacy Policy | Plannetic',
  description: 'Learn how Plannetic collects, uses, and protects your data.'
}

export default function PrivacyPage() {
  return (
    <MarketingContentPage
      title="Privacy Policy"
      subtitle="How we collect, use, and protect personal data across the Plannetic platform."
      updated="26 Dec 2025"
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p>
          Plannetic provides a secure, FCA-aligned platform for regulated advisers. We collect only the data required to deliver the
          service, improve performance, and meet regulatory obligations. This policy explains what we collect, why we collect it, and
          how it is protected.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Data we collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Account data: name, work email, firm details, and role.</li>
          <li>Client data: suitability, risk, cash flow inputs, and review notes entered by advisers.</li>
          <li>Usage data: audit trails, activity logs, and system events for compliance.</li>
          <li>Technical data: IP address, browser, and device data to keep the platform secure.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">How we use data</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Deliver platform features and enable collaboration within your firm.</li>
          <li>Support FCA compliance through audit trails and evidence capture.</li>
          <li>Improve platform reliability, performance, and user experience.</li>
          <li>Provide security monitoring and fraud prevention.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Data sharing</h2>
        <p>
          We never sell personal data. We only share data with vetted subprocessors that help us operate the platform, such as hosting,
          analytics, and support tooling. All subprocessors are contractually bound to protect data and comply with GDPR.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Retention</h2>
        <p>
          Data is retained for as long as your firm has an active account or as required by regulation. You can export or delete data
          where permitted by your regulatory obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Your rights</h2>
        <p>
          You have the right to access, correct, or request deletion of your personal data. Contact us using the details below and we
          will respond within one business day.
        </p>
        <p className="mt-3">
          Email: <a className="text-teal-600" href="mailto:privacy@plannetic.com">privacy@plannetic.com</a>
        </p>
      </section>
    </MarketingContentPage>
  )
}
