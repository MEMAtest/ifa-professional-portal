import { useMemo, useState } from 'react'
import {
  filterCommunications,
  getCalls,
  getFollowUps,
  getMessages,
  type CommunicationDirectionFilter,
  type CommunicationTypeFilter
} from '@/lib/communication/filters'
import type { CommunicationItem } from '@/components/communication/types'

export const useCommunicationFilters = (communications: CommunicationItem[]) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<CommunicationTypeFilter>('all')
  const [filterDirection, setFilterDirection] = useState<CommunicationDirectionFilter>('all')

  const filteredCommunications = useMemo(() => {
    return filterCommunications(communications, searchTerm, filterType, filterDirection)
  }, [communications, filterDirection, filterType, searchTerm])

  const followUps = useMemo(() => getFollowUps(communications), [communications])
  const messages = useMemo(() => getMessages(communications), [communications])
  const calls = useMemo(() => getCalls(communications), [communications])

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterDirection,
    setFilterDirection,
    filteredCommunications,
    followUps,
    messages,
    calls
  }
}
