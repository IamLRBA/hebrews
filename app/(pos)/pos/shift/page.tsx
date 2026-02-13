'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'

type ShiftSummary = {
  shiftId: string
  staffId: string
  terminalId: string
  startTime: string
  endTime: string | null
  totalOrders: number
  servedOrders: number
  cancelledOrders: number
  grossSalesUgx: number
  totalPaymentsUgx: number
  cashPaymentsUgx: number
  nonCashPaymentsUgx: number
}

type ActiveShift = {
  shiftId: string
  staffId: string
  terminalId: string
  startTime: string
  endTime: string | null
}

type PaymentSummary = {
  cashSales: number
  mtnMomoSales: number
  airtelSales: number
  cardSales: number
  totalSales: number
}

export default function ShiftPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [declaredCashUgx, setDeclaredCashUgx] = useState('')
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(false)
  const [closeResult, setCloseResult] = useState<{
    expectedCash: number
    countedCashUgx: number
    variance: number
  } | null>(null)

  async function fetchActiveShift() {
    try {
      const res = await posFetch('/api/shifts/active')
      if (!res.ok) {
        if (res.status === 404) {
          setError('No active shift')
          setActiveShift(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setActiveShift(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load active shift')
      setActiveShift(null)
    }
  }

  async function fetchShiftSummary(shiftId: string) {
    try {
      const res = await posFetch(`/api/shifts/${shiftId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSummary(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shift summary')
      setSummary(null)
    }
  }

  async function fetchPaymentSummary(shiftId: string) {
    try {
      const res = await posFetch(`/api/shifts/${shiftId}/summary`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPaymentSummary(data)
    } catch (e) {
      setPaymentSummary(null)
    }
  }

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/pos/login')
      return
    }
    setStaffOk(true)
  }, [router])

  useEffect(() => {
    if (!staffOk) return
    setLoading(true)
    setError(null)
    fetchActiveShift().finally(() => setLoading(false))
  }, [staffOk])

  useEffect(() => {
    if (activeShift?.shiftId) {
      fetchShiftSummary(activeShift.shiftId)
      fetchPaymentSummary(activeShift.shiftId)
    } else {
      setSummary(null)
      setPaymentSummary(null)
    }
  }, [activeShift?.shiftId])

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault()
    if (!activeShift?.shiftId) return
    const amount = parseFloat(declaredCashUgx)
    if (isNaN(amount) || amount < 0) {
      alert('Enter a valid counted cash amount')
      return
    }
    setClosing(true)
    try {
      const res = await posFetch(`/api/shifts/${activeShift.shiftId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedByStaffId: getStaffId(),
          countedCashUgx: amount,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setCloseResult({
        expectedCash: data.expectedCash,
        countedCashUgx: data.countedCashUgx,
        variance: data.variance,
      })
      setClosed(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to close shift')
    } finally {
      setClosing(false)
    }
  }

  if (!staffOk || loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full p-6">
          <SkeletonLoader variant="card" lines={4} />
        </div>
      </main>
    )
  }
  if (error && !activeShift) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto text-center">
          <PosNavHeader />
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl mx-auto text-center">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-4">Shift</h1>

        {activeShift && (
          <section className="pos-section pos-card pos-order-card-centered">
            <h2 className="pos-section-title text-lg mb-2">Active Shift</h2>
            <div className="space-y-2 text-sm">
              <p className="m-0 text-neutral-700 dark:text-neutral-300">
                <strong>Shift ID:</strong> <span className="font-mono text-xs">{activeShift.shiftId.slice(0, 8)}...</span>
              </p>
              <p className="m-0 text-neutral-700 dark:text-neutral-300">
                <strong>Started:</strong> {formatRelativeTime(activeShift.startTime)}
              </p>
              {activeShift.endTime && (
                <p className="m-0 text-neutral-700 dark:text-neutral-300">
                  <strong>Ended:</strong> {formatRelativeTime(activeShift.endTime)}
                </p>
              )}
            </div>
          </section>
        )}

        {summary && (
          <section className="pos-section pos-card pos-order-card-centered">
            <h2 className="pos-section-title text-lg mb-3">Totals</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">Gross Sales:</span>
                <span className="font-bold text-lg text-primary-700 dark:text-primary-200">
                  {formatCurrency(summary.grossSalesUgx ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <span className="text-neutral-700 dark:text-neutral-300">Total Payments:</span>
                <span className="font-semibold text-primary-700 dark:text-primary-200">
                  {formatCurrency(summary.totalPaymentsUgx ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <span className="text-neutral-700 dark:text-neutral-300">Cash Payments:</span>
                <span className="font-semibold text-primary-700 dark:text-primary-200">
                  {formatCurrency(summary.cashPaymentsUgx ?? 0)}
                </span>
              </div>
            </div>
          </section>
        )}

        {paymentSummary && activeShift && (
          <section className="pos-section pos-card pos-order-card-centered">
            <h2 className="pos-section-title text-lg mb-3">Payment Breakdown</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                <span className="text-neutral-700 dark:text-neutral-300">Cash:</span>
                <span className="font-medium text-primary-700 dark:text-primary-200">
                  {formatCurrency(paymentSummary.cashSales ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                <span className="text-neutral-700 dark:text-neutral-300">MTN MoMo:</span>
                <span className="font-medium text-primary-700 dark:text-primary-200">
                  {formatCurrency(paymentSummary.mtnMomoSales ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                <span className="text-neutral-700 dark:text-neutral-300">Airtel:</span>
                <span className="font-medium text-primary-700 dark:text-primary-200">
                  {formatCurrency(paymentSummary.airtelSales ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                <span className="text-neutral-700 dark:text-neutral-300">Card:</span>
                <span className="font-medium text-primary-700 dark:text-primary-200">
                  {formatCurrency(paymentSummary.cardSales ?? 0)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-primary-200 dark:border-primary-700 flex justify-between items-center">
              <span className="font-semibold text-lg text-neutral-800 dark:text-neutral-200">Total:</span>
              <span className="font-bold text-xl text-primary-700 dark:text-primary-200">
                {formatCurrency(paymentSummary.totalSales ?? 0)}
              </span>
            </div>
          </section>
        )}

        {!closed && activeShift && (
          <form onSubmit={handleCloseShift} className="pos-section pos-card pos-order-card-centered">
            <h2 className="pos-section-title text-lg mb-3">Close Shift</h2>
            <label className="block">
              <span className="pos-label">Counted Cash (UGX)</span>
              <input
                type="number"
                min="0"
                step="100"
                required
                placeholder="Enter counted cash"
                value={declaredCashUgx}
                onChange={(e) => setDeclaredCashUgx(e.target.value)}
                className="pos-input max-w-xs mt-1"
              />
            </label>
            <button type="submit" disabled={closing} className="btn btn-primary mt-4 disabled:opacity-60">Close Shift</button>
          </form>
        )}

        {closed && closeResult && (
          <section className="pos-section pos-card pos-order-card-centered border-2 border-primary-300 dark:border-primary-600">
            <p className="font-semibold text-primary-700 dark:text-primary-200 m-0 mb-2">Shift closed.</p>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <span className="text-neutral-700 dark:text-neutral-300">Expected cash:</span>
                <span className="font-semibold">{formatCurrency(closeResult.expectedCash)}</span>
              </div>
              <div className="flex justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <span className="text-neutral-700 dark:text-neutral-300">Counted cash:</span>
                <span className="font-semibold">{formatCurrency(closeResult.countedCashUgx)}</span>
              </div>
              <div className={`flex justify-between p-3 rounded-lg ${
                Math.abs(closeResult.variance) < 0.01 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">Variance:</span>
                <span className={`font-bold text-lg ${
                  Math.abs(closeResult.variance) < 0.01 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {formatCurrency(closeResult.variance)}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
