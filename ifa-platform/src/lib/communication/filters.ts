import type { CommunicationItem } from '@/components/communication/types'

export type CommunicationTypeFilter = 'all' | 'call' | 'email'
export type CommunicationDirectionFilter = 'all' | 'inbound' | 'outbound'

export const filterCommunications = (
  communications: CommunicationItem[],
  searchTerm: string,
  filterType: CommunicationTypeFilter,
  filterDirection: CommunicationDirectionFilter
) => {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  return communications.filter((comm) => {
    const matchesSearch =
      normalizedSearch === '' ||
      comm.client_name.toLowerCase().includes(normalizedSearch) ||
      comm.client_ref.toLowerCase().includes(normalizedSearch) ||
      comm.subject.toLowerCase().includes(normalizedSearch)

    const matchesType = filterType === 'all' || comm.communication_type === filterType
    const matchesDirection = filterDirection === 'all' || comm.direction === filterDirection

    return matchesSearch && matchesType && matchesDirection
  })
}

export const getFollowUps = (communications: CommunicationItem[]) =>
  communications.filter((comm) => comm.requires_followup && !comm.followup_completed)

export const getMessages = (communications: CommunicationItem[]) =>
  communications.filter((comm) => comm.communication_type === 'email')

export const getCalls = (communications: CommunicationItem[]) =>
  communications.filter((comm) => comm.communication_type === 'call')
