'use client'

import { Clock, ChefHat, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

type StatusBadgeProps = {
  status: string
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          icon: Clock,
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-200',
          border: 'border-yellow-300 dark:border-yellow-700',
          label: 'Pending'
        }
      case 'preparing':
        return {
          icon: ChefHat,
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-800 dark:text-blue-200',
          border: 'border-blue-300 dark:border-blue-700',
          label: 'Preparing'
        }
      case 'ready':
        return {
          icon: CheckCircle,
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-200',
          border: 'border-green-300 dark:border-green-700',
          label: 'Ready'
        }
      case 'served':
        return {
          icon: CheckCircle,
          bg: 'bg-primary-100 dark:bg-primary-800',
          text: 'text-primary-800 dark:text-primary-200',
          border: 'border-primary-300 dark:border-primary-600',
          label: 'Served'
        }
      case 'cancelled':
        return {
          icon: XCircle,
          bg: 'bg-neutral-200 dark:bg-neutral-700',
          text: 'text-neutral-700 dark:text-neutral-300',
          border: 'border-neutral-300 dark:border-neutral-600',
          label: 'Cancelled'
        }
      default:
        return {
          icon: AlertCircle,
          bg: 'bg-neutral-100 dark:bg-neutral-800',
          text: 'text-neutral-600 dark:text-neutral-400',
          border: 'border-neutral-300 dark:border-neutral-600',
          label: status
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {config.label}
    </span>
  )
}
