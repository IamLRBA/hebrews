'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'

function generateOrderNumber() {
  return `ORD-${Date.now()}`
}

export default function PosActiveOrdersPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [orders, setOrders] = useState<Array<{
    orderId: string
    orderNumber: string
    orderType: string
    tableId: string | null
    status: string
    createdAt: string
    totalUgx: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<'dine-in' | 'takeaway' | null>(null)

  async function fetchOrders() {
    setLoading(true)
    setError(null)
    try {
      const res = await posFetch('/api/orders/active')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const sorted = [...data].sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setOrders(sorted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
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
    fetchOrders()
  }, [staffOk])

  async function handleNewDineIn() {
    setCreating('dine-in')
    try {
      const tableId = prompt('Table ID (e.g. T1):') || 'T1'
      const res = await posFetch('/api/orders/dine-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: getStaffId(),
          tableId,
          orderNumber: generateOrderNumber(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(null)
    }
  }

  async function handleNewTakeaway() {
    setCreating('takeaway')
    try {
      const res = await posFetch('/api/orders/takeaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: getStaffId(),
          orderNumber: generateOrderNumber(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(null)
    }
  }

  if (!staffOk) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>POS — Active Orders</h1>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleNewDineIn}
          disabled={creating !== null}
          style={{ padding: '0.5rem 1rem', cursor: creating ? 'wait' : 'pointer' }}
        >
          {creating === 'dine-in' ? 'Creating…' : 'New Dine-In Order'}
        </button>
        <button
          onClick={handleNewTakeaway}
          disabled={creating !== null}
          style={{ padding: '0.5rem 1rem', cursor: creating ? 'wait' : 'pointer' }}
        >
          {creating === 'takeaway' ? 'Creating…' : 'New Takeaway Order'}
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && orders.length === 0 && <p>No active orders.</p>}
      {!loading && !error && orders.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {orders.map((o) => (
            <li key={o.orderId} style={{ marginBottom: '0.5rem' }}>
              <Link
                href={`/pos/orders/${o.orderId}`}
                style={{
                  display: 'block',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <strong>{o.orderNumber}</strong>
                {' — '}
                {o.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}
                {o.tableId && ` • Table ${o.tableId}`}
                {' • '}
                {o.status}
                {' • '}
                {o.totalUgx.toLocaleString()} UGX
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
