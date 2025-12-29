'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { ClientMarketView } from './ClientMarketView'

interface ClientMarketViewModalProps {
  clientId: string | null
  isOpen: boolean
  onClose: () => void
}

export function ClientMarketViewModal({ clientId, isOpen, onClose }: ClientMarketViewModalProps) {
  if (!clientId) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Client Market Analysis</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-1">
          <ClientMarketView clientId={clientId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ClientMarketViewModal
