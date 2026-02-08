'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'

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

  if (!staffOk || loading) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>
  if (error && !shiftId) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p style={{ color: 'red' }}>{error}</p><Link href="/pos">← Back to POS</Link></main>

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p><Link href="/pos" style={{ textDecoration: 'none' }}>← Back to POS</Link></p>
      <h1>Active Orders</h1>

      {orders.length === 0 && <p>No active orders for this shift.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {orders.map((o) => (
          <div
            key={o.orderId}
            style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <p style={{ margin: 0, fontWeight: 'bold' }}>{o.orderNumber}</p>
            <p style={{ margin: 0 }}>Table: {o.tableId || '—'}</p>
            <p style={{ margin: 0 }}>Status: {o.status}</p>
            <p style={{ margin: 0 }}>{o.totalUgx.toLocaleString()} UGX</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>{timeSince(o.createdAt)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {o.status === 'pending' && (
                <>
                  <button onClick={() => setStatus(o.orderId, 'preparing')} disabled={acting !== null}>Start Preparing</button>
                  <button onClick={() => cancel(o.orderId)} disabled={acting !== null}>Cancel</button>
                </>
              )}
              {o.status === 'preparing' && (
                <button onClick={() => setStatus(o.orderId, 'ready')} disabled={acting !== null}>Mark Ready</button>
              )}
              {o.status === 'ready' && (
                <button onClick={() => checkout(o.orderId)} disabled={acting !== null}>Mark Served</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
