'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { isOnline } from '@/lib/offline/connection'
import { getOrderDetailOfflineFormatted, payAirtelOffline } from '@/lib/offline/offline-order-service'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { formatCurrency } from '@/lib/utils/format'

const AIRTEL_MERCHANT_ID = '4403375'
const AIRTEL_DIAL = '*185*9#'

type OrderDetail = {
  orderId: string
  orderNumber: string
  status: string
  totalUgx: number
}

export default function PosPaymentAirtelPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/pos/login')
      return
    }
    if (!getShiftId()) {
      router.replace('/pos/start')
      return
    }
  }, [router])

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    if (!isOnline()) {
      getOrderDetailOfflineFormatted(orderId)
        .then((data) => setOrder(data ?? null))
        .catch(() => setOrder(null))
        .finally(() => setLoading(false))
      return
    }
    posFetch(`/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found')
        return res.json()
      })
      .then((data) => setOrder(data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId])

  async function handleCompletePayment() {
    const staffId = getStaffId()
    if (!staffId || !order) return

    setPaying(true)
    setError(null)
    try {
      if (!isOnline()) {
        await payAirtelOffline({ orderLocalId: orderId, amountUgx: order.totalUgx })
        router.push(`/pos/receipt/${orderId}`)
        return
      }
      const res = await posFetch(`/api/orders/${orderId}/pay-airtel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx: order.totalUgx, staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Payment failed')
      }
      router.push(`/pos/receipt/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main className="pos-page flex items-center justify-center min-h-screen">
        <div className="pos-card max-w-sm w-full p-6">
          <SkeletonLoader variant="card" lines={4} />
        </div>
      </main>
    )
  }

  if (!order || !orderId) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto">
          <PosNavHeader />
          <ErrorBanner message="Order not found" onDismiss={() => {}} />
          <Link href="/pos/ready" className="pos-link">⇐ Back to Ready</Link>
        </div>
      </main>
    )
  }

  const amount = order.totalUgx

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <div className="flex-shrink-0 fixed top-0 left-0 right-0 z-[1020] bg-[var(--color-bg-primary)] px-4 pt-4 [&_.pos-dashboard-header]:mb-0">
        <PosNavHeader />
      </div>
      <div className="flex-shrink-0 min-h-[8rem]" aria-hidden />
      {error && (
        <div className="mx-4 mt-2 flex-shrink-0">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="flex-1 flex flex-col items-center p-6 overflow-auto">
        <div className="pos-card w-full max-w-lg p-8 text-center">
          <h1 className="pos-section-title text-2xl mb-6">Pay using Airtel Money</h1>

          <div className="space-y-4 text-left mb-8 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <p className="m-0"><span className="text-neutral-500 dark:text-neutral-400">Merchant ID:</span> <strong className="font-mono">{AIRTEL_MERCHANT_ID}</strong></p>
            <p className="m-0"><span className="text-neutral-500 dark:text-neutral-400">Dial:</span> <strong className="font-mono text-lg">{AIRTEL_DIAL}</strong></p>
            <p className="m-0 pt-2 border-t border-neutral-200 dark:border-neutral-600">
              <span className="text-neutral-500 dark:text-neutral-400">Amount:</span> <strong className="text-primary-700 dark:text-primary-200">{formatCurrency(amount)} UGX</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/pos/payment/${orderId}`}
              className="btn border-2 border-neutral-300 dark:border-neutral-600 py-3 px-6 rounded-lg font-medium text-center"
            >
              Back
            </Link>
            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={paying}
              className="btn btn-primary py-3 px-8 text-base font-medium disabled:opacity-60"
            >
              {paying ? 'Processing…' : 'Complete Payment'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
