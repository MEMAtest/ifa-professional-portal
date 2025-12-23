// =====================================================
// FILE: src/app/assessments/suitability-clients/[clientId]/page.tsx
// Deprecated route: redirect to canonical Suitability form.
// =====================================================

import { redirect } from 'next/navigation'

export default async function SuitabilityClientRedirectPage({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  redirect(`/assessments/suitability?clientId=${clientId}`)
}

