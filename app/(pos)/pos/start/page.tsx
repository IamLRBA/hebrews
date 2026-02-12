'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { setShiftId } from '@/lib/pos-shift-store'
import { ErrorBanner } from '@/components/pos/ErrorBanner'

export default function PosStartPage() {
  const router = useRouter()
  const [terminalId, setTerminalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const staffId = getStaffId()
    if (!staffId) {
      router.replace('/pos/login')
      return
    }
    setLoading(false)
  }, [router])

  async function handleStartShift(e: React.FormEvent) {
    e.preventDefault()
    const staffId = getStaffId()
    if (!staffId) {
      router.replace('/pos/login')
      return
    }
    setStarting(true)
    setError(null)
    try {
      const res = await posFetch('/api/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          terminalId: terminalId.trim() || 'pos-1',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setShiftId(data.shiftId)
      router.replace('/pos/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start shift')
    } finally {
      setStarting(false)
    }
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
          <h1 className="pos-section-title text-2xl mb-4">Start Shift</h1>
          <form onSubmit={handleStartShift} className="space-y-4">
            <label className="block">
              <span className="pos-label">Terminal ID</span>
              <input
                type="text"
                placeholder="pos-1"
                value={terminalId}
                onChange={(e) => setTerminalId(e.target.value)}
                className="pos-input mt-1 w-full"
                aria-label="Terminal ID"
              />
            </label>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <button
              type="submit"
              disabled={starting}
              className="btn btn-primary w-full py-3 text-lg disabled:opacity-60"
            >
              {starting ? 'Starting…' : 'Start Shift'}
            </button>
          </form>
        </div>
        <p className="text-center mt-6">
          <Link href="/pos/login" className="pos-link text-sm">Use a different account</Link>
        </p>
      </div>
    </main>
  )
}
