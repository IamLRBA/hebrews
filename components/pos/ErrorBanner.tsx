'use client'

import { useState } from 'react'

type ErrorBannerProps = {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  function handleDismiss() {
    setDismissed(true)
    onDismiss?.()
  }

  if (!message || dismissed) return null

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 px-4 py-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 px-2 py-1 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800/50 rounded"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
