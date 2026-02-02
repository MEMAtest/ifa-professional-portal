"use client"

import { X } from 'lucide-react'
import { useToast } from './use-toast'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const isDestructive = toast.variant === 'destructive'
        const isHidden = toast.open === false
        return (
          <div
            key={toast.id}
            className={`w-full rounded-lg border shadow-lg px-4 py-3 bg-white transition-all ${
              isDestructive ? 'border-red-200' : 'border-gray-200'
            } ${isHidden ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {toast.title && (
                  <p className={`text-sm font-semibold ${isDestructive ? 'text-red-700' : 'text-gray-900'}`}>
                    {toast.title}
                  </p>
                )}
                {toast.description && (
                  <p className={`mt-1 text-xs ${isDestructive ? 'text-red-600' : 'text-gray-600'}`}>
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
