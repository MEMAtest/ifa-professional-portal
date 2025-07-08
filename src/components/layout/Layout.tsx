'use client'
import { useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { LoginForm } from '@/components/auth/LoginForm'
import { LayoutContext } from './SmartLayoutWrapper'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const isWrappedByRoot = useContext(LayoutContext)
  
  // If already wrapped by root layout, just return children
  if (isWrappedByRoot) {
    return <>{children}</>
  }
  
  // Otherwise, provide layout (backward compatibility for any pages not using root wrapper)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      <main className="ml-64 pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}