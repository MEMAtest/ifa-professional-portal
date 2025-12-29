import type { Client } from '@/types/client'

export const filterClientsBySearch = (clients: Client[], searchTerm: string) => {
  const search = searchTerm.trim().toLowerCase()
  if (!search) return clients

  return clients.filter((client) => {
    const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase()
    const email = client.contactInfo?.email?.toLowerCase() || ''
    return (
      fullName.includes(search) ||
      email.includes(search) ||
      client.clientRef.toLowerCase().includes(search)
    )
  })
}
