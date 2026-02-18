'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getStaffId, posFetch } from '@/lib/pos-client'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

type KdsOrderItem = {
  productId: string
  productName: string
  imageUrl?: string | null
  quantity: number
  size: string | null
  modifier: string | null
  notes: string | null
}

type KdsOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: string
  items: KdsOrderItem[]
}

function statusBadgeClass(status: string): string {
  const base = 'pos-badge '
  switch (status) {
    case 'pending': return base + 'pos-badge-pending'
    case 'preparing': return base + 'pos-badge-preparing'
    case 'ready': return base + 'pos-badge-ready'
    case 'served': return base + 'pos-badge-served'
    case 'cancelled': return base + 'pos-badge-cancelled'
    default: return base + 'pos-badge-pending'
  }
}

export default function KdsPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await posFetch('/api/kds/orders')
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

  async function setStatus(orderId: string, newStatus: 'preparing' | 'ready') {
    const staffId = getStaffId()
    if (!staffId) return
    setActing(orderId)
    try {
      const res = await posFetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, updatedByStaffId: staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update status')
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setActing(null)
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

  return (
    <main className="pos-page">
      <div className="pos-page-container">
        <Link href="/pos" className="pos-link inline-block mb-4">⇐ Back to POS</Link>
        <h1 className="pos-section-title text-2xl mb-2">Kitchen Display</h1>
        {error && <div className="pos-alert pos-alert-error mb-4">{error}</div>}
        {orders.length === 0 && !error && (
          <div className="pos-card">
            <p className="m-0 text-neutral-600 dark:text-neutral-400">No orders to prepare.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div key={o.orderId} className="pos-card flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="m-0 font-semibold text-primary-800 dark:text-primary-100">{o.orderNumber}</p>
                <span className={statusBadgeClass(o.status)}>{o.status}</span>
              </div>
              <p className="m-0 text-sm text-neutral-600 dark:text-neutral-400">
                {o.orderType === 'dine_in' && o.tableId ? `Table ${o.tableId}` : 'Takeaway'}
              </p>
              <ul className="m-0 list-none p-0 text-neutral-700 dark:text-neutral-300 text-sm">
                {o.items.map((item, i) => {
                  const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                  return (
                    <Fragment key={i}>
                      <li className="flex items-center gap-2 py-1">
                        <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                          <Image src={imgSrc} alt="" fill className="object-cover" sizes="32px" />
                        </div>
                        <span>
                          {item.productName} × {item.quantity}
                          {item.size && ` • ${item.size}`}
                          {item.modifier && ` • ${item.modifier}`}
                          {item.notes && ` — ${item.notes}`}
                        </span>
                      </li>
                      {i < o.items.length - 1 && <li aria-hidden className="pos-order-item-divider" />}
                    </Fragment>
                  )
                })}
              </ul>
              <div className="mt-2">
                {o.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setStatus(o.orderId, 'preparing')}
                    disabled={acting !== null}
                    className="btn btn-primary w-full disabled:opacity-60"
                  >
                    Start Preparing
                  </button>
                )}
                {o.status === 'preparing' && (
                  <button
                    type="button"
                    onClick={() => setStatus(o.orderId, 'ready')}
                    disabled={acting !== null}
                    className="btn btn-secondary w-full disabled:opacity-60"
                  >
                    Mark Ready
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
