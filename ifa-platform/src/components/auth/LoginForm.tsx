// File: src/components/auth/LoginForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginForm: React.FC = () => {
  const router = useRouter()
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    const { error } = await signIn(data)
    
    if (error) {
      setError('root', { message: error })
    } else {
      router.push('/dashboard')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated Background Waves */}
      <div className="absolute inset-0">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          
          <path
            d="M0,100 C150,200 350,0 500,100 L500,400 L0,400 Z"
            fill="url(#wave1)"
            className="animate-pulse"
            transform="scale(3)"
          />
          
          <path
            d="M0,200 C200,100 300,300 500,200 L500,400 L0,400 Z"
            fill="url(#wave2)"
            className="animate-pulse"
            style={{ animationDelay: '1s' }}
            transform="scale(3)"
          />
        </svg>

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">
              plannetic
            </h1>
          </div>
          <p className="text-teal-300 text-sm">Turning Plans into Performance</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-8">
            {/* Card Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2">Plannetic</h2>
              <p className="text-teal-300 text-sm">Turning Plans into Performance</p>
              <p className="text-gray-400 text-xs mt-1">Professional Financial Advisory Platform</p>
            </div>

            {/* Sign In Header */}
            <h3 className="text-white text-lg font-medium mb-1">Sign in to your account</h3>
            <p className="text-gray-400 text-sm mb-6">Enter your email and password to access the platform</p>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errors.root && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {errors.root.message}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="text-gray-300 text-sm block mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="password" className="text-gray-300 text-sm block mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="••••••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-medium rounded-lg hover:from-teal-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
            
            {/* Demo Credentials */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-teal-300 text-sm font-medium mb-2">Demo Credentials</p>
              <div className="bg-black/20 backdrop-blur rounded-lg p-3">
                <p className="text-gray-300 text-xs">
                  <span className="text-gray-400">Email:</span> demo@plannetic.com
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  <span className="text-gray-400">Password:</span> demo123
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-gray-400 text-xs">
          © 2025 Plannetic. All rights reserved.
        </p>
      </div>

      {/* Decorative Stars */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-10 right-10 w-1 h-1 bg-white rounded-full animate-pulse" />
        <div className="absolute top-20 right-40 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-40 right-20 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-10 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-40 left-40 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  )
}