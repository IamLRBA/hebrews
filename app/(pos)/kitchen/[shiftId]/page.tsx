'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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
  items: QueueItem[]
  status: string
  createdAt: string
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
      return 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'
    case 'preparing':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600'
    case 'ready':
      return 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
    default:
      return 'bg-neutral-100 dark:bg-neutral-800'
  }
}

export default function KitchenDisplayPage() {
  const router = useRouter()
  const params = useParams()
  const shiftId = params.shiftId as string

  const [queue, setQueue] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!shiftId) return
    try {
      const res = await posFetch(`/api/kitchen/${shiftId}/queue`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load queue')
      }
      const data = await res.json()
      const allOrders = Array.isArray(data) ? data : []
      // Filter only pending orders for this page
      setQueue(allOrders.filter((order: any) => order.status === 'pending'))
      setError(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load queue'
      setError(errorMsg)
      setQueue([])
      console.error('Kitchen queue error:', e)
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/login')
      return
    }
  }, [router])

  useEffect(() => {
    if (!shiftId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchQueue()
  }, [shiftId, fetchQueue])

  useEffect(() => {
    if (!shiftId) return
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [shiftId, fetchQueue])

  async function handleStatusChange(orderId: string, newStatus: 'preparing' | 'ready') {
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

  if (!shiftId) {
    return (
      <RoleGuard allowedRoles={['kitchen']}>
        <main className="pos-page flex items-center justify-center min-h-screen">
          <div className="pos-card max-w-sm w-full text-center">
            <p className="text-neutral-600 dark:text-neutral-400 m-0">Invalid shift</p>
            <Link href="/kitchen" className="pos-link mt-4 inline-block">← Back to Kitchen</Link>
          </div>
        </main>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['kitchen']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <KitchenNavHeader shiftId={shiftId} />
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
            ) : queue.length === 0 ? (
              <div className="pos-card max-w-md mx-auto text-center py-12">
                <p className="m-0 text-neutral-600 dark:text-neutral-400">No pending orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-7xl">
            {queue.map((order) => (
              <div
                key={order.orderId}
                className={`rounded-lg border-2 p-4 flex flex-col ${ticketBgClass(order.status)}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono font-semibold text-sm">
                    #{order.orderId.slice(0, 8)}
                  </span>
                  <span className="text-xs text-neutral-500">{timeSince(order.createdAt)}</span>
                </div>
                <p className="m-0 text-sm font-medium mb-2">
                  {order.tableLabel ?? 'Takeaway'}
                </p>
                <ul className="m-0 list-none p-0 text-sm flex-1">
                  {order.items.map((item, i) => {
                    const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                    return (
                      <Fragment key={i}>
                        <li className="flex items-center gap-2 py-1">
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
                <p className="m-0 mt-2 text-xs capitalize">{order.status}</p>
                <div className="mt-3">
                  {order.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order.orderId, 'preparing')}
                      disabled={acting !== null}
                      className="btn btn-primary w-full py-2 text-sm disabled:opacity-60"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order.orderId, 'ready')}
                      disabled={acting !== null}
                      className="btn btn-primary w-full py-2 text-sm disabled:opacity-60"
                    >
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
