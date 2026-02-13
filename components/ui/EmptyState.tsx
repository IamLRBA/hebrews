'use client'

import { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-primary-600 dark:text-primary-300" aria-hidden />
        </div>
      )}
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
