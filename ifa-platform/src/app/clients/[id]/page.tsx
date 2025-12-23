// ===================================================================
// src/app/clients/[id]/page.tsx
// Thin route wrapper around the client-side detail page container
// ===================================================================

import { ClientDetailPage } from '@/components/clients/detail/ClientDetailPage'

export default function ClientDetailRoute(props: { params: { id: string } }) {
  return <ClientDetailPage clientId={props.params.id} />
}

