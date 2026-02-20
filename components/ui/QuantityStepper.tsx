'use client'

interface QuantityStepperProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  className?: string
  ariaLabel?: string
}

export function QuantityStepper({
  value,
  min = 0,
  max,
  onChange,
  className = '',
  ariaLabel = 'Quantity',
}: QuantityStepperProps) {
  const atMin = value <= min
  const atMax = max != null && value >= max

  return (
    <div className={`relative inline-flex items-stretch ${className}`} aria-label={ariaLabel}>
      <div className="flex items-center justify-center px-3 py-2 min-w-[2.5rem] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 rounded-l-xl border-r-0 font-semibold">
        {value}
      </div>
      <div className="flex flex-col border border-neutral-200 dark:border-neutral-600 rounded-r-xl border-l-0 overflow-hidden bg-neutral-50 dark:bg-neutral-800">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onChange(max != null ? Math.min(value + 1, max) : value + 1)}
          disabled={atMax}
          className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Increase"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 3v6M3 6h6" /></svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={atMin}
          className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrease"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h6" /></svg>
        </button>
      </div>
    </div>
  )
}
