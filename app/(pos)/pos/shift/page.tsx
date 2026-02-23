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
            </div>
            <div className="mt-4 pt-4 border-t-2 border-primary-200 dark:border-primary-700 flex justify-between items-center">
              <span className="font-semibold text-lg text-neutral-800 dark:text-neutral-200">Total:</span>
              <span className="font-bold text-xl text-primary-700 dark:text-primary-200">
                {formatCurrency(paymentSummary.totalSales ?? 0)}
              </span>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
