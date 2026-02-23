'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type PreparationNotesModalProps = {
  open: boolean
  title?: string
  /** e.g. "Send to Kitchen" or "Send to Bar" */
  confirmLabel?: string
  onConfirm: (notes: string) => void
  onCancel: () => void
}

export function PreparationNotesModal({
  open,
  title = 'Order notes (optional)',
  confirmLabel = 'Send',
  onConfirm,
  onCancel,
}: PreparationNotesModalProps) {
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) setNotes('')
  }, [open])

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm(notes.trim())
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60">
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preparation-notes-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 id="preparation-notes-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <label className="block">
            <span className="pos-label">Notes for kitchen/bar</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. No salt, extra ice, allergy..."
              className="pos-input mt-1 w-full min-h-[80px] resize-y"
              rows={3}
              maxLength={500}
            />
          </label>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onCancel} className="btn btn-outline flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
