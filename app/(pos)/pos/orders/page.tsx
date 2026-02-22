'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListOrdered } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'

type ActiveOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: string
  totalUgx: number
}

export default function PosOrdersListPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await posFetch('/api/orders/active')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load orders')
      }
      const data = await res.json()
      const sorted = [...data].sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setOrders(sorted)
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
    fetchOrders()
  }, [staffOk, fetchOrders])

  const listOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing')

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl mx-auto">
        <PosNavHeader />
        <div className="text-center mb-6">
          <h1 className="pos-section-title text-2xl mb-2">Orders</h1>
          <p className="text-neutral-600 dark:text-neutral-400 m-0">
            All active "pending" and "preparing" orders for this shift. Open, update status, or checkout.
          </p>
        </div>
        {loading && (
          <div className="pos-card max-w-sm mx-auto p-6">
            <SkeletonLoader variant="card" lines={3} />
          </div>
        )}
        {error && (
          <div className="pos-alert pos-alert-error mb-4 max-w-md mx-auto">{error}</div>
        )}
        {!loading && !error && listOrders.length === 0 && (
          <EmptyState
            icon={ListOrdered}
            title="No active orders Here"
            description="Create an order from the Order page or open Tables to start from a table."
            action={
              <Link href="/pos/order" className="btn btn-primary py-3 px-6">
                Make an order
              </Link>
            }
          />
        )}
        {!loading && !error && listOrders.length > 0 && (
          <ul
            className={
              listOrders.length === 1
                ? 'list-none p-0 flex justify-center'
                : listOrders.length === 2
                  ? 'list-none p-0 flex justify-center gap-4 flex-wrap max-w-2xl mx-auto'
                  : 'list-none p-0 flex flex-wrap justify-center gap-4 max-w-4xl mx-auto pos-order-list'
            }
          >
            {listOrders.map((o) => (
              <li
                key={o.orderId}
                className={
                  listOrders.length === 1
                    ? 'w-full max-w-sm'
                    : listOrders.length === 2
                      ? 'w-full min-w-[240px] sm:w-[calc(50%-0.5rem)] sm:max-w-[320px]'
                      : 'pos-order-list-item'
                }
              >
                <Link
                  href={`/pos/orders/${o.orderId}`}
                  className="pos-order-card pos-order-card-centered block no-underline text-inherit hover:border-primary-300 dark:hover:border-primary-600 h-full"
                >
                  <p className="font-medium text-primary-800 dark:text-primary-100 m-0">{o.orderNumber}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mt-1">
                    {o.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}
                    {o.tableId && ` · Table ${o.tableId}`}
                  </p>
                  <div className="m-0 mt-2">
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-lg font-semibold mt-3 m-0 text-primary-700 dark:text-primary-200">
                    UGX {o.totalUgx.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 m-0 mt-1">
                    {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
