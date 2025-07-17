// src/hooks/use-toast.tsx
import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  
  // If no context, return a simple console-based implementation
  if (!context) {
    return {
      toast: ({ title, description, variant }: ToastProps) => {
        console.log(`Toast [${variant}]: ${title} - ${description}`)
      }
    }
  }
  
  return context
}