// =====================================================
// FILE: src/components/suitability/SuitabilityFormModals.tsx
// Extracted from SuitabilityForm.tsx for better code organization
// =====================================================

import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// =====================================================
// TYPES
// =====================================================

export interface NotificationOptions {
  title: string
  description: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

interface NotificationDisplayProps {
  notifications: NotificationOptions[]
}

// =====================================================
// MODAL COMPONENT
// =====================================================

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl"
}: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className={cn(
        "relative bg-white rounded-lg shadow-xl mx-4 w-full",
        maxWidth,
        "max-h-[90vh] overflow-hidden flex flex-col"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
})

// =====================================================
// NOTIFICATION DISPLAY COMPONENT
// =====================================================

export const NotificationDisplay = memo(function NotificationDisplay({
  notifications
}: NotificationDisplayProps) {
  if (notifications.length === 0) return null

  const getIcon = (type: NotificationOptions['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getVariant = (type: NotificationOptions['type']) => {
    switch (type) {
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant={getVariant(notification.type) as 'default' | 'destructive'}>
              <div className="flex items-start gap-2">
                {getIcon(notification.type)}
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <AlertDescription>{notification.description}</AlertDescription>
                </div>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
})

// =====================================================
// CONFIRMATION MODAL
// =====================================================

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export const ConfirmationModal = memo(function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
})

const SuitabilityFormModals = { Modal, NotificationDisplay, ConfirmationModal }

export default SuitabilityFormModals
