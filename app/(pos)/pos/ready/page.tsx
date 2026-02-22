'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import Image from 'next/image'
import { Clock, CheckCircle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

type ReadyOrderItem = {
  productId: string
  productName: string
  imageUrl?: string | null
  quantity: number
}

type ReadyOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: string
  totalUgx?: number
  totalPaidUgx?: number
  isFullyPaid?: boolean
  items: ReadyOrderItem[]
}

function itemsAreaBgClass(status: string): string {
  switch (status) {
    case 'ready':
      return 'bg-neutral-50 dark:bg-green-950/40'
    case 'awaiting_payment':
      return 'bg-neutral-50 dark:bg-orange-950/40'
    default:
      return 'bg-neutral-50 dark:bg-neutral-900'
  }
}

export default function PosReadyPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [orders, setOrders] = useState<ReadyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await posFetch('/api/pos/ready-orders')
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

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
    fetchOrders()
  }, [staffOk, fetchOrders])

  useEffect(() => {
    if (!staffOk) return
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [staffOk, fetchOrders])

  async function handleServe(orderId: string) {
    const staffId = getStaffId()
    if (!staffId) return
    setActing(orderId)
    try {
      // Use checkout API to ensure payment validation
      const res = await posFetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedByStaffId: staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to checkout order')
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to serve order')
    } finally {
      setActing(null)
    }
  }

  if (!staffOk || loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full p-6">
          <SkeletonLoader variant="card" lines={3} />
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl mx-auto text-center">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-4">Ready Orders</h1>
        {error && <div className="pos-alert pos-alert-error mb-4 max-w-md mx-auto">{error}</div>}
        {orders.length === 0 && !error && (
          <EmptyState
            icon={CheckCircle}
            title="No ready orders"
            description="Orders will appear here when they're ready for pickup."
          />
        )}
        <ul
          className={
            orders.length === 1
              ? 'list-none p-0 flex justify-center w-full'
              : orders.length === 2
                ? 'list-none p-0 flex justify-center gap-4 flex-wrap max-w-2xl mx-auto w-full'
                : 'list-none p-0 flex flex-wrap justify-center gap-4 max-w-4xl mx-auto pos-order-list w-full'
          }
        >
          {orders.map((o) => (
            <li
              key={o.orderId}
              className={
                orders.length === 1
                  ? 'w-full max-w-sm'
                  : orders.length === 2
                    ? 'w-full min-w-[240px] sm:w-[calc(50%-0.5rem)] sm:max-w-[320px]'
                    : 'pos-order-list-item'
              }
            >
              <div className="pos-card pos-order-card-border pos-order-card-centered flex flex-col gap-3 animate-slide-in-up h-full">
                <div className="text-center">
                  <p className="m-0 font-semibold text-lg text-primary-800 dark:text-primary-100">
                    Order #{o.orderNumber}
                  </p>
                  <p className="m-0 text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 capitalize">
                    {o.status.replace(/_/g, ' ')}
                  </p>
                </div>
              <div className="text-sm space-y-1 text-center">
                <p className="m-0 text-neutral-600 dark:text-neutral-400">
                  {o.orderType === 'dine_in' && o.tableId ? `Table ${o.tableId}` : 'Takeaway'}
                </p>
                {o.createdAt && (
                  <p className="m-0 text-neutral-500 dark:text-neutral-500">
                    Ready {formatRelativeTime(o.createdAt)}
                  </p>
                )}
              </div>
              <div className={`${itemsAreaBgClass(o.status)} rounded-lg p-3 pos-ready-order-items`}>
                <ul className="m-0 list-none p-0 text-sm text-neutral-700 dark:text-neutral-300">
                  {o.items.map((item, i) => {
                    const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                    return (
                      <Fragment key={i}>
                        <li className="flex items-center gap-2 py-1">
                          <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                            <Image src={imgSrc} alt="" fill className="object-cover" sizes="32px" />
                          </div>
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-primary-600 dark:text-primary-400">× {item.quantity}</span>
                        </li>
                        {i < o.items.length - 1 && <li aria-hidden className="pos-order-item-divider" />}
                      </Fragment>
                    )
                  })}
                </ul>
              </div>
              <div className="mt-auto pt-2">
                {o.status === 'awaiting_payment' && !(o.isFullyPaid ?? false) ? (
                  <Link
                    href={`/pos/payment/${o.orderId}`}
                    className="btn btn-primary w-full inline-block text-center"
                  >
                    Make Payment
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleServe(o.orderId)}
                    disabled={acting !== null}
                    className="btn btn-primary w-full disabled:opacity-60"
                  >
                    {acting === o.orderId ? 'Serving…' : 'Serve Order'}
                  </button>
                )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
