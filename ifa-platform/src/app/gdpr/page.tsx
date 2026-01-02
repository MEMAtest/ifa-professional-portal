import { Metadata } from 'next'
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage'

export const metadata: Metadata = {
  title: 'GDPR | Plannetic',
  description: 'Plannetic GDPR compliance overview and data subject rights.'
}

export default function GDPRPage() {
  return (
    <MarketingContentPage
      title="GDPR Compliance"
      subtitle="Our approach to GDPR, data protection, and data subject rights."
      updated="26 Dec 2025"
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Lawful basis</h2>
        <p>
          Plannetic processes data to deliver contracted services to regulated firms and to meet legal and regulatory obligations.
          We use legitimate interests for platform security and service improvement.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Data subject rights</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Right to access your personal data.</li>
          <li>Right to rectification or erasure where applicable.</li>
          <li>Right to restriction or objection to processing.</li>
          <li>Right to data portability for supported exports.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Security controls</h2>
        <p>
          We maintain encryption in transit and at rest, role-based access controls, immutable audit trails, and UK data residency
          to safeguard client data. Subprocessors are vetted and contractually required to meet GDPR obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">DPA and subprocessors</h2>
        <p>
          A Data Processing Agreement is available for regulated firms. We maintain a current list of subprocessors and notify
          firms of any material changes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
        <p>
          For GDPR requests, contact our privacy team at <a className="text-teal-600" href="mailto:privacy@plannetic.com">privacy@plannetic.com</a>.
        </p>
      </section>
    </MarketingContentPage>
  )
}
