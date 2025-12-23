'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { Search, ArrowUpDown, Users, PoundSterling, ExternalLink } from 'lucide-react'

interface RegionClient {
  id: string
  name: string
  aum: number
}

interface RegionClientsModalProps {
  isOpen: boolean
  onClose: () => void
  region: string
  clients: RegionClient[]
  totalAUM: number
  color: string
}

type SortField = 'name' | 'aum'
type SortDirection = 'asc' | 'desc'

export function RegionClientsModal({
  isOpen,
  onClose,
  region,
  clients,
  totalAUM,
  color
}: RegionClientsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('aum')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    result.sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1
      if (sortField === 'name') {
        return multiplier * a.name.localeCompare(b.name)
      }
      return multiplier * (a.aum - b.aum)
    })

    return result
  }, [clients, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'name' ? 'asc' : 'desc')
    }
  }

  // Reset state when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('')
      setSortField('aum')
      setSortDirection('desc')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <DialogTitle className="text-xl">{region} Clients</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-6 mt-2">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-500" />
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <PoundSterling className="h-4 w-4 text-gray-500" />
              {formatCurrency(totalAUM)} total AUM
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative py-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    Client Name
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  <button
                    onClick={() => handleSort('aum')}
                    className="flex items-center gap-1 ml-auto hover:text-gray-900 transition-colors"
                  >
                    AUM
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  % of Region
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    {searchQuery ? 'No clients match your search' : 'No clients in this region'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const percentage = totalAUM > 0 ? (client.aum / totalAUM) * 100 : 0
                  return (
                    <tr
                      key={client.id}
                      className="group hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors"
                          onClick={onClose}
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(client.aum)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: color
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors inline-flex"
                          onClick={onClose}
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Click a client name to view their profile
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
