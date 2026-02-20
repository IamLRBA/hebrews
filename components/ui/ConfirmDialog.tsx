'use client'

import { X } from 'lucide-react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'neutral'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'neutral',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const danger = variant === 'danger'
  const warning = variant === 'warning'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60">
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 text-center flex-1">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 bg-transparent hover:bg-neutral-100 dark:hover:bg-transparent transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p id="confirm-dialog-desc" className="p-4 text-neutral-600 dark:text-neutral-400 text-center">
          {message}
        </p>
        <div className="flex gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline flex-1"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? 'flex-1 px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white border border-red-600 dark:bg-red-700 dark:hover:bg-red-600 dark:border-red-700 transition-colors'
                : 'btn btn-primary flex-1'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
