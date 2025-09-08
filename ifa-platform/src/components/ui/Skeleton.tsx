// =====================================================
// FILE: src/components/ui/Skeleton.tsx
// COMPLETE SKELETON COMPONENT
// =====================================================

import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  variant?: 'default' | 'circular' | 'rectangular' | 'text'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'default',
  width,
  height,
  animation = 'pulse',
  ...props
}) => {
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }

  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    text: 'rounded'
  }

  return (
    <div
      className={cn(
        'bg-gray-200',
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
      }}
      {...props}
    />
  )
}

export default Skeleton