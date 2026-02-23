'use client'

import { Fragment, Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { KitchenNavHeader } from '@/components/kitchen/KitchenNavHeader'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

type QueueItem = {
  name: string
  imageUrl?: string | null
  quantity: number
}

type QueueOrder = {
  orderId: string
  tableLabel: string | null
  customerName: string | null
  items: QueueItem[]
  status: string
  createdAt: string
  preparationNotes?: string | null
}

function timeSince(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}

function ticketBgClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
    case 'preparing':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
    case 'ready':
      return 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
    default:
      return 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
  }
}

function itemsAreaBgClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-neutral-50 dark:bg-neutral-900'
    case 'preparing':
      return 'bg-neutral-50 dark:bg-yellow-950/40'
    case 'ready':
      return 'bg-neutral-50 dark:bg-green-950/40'
    default:
      return 'bg-neutral-50 dark:bg-neutral-900'
  }
}

function KitchenPreparingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shiftId = searchParams.get('shiftId')
  const [queue, setQueue] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!shiftId) {
      setError('Shift ID required')
      setLoading(false)
      return
    }
    try {
      const res = await posFetch(`/api/kitchen/${shiftId}/queue`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load queue')
      }
      const data = await res.json()
      const allOrders = Array.isArray(data) ? data : []
      setQueue(allOrders.filter((order: QueueOrder) => order.status === 'preparing'))
      setError(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load queue'
      setError(errorMsg)
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/login')
      return
    }
    if (shiftId) {
      setLoading(true)
      fetchQueue()
      const interval = setInterval(fetchQueue, 5000)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [shiftId, fetchQueue, router])

  async function handleStatusChange(orderId: string, newStatus: 'ready') {
    const staffId = getStaffId()
    if (!staffId) return

    setActing(orderId)
    try {
      const res = await posFetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }
      await fetchQueue()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setActing(null)
    }
  }

  return (
    <RoleGuard allowedRoles={['kitchen']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <KitchenNavHeader shiftId={shiftId ?? undefined} />
          <main className="flex flex-col items-center">
            {error && (
              <div className="mb-4 w-full max-w-7xl">
                <ErrorBanner message={error} onDismiss={() => setError(null)} />
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-neutral-500 dark:text-neutral-400 mt-4">Loading orders...</p>
              </div>
            ) : !shiftId ? (
              <div className="pos-card max-w-md mx-auto text-center py-12">
                <p className="m-0 text-neutral-600 dark:text-neutral-400">Shift ID required. Use Pending to open a shift first.</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="pos-card max-w-md mx-auto text-center py-12">
                <p className="m-0 text-neutral-600 dark:text-neutral-400">No preparing orders</p>
              </div>
            ) : (
              <ul
                className={
                  queue.length === 1
                    ? 'list-none p-0 flex justify-center w-full'
                    : queue.length === 2
                      ? 'list-none p-0 flex justify-center gap-4 flex-wrap max-w-2xl mx-auto w-full'
                      : 'list-none p-0 flex flex-wrap justify-center gap-4 max-w-4xl mx-auto pos-order-list w-full'
                }
              >
                {queue.map((order) => (
                  <li
                    key={order.orderId}
                    className={
                      queue.length === 1
                        ? 'w-full max-w-sm'
                        : queue.length === 2
                          ? 'w-full min-w-[240px] sm:w-[calc(50%-0.5rem)] sm:max-w-[320px]'
                          : 'pos-order-list-item'
                    }
                  >
                    <div
                      className={`pos-order-card-border rounded-lg p-4 flex flex-col h-full ${ticketBgClass(order.status)}`}
                    >
                      <div className="text-center mb-3">
                        <p className="m-0 font-semibold text-primary-800 dark:text-primary-100">
                          Order #{order.customerName ?? order.orderId.slice(0, 8)}
                        </p>
                        <p className="m-0 text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 capitalize">
                          {order.status.replace(/_/g, ' ')}
                        </p>
                        <p className="m-0 text-xs text-neutral-500 mt-1">{timeSince(order.createdAt)}</p>
                      </div>
                      <p className="m-0 text-sm font-medium mb-3 text-center">
                        {order.tableLabel ?? 'Takeaway'}
                      </p>
                      {order.preparationNotes && (
                        <div className="m-0 text-sm text-amber-700 dark:text-amber-300 mb-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800 text-center">
                          <p className="m-0 font-medium">Note:</p>
                          <p className="m-0 mt-0.5">{order.preparationNotes}</p>
                        </div>
                      )}
                      <div className={`w-full ${itemsAreaBgClass(order.status)} rounded-lg p-3 mb-3 border border-neutral-200 dark:border-neutral-700`}>
                        <ul className="m-0 list-none p-0 text-sm flex-1 text-left">
                          {order.items.map((item, i) => {
                            const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                            return (
                              <Fragment key={i}>
                                <li className="flex items-center gap-2 py-1 justify-start">
                                  <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                                    <Image src={imgSrc} alt="" fill className="object-cover" sizes="32px" />
                                  </div>
                                  <span>{item.name} × {item.quantity}</span>
                                </li>
                                {i < order.items.length - 1 && <li aria-hidden className="pos-order-item-divider" />}
                              </Fragment>
                            )
                          })}
                        </ul>
                      </div>
                      <div className="mt-auto w-full flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.orderId, 'ready')}
                          disabled={acting !== null}
                          className="btn btn-primary flex-1 py-2 text-sm disabled:opacity-60"
                        >
                          Mark Ready
                        </button>
                        <a
                          href={`/order-print/${order.orderId}?autoPrint=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline flex-1 py-2 text-sm text-center"
                        >
                          Print Order
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}

export default function KitchenPreparingPage() {
  return (
    <Suspense fallback={
      <div className="pos-page min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    }>
      <KitchenPreparingContent />
    </Suspense>
  )
}
