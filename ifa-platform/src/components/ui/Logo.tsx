// src/components/ui/Logo.tsx
import React from 'react'
import Link from 'next/link'

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
      {variant === 'icon' ? (
        // Icon only version - just the P
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="text-4xl font-bold text-plannetic-primary">P</div>
            <div className="absolute -right-1 top-1 w-2 h-2 bg-plannetic-accent rounded-full"></div>
          </div>
        </div>
      ) : (
        // Full or compact version
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            {/* Logo mark */}
            <div className="relative">
              <div className="text-3xl font-bold text-plannetic-primary">P</div>
              <div className="absolute -right-1 top-1 w-1.5 h-1.5 bg-plannetic-accent rounded-full"></div>
            </div>
            
            {/* Logo text */}
            {variant === 'full' && (
              <span className="text-2xl font-semibold text-plannetic-primary tracking-wide">
                lannetic
              </span>
            )}
          </div>
          
          {/* Tagline */}
          {showTagline && variant === 'full' && (
            <p className="text-xs text-plannetic-secondary mt-1 tracking-wider">
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

// Export variants for easy use
export const LogoFull: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo {...props} variant="full" />
)

export const LogoCompact: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo {...props} variant="compact" />
)

export const LogoIcon: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo {...props} variant="icon" />
)

// Also export the props type for consistency
export type { LogoProps }