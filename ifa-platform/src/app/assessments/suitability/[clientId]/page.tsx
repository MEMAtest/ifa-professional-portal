import { redirect } from 'next/navigation'

export default function SuitabilityRedirectPage({ params }: { params: { clientId: string } }) {
  redirect(`/assessments/suitability?clientId=${encodeURIComponent(params.clientId)}`)
}

