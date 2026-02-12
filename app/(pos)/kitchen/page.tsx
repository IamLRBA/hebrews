'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId } from '@/lib/pos-client'
import { ErrorBanner } from '@/components/pos/ErrorBanner'

export default function KitchenLoginPage() {
  const router = useRouter()
  const [shiftId, setShiftId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const staffId = getStaffId()
    if (!staffId) {
      router.replace('/pos/login')
      return
    }
    setLoading(false)
  }, [router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shiftId.trim()) {
      setError('Enter shift ID')
      return
    }
    router.push(`/kitchen/${shiftId.trim()}`)
  }

  if (loading) {
    return (
      <main className="pos-page flex items-center justify-center min-h-screen">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page flex items-center justify-center min-h-screen">
      <div className="pos-page-container w-full max-w-md">
        <div className="pos-card">
          <h1 className="pos-section-title text-2xl mb-4">Kitchen Display</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="pos-label">Shift ID</span>
              <input
                type="text"
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="pos-input mt-1 w-full"
                placeholder="Enter shift ID"
                aria-label="Shift ID"
              />
            </label>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <button
              type="submit"
              disabled={!shiftId.trim()}
              className="btn btn-primary w-full py-3 text-lg disabled:opacity-60"
            >
              Open Kitchen Screen
            </button>
          </form>
        </div>
        <p className="text-center mt-6">
          <Link href="/pos/login" className="pos-link text-sm">POS Login</Link>
        </p>
      </div>
    </main>
  )
}
