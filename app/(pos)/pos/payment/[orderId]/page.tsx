'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils/format'
import { DollarSign, Smartphone, CreditCard, Wallet } from 'lucide-react'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

type OrderItem = {
  id: string
  productName: string
  imageUrl?: string | null
  quantity: number
  subtotalUgx: number
}

type OrderDetail = {
  orderId: string
  orderNumber: string
  status: string
  totalUgx: number
  orderType?: string
  tableCode?: string | null
  items?: OrderItem[]
  payments?: { method: string; amountUgx: number }[]
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
      router.push(`/pos/receipt/${orderId}`)
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
      router.push(`/pos/receipt/${orderId}`)
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

  const totalPaid = (order.payments ?? []).reduce((sum, p) => sum + p.amountUgx, 0)
  const remaining = order.totalUgx - totalPaid
  const items = order.items ?? []
  const isFullyPaid = remaining <= 0

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
          <h1 className="pos-section-title text-2xl mb-2">Payment</h1>
          <div className="flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 justify-center">
            <span>Order #{order.orderNumber}</span>
            {order.orderType && (
              <span>· {order.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}</span>
            )}
            {order.tableCode && <span>· Table {order.tableCode}</span>}
          </div>

          {items.length > 0 && (
            <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 m-0 mb-3 text-center">Order items</p>
              <ul className="list-none p-0 m-0 max-h-40 overflow-y-auto">
                {items.map((item, index) => {
                  const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                  return (
                    <Fragment key={item.id}>
                      <li className="py-3 flex items-center gap-3 flex-wrap first:pt-0">
                        <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                          <Image src={imgSrc} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                        <span className="text-neutral-600 dark:text-neutral-400 truncate flex-1 min-w-0 text-left">
                          {item.quantity}× {item.productName}
                        </span>
                        <span className="font-medium text-primary-700 dark:text-primary-200 shrink-0">
                          {formatCurrency(item.subtotalUgx)}
                        </span>
                      </li>
                      {index < items.length - 1 && <li aria-hidden className="pos-order-item-divider" />}
                    </Fragment>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="mb-6 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-700 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mb-2">Amount to pay</p>
            <p className="text-3xl font-bold text-primary-700 dark:text-primary-200 m-0">
              {formatCurrency(remaining > 0 ? remaining : order.totalUgx)}
            </p>
            {totalPaid > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 m-0">
                Paid: {formatCurrency(totalPaid)} · Remaining: {formatCurrency(remaining)}
              </p>
            )}
          </div>

          {isFullyPaid ? (
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-700 text-center">
              <p className="font-semibold text-green-700 dark:text-green-300 m-0 mb-2">Payment complete</p>
              <Link href={`/pos/receipt/${orderId}`} className="pos-link text-green-600 dark:text-green-400">
                View receipt
              </Link>
            </div>
          ) : (
            <>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 text-center">Select payment method</p>
          <div className="grid grid-cols-2 gap-3 pos-payment-grid max-w-xs mx-auto">
            <button
              type="button"
              onClick={handlePayCash}
              disabled={paying !== null}
              className="btn btn-outline py-2.5 text-sm font-medium disabled:opacity-60 flex flex-col items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              {paying === 'cash' ? 'Processing…' : 'Cash'}
            </button>
            <button
              type="button"
              onClick={handlePayMomo}
              disabled={paying !== null}
              className="btn btn-primary py-2.5 text-sm font-medium disabled:opacity-60 flex flex-col items-center gap-1.5"
            >
              <Smartphone className="w-4 h-4" />
              {paying === 'momo' ? 'Processing…' : 'MTN MoMo'}
            </button>
            <button
              type="button"
              onClick={handlePayAirtel}
              disabled={paying !== null}
              className="btn btn-primary py-2.5 text-sm font-medium disabled:opacity-60 flex flex-col items-center gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              {paying === 'airtel' ? 'Redirecting…' : 'Airtel Money'}
            </button>
            <button
              type="button"
              onClick={handlePayCard}
              disabled={paying !== null}
              className="btn btn-outline py-2.5 text-sm font-medium disabled:opacity-60 flex flex-col items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              {paying === 'card' ? 'Redirecting…' : 'Card'}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
