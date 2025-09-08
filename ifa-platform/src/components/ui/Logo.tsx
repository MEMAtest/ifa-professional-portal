// src/components/ui/Logo.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon'
  className?: string
  showTagline?: boolean
  linkToHome?: boolean
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  className = '',
  showTagline = false,
  linkToHome = true
}) => {
  const logoContent = (
    <div className={`flex items-center ${className}`}>
      <Image 
        src="/logo.png"
        alt="Plannetic" 
        width={40} 
        height={40}
        className={variant === 'full' ? 'h-10 w-auto' : 'h-8 w-auto'}
        priority
      />
      {variant === 'full' && (
        <div className="ml-2 flex flex-col">
          <span className="text-2xl font-bold text-teal-500">
            plannetic
          </span>
          {showTagline && (
            <p className="text-xs text-gray-500 -mt-1">
              Turning Plans into Performance
            </p>
          )}
        </div>
      )}
    </div>
  )

  if (linkToHome) {
    return (
      <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}

export const LogoFull: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo {...props} variant="full" />
)

export const LogoCompact: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo {...props} variant="compact" />
)

export const LogoIcon: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo {...props} variant="icon" />
)

export type { LogoProps }