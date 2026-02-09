'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'

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
  cashTotalUgx: number
  momoTotalUgx: number
  cardTotalUgx: number
  grandTotalUgx: number
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
  const [closeResult, setCloseResult] = useState<{ summary: ShiftSummary; cashVarianceUgx?: number } | null>(null)

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
    const amount = declaredCashUgx.trim() === '' ? undefined : parseFloat(declaredCashUgx)
    if (amount !== undefined && (isNaN(amount) || amount < 0)) {
      alert('Enter a valid cash amount')
      return
    }
    setClosing(true)
    try {
      const res = await posFetch(`/api/shifts/${activeShift.shiftId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedByStaffId: getStaffId(),
          declaredCashUgx: amount,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setCloseResult({ summary: data.summary, cashVarianceUgx: data.cashVarianceUgx })
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
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }
  if (error && !activeShift) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md">
          <PosNavHeader />
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-2xl">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-4">Shift</h1>

        {activeShift && (
          <section className="pos-section pos-card">
            <h2 className="pos-section-title text-lg mb-2">Active Shift</h2>
            <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Shift ID:</strong> {activeShift.shiftId}</p>
            <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>Start:</strong> {new Date(activeShift.startTime).toLocaleString()}</p>
            <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>End:</strong> {activeShift.endTime ? new Date(activeShift.endTime).toLocaleString() : '—'}</p>
          </section>
        )}

        {summary && (
          <section className="pos-section pos-card">
            <h2 className="pos-section-title text-lg mb-2">Totals</h2>
            <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Gross Sales:</strong> {summary.grossSalesUgx.toLocaleString()} UGX</p>
            <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>Total Payments:</strong> {summary.totalPaymentsUgx.toLocaleString()} UGX</p>
            <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>Cash Payments:</strong> {summary.cashPaymentsUgx.toLocaleString()} UGX</p>
          </section>
        )}

        {paymentSummary && activeShift && (
          <section className="pos-section pos-card">
            <h2 className="pos-section-title text-lg mb-2">Payment Breakdown</h2>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">Cash: UGX {paymentSummary.cashTotalUgx.toLocaleString()}</p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">MoMo: UGX {paymentSummary.momoTotalUgx.toLocaleString()}</p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">Card: UGX {paymentSummary.cardTotalUgx.toLocaleString()}</p>
            <hr className="border-neutral-200 dark:border-neutral-600 my-3" />
            <p className="m-0 font-semibold text-primary-700 dark:text-primary-200">Total: UGX {paymentSummary.grandTotalUgx.toLocaleString()}</p>
          </section>
        )}

        {!closed && activeShift && (
          <form onSubmit={handleCloseShift} className="pos-section pos-card">
            <h2 className="pos-section-title text-lg mb-3">Close Shift</h2>
            <label className="block">
              <span className="pos-label">Declared Cash (UGX)</span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Optional"
                value={declaredCashUgx}
                onChange={(e) => setDeclaredCashUgx(e.target.value)}
                className="pos-input max-w-xs mt-1"
              />
            </label>
            <button type="submit" disabled={closing} className="btn btn-primary mt-4 disabled:opacity-60">Close Shift</button>
          </form>
        )}

        {closed && closeResult && (
          <section className="pos-section pos-card border-2 border-primary-300 dark:border-primary-600">
            <p className="font-semibold text-primary-700 dark:text-primary-200 m-0 mb-2">Shift closed.</p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">Gross Sales: {closeResult.summary.grossSalesUgx.toLocaleString()} UGX</p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">Total Payments: {closeResult.summary.totalPaymentsUgx.toLocaleString()} UGX</p>
            <p className="m-0 py-1 text-neutral-700 dark:text-neutral-300">Cash Payments: {closeResult.summary.cashPaymentsUgx.toLocaleString()} UGX</p>
            {closeResult.cashVarianceUgx !== undefined && (
              <p className="m-0 mt-2 font-medium text-primary-700 dark:text-primary-200">Cash Variance: {closeResult.cashVarianceUgx.toLocaleString()} UGX</p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
