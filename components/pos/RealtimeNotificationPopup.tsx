'use client'

import { X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export function RealtimeNotificationPopup({ open, title, message, onClose }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="realtime-notification-title"
    >
      <div className="pos-card max-w-sm w-full p-6 shadow-xl border-2 border-primary-200 dark:border-primary-700 relative mx-auto text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <h2 id="realtime-notification-title" className="text-lg font-semibold text-primary-700 dark:text-primary-200 pr-8 mb-2">
          {title}
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300 m-0 mb-4 text-center">
          {message}
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline py-2 px-5 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
