'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { posFetch } from '@/lib/pos-client'
import { ArrowLeft, DollarSign, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ManagerShiftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const shiftId = params.shiftId as string
  const [shift, setShift] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [countedCash, setCountedCash] = useState('')
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const shiftRes = await posFetch(`/api/shifts/${shiftId}`)
        if (shiftRes.ok) {
          const shiftData = await shiftRes.json()
          setShift(shiftData)
        }

        const summaryRes = await posFetch(`/api/shifts/${shiftId}/summary`)
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setSummary(summaryData)
        }
      } catch (e) {
        console.error('Failed to fetch shift:', e)
      } finally {
        setLoading(false)
      }
    }
    if (shiftId) fetchData()
  }, [shiftId])

  async function handleCloseShift() {
    if (!countedCash || isNaN(Number(countedCash))) {
      alert('Please enter a valid cash amount')
      return
    }
    if (!confirm('Are you sure you want to close this shift?')) return

    setClosing(true)
    try {
      const staffId = localStorage.getItem('pos_staff_id')
      const res = await posFetch(`/api/shifts/${shiftId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedCashUgx: Number(countedCash),
          closedByStaffId: staffId,
        }),
      })
      if (res.ok) {
        router.push('/manager/shifts')
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to close shift')
      }
    } catch (e) {
      alert('Failed to close shift')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['manager']}>
        <div className="pos-page min-h-screen">
          <div className="pos-page-container">
            <ManagerNavHeader />
            <main className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['manager']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <ManagerNavHeader />
          <main>
            <div className="mb-6">
              <Link
                href="/manager/shifts"
                className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Shifts
              </Link>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Shift Details
              </h1>
            </div>

            {shift && summary && (
              <div className="space-y-6">
                {/* Shift Summary */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    Shift Summary
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Orders Served</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.ordersServed}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.totalSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Cash Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.cashSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Card Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.cardSales.toLocaleString()} UGX
                      </p>
                    </div>
                  </div>

                  {shift.endTime ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Shift closed on {new Date(shift.endTime).toLocaleString()}
                      </p>
                      {shift.cashVarianceUgx !== null && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                          Cash Variance: {Number(shift.cashVarianceUgx).toLocaleString()} UGX
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-4">
                        Shift is active
                      </p>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="pos-label">Counted Cash (UGX)</span>
                          <input
                            type="number"
                            value={countedCash}
                            onChange={(e) => setCountedCash(e.target.value)}
                            className="pos-input mt-1 w-full"
                            placeholder="Enter counted cash amount"
                          />
                        </label>
                        <button
                          onClick={handleCloseShift}
                          disabled={closing || !countedCash}
                          className="btn btn-primary w-full disabled:opacity-60"
                        >
                          {closing ? 'Closing...' : 'Close Shift'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
