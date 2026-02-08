'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'

type KdsOrderItem = {
  productId: string
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

  if (!staffOk || loading) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p><Link href="/pos" style={{ textDecoration: 'none' }}>← Back to POS</Link></p>
      <h1>Kitchen Display</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {orders.length === 0 && !error && <p>No orders to prepare.</p>}
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
            <p style={{ margin: 0 }}>
              {o.orderType === 'dine_in' && o.tableId ? `Table ${o.tableId}` : 'Takeaway'}
            </p>
            <p style={{ margin: 0 }}>Status: {o.status}</p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {o.items.map((item, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>
                  {item.productId} × {item.quantity}
                  {item.size && ` • ${item.size}`}
                  {item.modifier && ` • ${item.modifier}`}
                  {item.notes && ` — ${item.notes}`}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '0.5rem' }}>
              {o.status === 'pending' && (
                <button
                  onClick={() => setStatus(o.orderId, 'preparing')}
                  disabled={acting !== null}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Start Preparing
                </button>
              )}
              {o.status === 'preparing' && (
                <button
                  onClick={() => setStatus(o.orderId, 'ready')}
                  disabled={acting !== null}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Mark Ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
