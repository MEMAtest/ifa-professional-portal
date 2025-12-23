import { redirect } from 'next/navigation'

export default function CFLRedirectPage({ params }: { params: { clientId: string } }) {
  redirect(`/assessments/cfl?clientId=${encodeURIComponent(params.clientId)}`)
}

