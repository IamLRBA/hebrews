'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const STAFF_ID = '00000000-0000-0000-0000-000000000001'

type OrderItem = {
  id: string
  productId: string
  quantity: number
  size: string | null
  modifier: string | null
  notes: string | null
  subtotalUgx: number
}

type Payment = {
  id: string
  amountUgx: number
  method: string
  status: string
}

type Product = {
  id: string
  name: string
  priceUgx: number
  isActive: boolean
}

type OrderDetail = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  totalUgx: number
  items: OrderItem[]
  payments: Payment[]
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [amountUgx, setAmountUgx] = useState('')
  const [method, setMethod] = useState('cash')

  async function fetchOrder() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Order not found')
          setOrder(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (orderId) fetchOrder()
  }, [orderId])

  useEffect(() => {
    fetchProducts()
  }, [])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || quantity < 1) return
    setAddingItem(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setProductId('')
      setQuantity(1)
      await fetchOrder()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(amountUgx)
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a valid amount')
      return
    }
    setRecordingPayment(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUgx: amount,
          method,
          status: 'completed',
          createdByStaffId: STAFF_ID,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setAmountUgx('')
      await fetchOrder()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  async function handleCheckout() {
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedByStaffId: STAFF_ID }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      router.push('/pos')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to checkout')
    } finally {
      setCheckingOut(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledByStaffId: STAFF_ID }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      router.push('/pos')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  const block =
    order?.status === 'served' || order?.status === 'cancelled'
  const canCheckout = order?.status === 'ready' && !block

  if (loading) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>
  if (error && !order) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p style={{ color: 'red' }}>{error}</p><Link href="/pos">← Back to POS</Link></main>

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p><Link href="/pos" style={{ textDecoration: 'none' }}>← Back to POS</Link></p>
      <h1>Order {order?.orderNumber}</h1>

      <section style={{ marginBottom: '1.5rem' }}>
        <p><strong>Type:</strong> {order?.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}</p>
        {order?.tableId && <p><strong>Table:</strong> {order.tableId}</p>}
        <p><strong>Status:</strong> {order?.status}</p>
        <p><strong>Total:</strong> {order?.totalUgx?.toLocaleString()} UGX</p>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Items</h2>
        {order?.items.length === 0 && <p>No items.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {order?.items.map((item) => (
            <li key={item.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              {item.productId} × {item.quantity}
              {item.size && ` • ${item.size}`}
              {item.modifier && ` • ${item.modifier}`}
              {' — '}{item.subtotalUgx.toLocaleString()} UGX
            </li>
          ))}
        </ul>
        {!block && (
          <form onSubmit={handleAddItem} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              style={{ padding: '0.25rem', minWidth: '14rem' }}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceUgx.toLocaleString()} UGX
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              style={{ padding: '0.25rem', width: '4rem' }}
            />
            <button type="submit" disabled={addingItem}>Add Item</button>
          </form>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Payments</h2>
        {order?.payments.length === 0 && <p>No payments.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {order?.payments.map((p) => (
            <li key={p.id} style={{ padding: '0.25rem 0' }}>
              {p.amountUgx.toLocaleString()} UGX — {p.method} — {p.status}
            </li>
          ))}
        </ul>
        {!block && (
          <form onSubmit={handleRecordPayment} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="Amount"
              value={amountUgx}
              onChange={(e) => setAmountUgx(e.target.value)}
              style={{ padding: '0.25rem', width: '8rem' }}
            />
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ padding: '0.25rem' }}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mtn_momo">MTN MoMo</option>
              <option value="airtel_money">Airtel Money</option>
            </select>
            <button type="submit" disabled={recordingPayment}>Record Payment</button>
          </form>
        )}
      </section>

      <section style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleCheckout} disabled={!canCheckout || checkingOut}>
          Checkout Order
        </button>
        <button onClick={handleCancel} disabled={block || cancelling}>
          Cancel Order
        </button>
      </section>
    </main>
  )
}
