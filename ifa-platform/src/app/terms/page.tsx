import { Metadata } from 'next'
import { MarketingContentPage } from '@/components/marketing/MarketingContentPage'

export const metadata: Metadata = {
  title: 'Terms of Service | Plannetic',
  description: 'Plannetic terms of service for regulated advisory firms.'
}

export default function TermsPage() {
  return (
    <MarketingContentPage
      title="Terms of Service"
      subtitle="The terms that govern access to and use of the Plannetic platform."
      updated="26 Dec 2025"
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Agreement</h2>
        <p>
          By accessing Plannetic, you agree to these terms on behalf of your firm. If you do not agree, you should not use the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Subscriptions and trials</h2>
        <p>
          Trials are provided for evaluation only. Paid subscriptions begin once the trial ends or when you upgrade. Billing is
          per firm unless stated otherwise in your order form.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Acceptable use</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the platform only for lawful, authorised business activity.</li>
          <li>Do not attempt to access data outside your firm or user permissions.</li>
          <li>Do not reverse engineer or interfere with platform security.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Data responsibility</h2>
        <p>
          You are responsible for the accuracy and legality of client data entered into the platform. Plannetic provides controls to
          assist with compliance, but you retain responsibility for advice and regulatory obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Liability</h2>
        <p>
          Plannetic is provided on an &quot;as is&quot; basis. We limit liability to the maximum extent permitted by law and do not accept
          liability for indirect or consequential loss. Full liability terms are provided in the contract agreed with your firm.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Termination</h2>
        <p>
          You may terminate your subscription in line with your contract. Upon termination, we will make data exports available and
          follow retention rules required by regulation.
        </p>
      </section>
    </MarketingContentPage>
  )
}
