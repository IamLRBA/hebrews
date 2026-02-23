'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { posFetch } from '@/lib/pos-client'
import { DollarSign, Clock } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function ManagerShiftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const shiftId = params.shiftId as string
  const [shift, setShift] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [countedCash, setCountedCash] = useState('')
  const [shortageUgx, setShortageUgx] = useState('')
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

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
    setShowConfirmClose(true)
  }

  async function doCloseShift() {
    setShowConfirmClose(false)
    if (!countedCash || isNaN(Number(countedCash))) return
    const staffId = localStorage.getItem('pos_staff_id')
    if (!staffId) {
      alert('Staff session missing. Please sign in again.')
      return
    }
    setClosing(true)
    try {
      const shortage = shortageUgx.trim() === '' ? undefined : Math.max(0, Number(shortageUgx))
      let body: { countedCashUgx: number; closedByStaffId: string; managerApprovalStaffId?: string; shortageUgx?: number } = {
        countedCashUgx: Number(countedCash),
        closedByStaffId: staffId,
      }
      if (shortage != null && !Number.isNaN(shortage)) body.shortageUgx = shortage
      let res = await posFetch(`/api/shifts/${shiftId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok && res.status === 403) {
        const data = await res.json().catch(() => ({}))
        if ((data as { code?: string }).code === 'MANAGER_APPROVAL_REQUIRED') {
          body.managerApprovalStaffId = staffId
          res = await posFetch(`/api/shifts/${shiftId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        }
      }
      if (res.ok) {
        router.push('/manager/shifts')
      } else {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || 'Failed to close shift')
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
                className="pos-link inline-block mb-4"
              >
                ⇐ Back to Shifts
              </Link>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 text-center">
                Shift Details
              </h1>
            </div>

            {shift && summary && (
              <div className="space-y-6">
                {/* Shift Summary */}
                <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
                    Shift Summary
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 justify-items-center">
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Orders Served</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.ordersServed}
                      </p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.totalSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Cash Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.cashSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">MTN MoMo</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.mtnMomoSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Airtel Money</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {summary.airtelSales.toLocaleString()} UGX
                      </p>
                    </div>
                  </div>
                  {/* Food vs Drinks */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Food</p>
                      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {(summary.foodSalesUgx ?? 0).toLocaleString()} UGX
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {(summary.foodOrdersServed ?? 0)} orders
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Drinks</p>
                      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {(summary.drinksSalesUgx ?? 0).toLocaleString()} UGX
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {(summary.drinksOrdersServed ?? 0)} orders
                      </p>
                    </div>
                  </div>

                  {shift.endTime ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Shift closed on {new Date(shift.endTime).toLocaleString()}
                      </p>
                      {shift.cashVarianceUgx != null && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                          Cash Variance: {Number(shift.cashVarianceUgx).toLocaleString()} UGX
                        </p>
                      )}
                      {shift.shortageUgx != null && Number(shift.shortageUgx) > 0 && (
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 font-medium">
                          Shortage declared: {Number(shift.shortageUgx).toLocaleString()} UGX
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-4">
                        Shift is active
                      </p>
                      <div className="space-y-3 flex flex-col items-center">
                        <label className="block w-full max-w-xs">
                          <span className="pos-label">Counted Cash (UGX)</span>
                          <div className="relative inline-flex items-stretch mt-1 w-full">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={countedCash}
                              onChange={(e) => setCountedCash(e.target.value)}
                              className="pos-input pos-input-no-spinner rounded-r-none border-r-0 rounded-l-xl min-w-0 flex-1"
                              placeholder="Enter counted cash amount"
                            />
                            <div className="flex flex-col border border-neutral-200 dark:border-neutral-600 rounded-r-xl border-l-0 overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  const current = parseFloat(countedCash) || 0
                                  setCountedCash(String(current + 1000))
                                }}
                                className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-600"
                                aria-label="Increase by 1000"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 3v6M3 6h6" /></svg>
                              </button>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  const current = parseFloat(countedCash) || 0
                                  setCountedCash(String(Math.max(0, current - 1000)))
                                }}
                                className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                aria-label="Decrease by 1000"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h6" /></svg>
                              </button>
                            </div>
                          </div>
                        </label>
                        <label className="block w-full max-w-xs">
                          <span className="pos-label">Shortage (UGX) — optional</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={shortageUgx}
                            onChange={(e) => setShortageUgx(e.target.value)}
                            className="pos-input mt-1 w-full"
                            placeholder="0 if no shortage"
                          />
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Enter if cash is missing (e.g. loss); shift still closes and can be handled later.
                          </p>
                        </label>
                        <button
                          onClick={handleCloseShift}
                          disabled={closing || !countedCash}
                          className="btn btn-primary w-full max-w-xs disabled:opacity-60"
                        >
                          {closing ? 'Closing...' : 'Close Shift'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ConfirmDialog
              open={showConfirmClose}
              title="Close shift"
              message="Are you sure you want to close this shift? This cannot be undone."
              confirmLabel="Close shift"
              cancelLabel="Cancel"
              variant="danger"
              onConfirm={doCloseShift}
              onCancel={() => setShowConfirmClose(false)}
            />
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
