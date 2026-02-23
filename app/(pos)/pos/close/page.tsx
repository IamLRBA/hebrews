'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId, clearShiftId } from '@/lib/pos-shift-store'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'

type ShiftSummary = {
  shiftId: string
  ordersServed: number
  totalSales: number
  cashSales: number
  mtnMomoSales: number
  airtelSales: number
  cardSales: number
  foodSalesUgx?: number
  drinksSalesUgx?: number
  foodOrdersServed?: number
  drinksOrdersServed?: number
}

type CloseResult = {
  shiftId: string
  expectedCash: number
  countedCashUgx: number
  variance: number
}

export default function PosClosePage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(false)
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null)
  const [countedCashUgx, setCountedCashUgx] = useState('')
  const [shortageUgx, setShortageUgx] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/pos/login')
      return
    }
    const sid = getShiftId()
    setShiftId(sid)
    if (!sid) {
      router.replace('/pos/start')
    }
  }, [router])

  async function handleLoadSummary() {
    const sid = getShiftId()
    if (!sid) return

    setLoading(true)
    setError(null)
    try {
      const res = await posFetch(`/api/shifts/${sid}/summary`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load summary')
      }
      const data = await res.json()
      setSummary(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault()
    const sid = getShiftId()
    const staffId = getStaffId()
    if (!sid || !staffId) return

    const counted = parseFloat(countedCashUgx)
    if (isNaN(counted) || counted < 0) {
      alert('Enter a valid counted cash amount')
      return
    }

    setClosing(true)
    setError(null)
    try {
      const shortage = shortageUgx.trim() === '' ? undefined : Math.max(0, Number(shortageUgx))
      const body: { countedCashUgx: number; closedByStaffId: string; managerApprovalStaffId?: string; shortageUgx?: number } = {
        countedCashUgx: counted,
        closedByStaffId: staffId,
      }
      if (shortage != null && !Number.isNaN(shortage)) body.shortageUgx = shortage
      let res = await posFetch(`/api/shifts/${sid}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403 && (data as { code?: string }).code === 'MANAGER_APPROVAL_REQUIRED') {
          body.managerApprovalStaffId = staffId
          res = await posFetch(`/api/shifts/${sid}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Failed to close shift')
      }
      const data = await res.json()
      setCloseResult(data)
      setClosed(true)
      clearShiftId()
      setTimeout(() => {
        router.replace('/pos/start')
      }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close shift')
    } finally {
      setClosing(false)
    }
  }

  if (!staffOk) {
    return (
      <main className="pos-page flex items-center justify-center min-h-screen">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }

  if (!shiftId) {
    return null
  }

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <PosNavHeader />
      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        <h1 className="pos-section-title text-2xl mb-6">Close Shift</h1>

        <div className="pos-card p-6 mb-6">
          <button
            type="button"
            onClick={handleLoadSummary}
            disabled={loading}
            className="btn btn-outline w-full py-3 mb-4 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load Shift Summary'}
          </button>

          {error && (
            <div className="mb-4">
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {summary && (
            <div className="space-y-2 text-neutral-700 dark:text-neutral-300">
              <p className="m-0 py-1"><strong>Orders served:</strong> {summary.ordersServed === 0 ? 'No orders served yet' : summary.ordersServed}</p>
              <p className="m-0 py-1"><strong>Total sales:</strong> UGX {summary.totalSales.toLocaleString()}</p>
              <p className="m-0 py-1"><strong>Cash sales:</strong> UGX {summary.cashSales.toLocaleString()}</p>
              <p className="m-0 py-1"><strong>MTN MoMo:</strong> UGX {summary.mtnMomoSales.toLocaleString()}</p>
              <p className="m-0 py-1"><strong>Airtel:</strong> UGX {summary.airtelSales.toLocaleString()}</p>
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-2 gap-2">
                <div>
                  <p className="m-0 text-sm font-medium text-neutral-600 dark:text-neutral-400">Food</p>
                  <p className="m-0">UGX {(summary.foodSalesUgx ?? 0).toLocaleString()}</p>
                  <p className="m-0 text-xs text-neutral-500">{(summary.foodOrdersServed ?? 0)} orders</p>
                </div>
                <div>
                  <p className="m-0 text-sm font-medium text-neutral-600 dark:text-neutral-400">Drinks</p>
                  <p className="m-0">UGX {(summary.drinksSalesUgx ?? 0).toLocaleString()}</p>
                  <p className="m-0 text-xs text-neutral-500">{(summary.drinksOrdersServed ?? 0)} orders</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!closed && summary && (
          <form onSubmit={handleCloseShift} className="pos-card p-6">
            <label className="block mb-3">
              <span className="pos-label">Counted Cash (UGX)</span>
              <div className="relative inline-flex items-stretch mt-1 w-full">
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={countedCashUgx}
                  onChange={(e) => setCountedCashUgx(e.target.value)}
                  className="pos-input rounded-r-none border-r-0 rounded-l-xl min-w-0 flex-1 py-3 text-lg"
                  placeholder="Enter counted cash"
                />
                <div className="flex flex-col border border-neutral-200 dark:border-neutral-600 rounded-r-xl border-l-0 overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      const current = parseFloat(countedCashUgx) || 0
                      setCountedCashUgx(String(current + 1000))
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
                      const current = parseFloat(countedCashUgx) || 0
                      setCountedCashUgx(String(Math.max(0, current - 1000)))
                    }}
                    className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    aria-label="Decrease by 1000"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h6" /></svg>
                  </button>
                </div>
              </div>
            </label>
            <label className="block mb-4">
              <span className="pos-label">Shortage (UGX) — optional</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={shortageUgx}
                onChange={(e) => setShortageUgx(e.target.value)}
                className="pos-input mt-1 w-full py-2"
                placeholder="0 if no shortage"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Enter if cash is missing; shift still closes.
              </p>
            </label>
            <button
              type="submit"
              disabled={closing}
              className="btn btn-primary w-full py-3 text-lg disabled:opacity-60"
            >
              {closing ? 'Closing…' : 'Close Shift'}
            </button>
          </form>
        )}

        {closed && closeResult && (
          <div className="pos-card p-6 border-2 border-primary-300 dark:border-primary-600">
            <p className="font-semibold text-primary-700 dark:text-primary-200 m-0 mb-4">
              Shift closed successfully.
            </p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">
              Expected cash: UGX {closeResult.expectedCash.toLocaleString()}
            </p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">
              Counted cash: UGX {closeResult.countedCashUgx.toLocaleString()}
            </p>
            <p className="m-0 pt-2 font-medium text-primary-700 dark:text-primary-200">
              Variance: UGX {closeResult.variance.toLocaleString()}
            </p>
            {closeResult.shortageUgx != null && closeResult.shortageUgx > 0 && (
              <p className="m-0 pt-2 font-medium text-amber-700 dark:text-amber-300">
                Shortage declared: UGX {closeResult.shortageUgx.toLocaleString()}
              </p>
            )}
            <p className="m-0 mt-4 text-sm text-neutral-500">
              Redirecting to start screen…
            </p>
          </div>
        )}

        <p className="text-center mt-6">
          <Link href="/pos/orders" className="pos-link text-sm">⇐ Back to Orders list</Link>
        </p>
      </div>
    </main>
  )
}
