// src/app/assessments/client/[id]/page.tsx
// Thin route wrapper around the client-side assessment hub.

import { AssessmentClientHubPage } from '@/components/assessments/client-hub/AssessmentClientHubPage'

export default function AssessmentClientRoute(props: { params: { id: string } }) {
  return <AssessmentClientHubPage clientId={props.params.id} />
}

