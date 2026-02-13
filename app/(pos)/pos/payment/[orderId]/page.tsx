'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { DollarSign, Smartphone, CreditCard, Wallet } from 'lucide-react'

type OrderDetail = {
  orderId: string
  orderNumber: string
  status: string
  totalUgx: number
}

export default function PosPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
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
    posFetch(`/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found')
        return res.json()
      })
      .then((data) => {
        setOrder(data)
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId])

  async function handlePayCash() {
    const staffId = getStaffId()
    if (!staffId || !order) return

    setPaying('cash')
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx: order.totalUgx, staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Payment failed')
      }
      router.replace(`/pos/receipt/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(null)
    }
  }

  async function handlePayMomo() {
    const staffId = getStaffId()
    if (!staffId || !order) return

    setPaying('momo')
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-momo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx: order.totalUgx, staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Payment failed')
      }
      router.replace(`/pos/receipt/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(null)
    }
  }

  async function handlePayAirtel() {
    if (!order) return
    setPaying('airtel')
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-pesapal`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Payment failed')
      }
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error('No payment URL')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
      setPaying(null)
    }
  }

  async function handlePayCard() {
    if (!order) return
    setPaying('card')
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-pesapal`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Payment failed')
      }
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error('No payment URL')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
      setPaying(null)
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
          <Link href="/pos/orders" className="pos-link">⇐ Back to Orders</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <PosNavHeader />
      {error && (
        <div className="mx-4 mt-2">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="pos-card w-full max-w-lg p-8">
          <h1 className="pos-section-title text-2xl mb-2">Payment</h1>
          <p className="text-neutral-600 dark:text-neutral-400 m-0 mb-6">
            Order #{order.orderNumber}
          </p>
          <div className="mb-8 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mb-2">Total Amount</p>
            <p className="text-3xl font-bold text-primary-700 dark:text-primary-200 m-0">
              UGX {order.totalUgx.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pos-payment-grid">
            <button
              type="button"
              onClick={handlePayCash}
              disabled={paying !== null}
              className="btn btn-primary py-5 text-base font-semibold disabled:opacity-60 flex flex-col items-center gap-2"
            >
              <DollarSign className="w-6 h-6" />
              {paying === 'cash' ? 'Processing…' : 'Cash'}
            </button>
            <button
              type="button"
              onClick={handlePayMomo}
              disabled={paying !== null}
              className="btn btn-primary py-5 text-base font-semibold disabled:opacity-60 flex flex-col items-center gap-2"
            >
              <Smartphone className="w-6 h-6" />
              {paying === 'momo' ? 'Processing…' : 'MTN MoMo'}
            </button>
            <button
              type="button"
              onClick={handlePayAirtel}
              disabled={paying !== null}
              className="btn btn-outline py-5 text-base font-semibold disabled:opacity-60 flex flex-col items-center gap-2"
            >
              <Wallet className="w-6 h-6" />
              {paying === 'airtel' ? 'Redirecting…' : 'Airtel Money'}
            </button>
            <button
              type="button"
              onClick={handlePayCard}
              disabled={paying !== null}
              className="btn btn-outline py-5 text-base font-semibold disabled:opacity-60 flex flex-col items-center gap-2"
            >
              <CreditCard className="w-6 h-6" />
              {paying === 'card' ? 'Redirecting…' : 'Card'}
            </button>
          </div>
        </div>
        <Link href={`/pos/orders`} className="pos-link mt-6">⇐ Back to Orders</Link>
      </div>
    </main>
  )
}
