'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { LogIn } from 'lucide-react'

export default function KitchenLoginPage() {
  const router = useRouter()
  const [shiftId, setShiftId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableShifts, setAvailableShifts] = useState<any[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)

  useEffect(() => {
    const staffId = getStaffId()
    if (!staffId) {
      router.replace('/login')
      return
    }
    // Try to get any active shift
    posFetch('/api/kitchen/shifts')
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw new Error('Failed to fetch shifts')
      })
      .then((data) => {
        if (data.shifts && data.shifts.length > 0) {
          setAvailableShifts(data.shifts)
          // Auto-redirect to first active shift
          router.replace(`/kitchen/${data.shifts[0].id}`)
        } else {
          // No active shifts, show form
          setAvailableShifts([])
          setLoadingShifts(false)
        }
      })
      .catch(() => {
        // Failed to fetch, show form
        setAvailableShifts([])
        setLoadingShifts(false)
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shiftId.trim()) return
    setLoading(true)
    setError(null)
    try {
      router.push(`/kitchen/${shiftId.trim()}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load kitchen display')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['kitchen']}>
      <main className="pos-page flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-neutral-900 dark:to-neutral-800">
        <div className="pos-page-container w-full max-w-md px-4">
          <div className="pos-card shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 dark:bg-primary-500 rounded-full mb-4">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="pos-section-title text-3xl mb-2">Kitchen Display</h1>
              <p className="pos-section-subtitle text-neutral-600 dark:text-neutral-400">
                {loadingShifts ? 'Loading active shifts...' : 'Select a shift to view orders'}
              </p>
            </div>

            {loadingShifts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {availableShifts.length > 0 ? (
                  <label className="block">
                    <span className="pos-label">Select Active Shift</span>
                    <select
                      value={shiftId}
                      onChange={(e) => setShiftId(e.target.value)}
                      className="pos-input mt-1 w-full"
                      required
                    >
                      <option value="">Select a shift...</option>
                      {availableShifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.staffName} - {shift.terminalId} (Started: {new Date(shift.startTime).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="block">
                    <span className="pos-label">Shift ID</span>
                    <input
                      type="text"
                      value={shiftId}
                      onChange={(e) => setShiftId(e.target.value)}
                      className="pos-input mt-1 w-full"
                      placeholder="Enter shift ID"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      No active shifts found. Enter a shift ID manually.
                    </p>
                  </label>
                )}

                {error && (
                  <ErrorBanner message={error} onDismiss={() => setError(null)} />
                )}

                <button
                  type="submit"
                  disabled={loading || !shiftId.trim()}
                  className="btn btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                      Loading…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      View Orders
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </RoleGuard>
  )
}
