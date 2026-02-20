'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type OrderNameModalProps = {
  open: boolean
  title?: string
  onConfirm: (orderName: string) => void
  onCancel: () => void
}

export function OrderNameModal({
  open,
  title = 'Order name',
  onConfirm,
  onCancel,
}: OrderNameModalProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) {
      onConfirm(trimmed)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60">
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-name-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 id="order-name-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
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
            <span className="pos-label">Order name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Table 5, John, Takeaway #1"
              className="pos-input mt-1 w-full"
              autoFocus
              maxLength={32}
            />
          </label>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onCancel} className="btn btn-outline flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!name.trim()}>
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
