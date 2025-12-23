import { redirect } from 'next/navigation'

export default function ATRRedirectPage({ params }: { params: { clientId: string } }) {
  redirect(`/assessments/atr?clientId=${encodeURIComponent(params.clientId)}`)
}

