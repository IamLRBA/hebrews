'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'

type ActiveOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: string
  totalUgx: number
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

export default function PosOrdersPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  async function fetchActiveShift() {
    try {
      const res = await posFetch('/api/shifts/active')
      if (!res.ok) {
        if (res.status === 404) {
          setError('No active shift')
          setShiftId(null)
          return
        }
        if (res.status === 400) {
          setError('Staff session required')
          setShiftId(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setShiftId(data.shiftId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load active shift')
      setShiftId(null)
    }
  }

  async function fetchOrders() {
    if (!shiftId) {
      setOrders([])
      return
    }
    try {
      const res = await posFetch(`/api/shifts/${shiftId}/orders`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const sorted = [...data].sort(
        (a: ActiveOrder, b: ActiveOrder) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setOrders(sorted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
      setOrders([])
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
    if (shiftId) fetchOrders()
    else setOrders([])
  }, [shiftId])

  async function setStatus(orderId: string, newStatus: string) {
    setActing(orderId)
    try {
      const res = await posFetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, updatedByStaffId: getStaffId() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setActing(null)
    }
  }

  async function checkout(orderId: string) {
    setActing(orderId)
    try {
      const res = await posFetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedByStaffId: getStaffId() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to checkout')
    } finally {
      setActing(null)
    }
  }

  async function cancel(orderId: string) {
    if (!confirm('Cancel this order?')) return
    setActing(orderId)
    try {
      const res = await posFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledByStaffId: getStaffId() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setActing(null)
    }
  }

  if (!staffOk || loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300">Loading…</p>
        </div>
      </main>
    )
  }

  if (error && !shiftId) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md">
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
          <Link href="/pos" className="pos-link">← Back to POS</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-1">Shift Orders</h1>
        <p className="pos-section-subtitle mb-6">Orders for your current shift</p>

        {orders.length === 0 && (
          <div className="pos-card">
            <p className="text-neutral-600 dark:text-neutral-400 m-0">No active orders for this shift.</p>
          </div>
        )}

        <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => (
            <div key={o.orderId} className="pos-order-card">
              <p className="font-medium text-primary-800 dark:text-primary-100 m-0">{o.orderNumber}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mt-1">
                {o.orderType === 'dine_in' && o.tableId ? `Table ${o.tableId}` : 'Takeaway'}
              </p>
              <p className="m-0 mt-2">
                <span className={statusBadgeClass(o.status)}>{o.status}</span>
              </p>
              <p className="m-0 mt-2 font-medium text-primary-700 dark:text-primary-200">
                UGX {o.totalUgx.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 m-0 mt-1">{timeSince(o.createdAt)}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {o.status === 'pending' && (
                  <>
                    <button onClick={() => setStatus(o.orderId, 'preparing')} disabled={acting !== null} className="btn btn-outline text-sm py-2 px-3 disabled:opacity-60">
                      Start Preparing
                    </button>
                    <button onClick={() => cancel(o.orderId)} disabled={acting !== null} className="btn btn-danger text-sm py-2 px-3 disabled:opacity-60">
                      Cancel
                    </button>
                  </>
                )}
                {o.status === 'preparing' && (
                  <button onClick={() => setStatus(o.orderId, 'ready')} disabled={acting !== null} className="btn btn-primary text-sm py-2 px-3 disabled:opacity-60">
                    Mark Ready
                  </button>
                )}
                {o.status === 'ready' && (
                  <button onClick={() => checkout(o.orderId)} disabled={acting !== null} className="btn btn-secondary text-sm py-2 px-3 disabled:opacity-60">
                    Mark Served
                  </button>
                )}
              </div>
              <Link href={`/pos/orders/${o.orderId}`} className="pos-link text-sm mt-2 inline-block">
                Open order →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
