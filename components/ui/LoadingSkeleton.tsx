'use client'

import { motion } from 'framer-motion'

interface LoadingSkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export default function LoadingSkeleton({ 
  className = '', 
  width = '100%', 
  height = '1rem',
  rounded = 'md'
}: LoadingSkeletonProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  return (
    <motion.div
      className={`bg-neutral-200 dark:bg-neutral-700 ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      aria-label="Loading..."
      role="status"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6">
      <LoadingSkeleton height="200px" className="mb-4" rounded="lg" />
      <LoadingSkeleton height="1.5rem" className="mb-2" width="60%" />
      <LoadingSkeleton height="1rem" className="mb-1" />
      <LoadingSkeleton height="1rem" width="80%" />
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="group bg-white dark:bg-neutral-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
      <LoadingSkeleton height="300px" className="w-full" rounded="none" />
      <div className="p-4">
        <LoadingSkeleton height="1.25rem" className="mb-2" width="70%" />
        <LoadingSkeleton height="1rem" className="mb-4" width="50%" />
        <div className="flex justify-between items-center">
          <LoadingSkeleton height="1.5rem" width="80px" />
          <LoadingSkeleton height="2.5rem" width="100px" rounded="lg" />
        </div>
      </div>
    </div>
  )
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <LoadingSkeleton
          key={i}
          height="1rem"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

