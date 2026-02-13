'use client'

type SkeletonLoaderProps = {
  className?: string
  variant?: 'text' | 'card' | 'circle' | 'badge'
  lines?: number
}

export function SkeletonLoader({ className = '', variant = 'text', lines = 1 }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
      </div>
    )
  }

  if (variant === 'circle') {
    return (
      <div className={`animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700 ${className}`}></div>
    )
  }

  if (variant === 'badge') {
    return (
      <div className={`animate-pulse h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full w-20 ${className}`}></div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse h-4 bg-neutral-200 dark:bg-neutral-700 rounded"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        ></div>
      ))}
    </div>
  )
}
