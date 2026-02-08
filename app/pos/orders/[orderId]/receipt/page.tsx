'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const CAFE_NAME = 'Cafe Havilah & Pizzeria'

type OrderItem = {
  id: string
  productId: string
  quantity: number
  subtotalUgx: number
}

type Payment = {
  id: string
  amountUgx: number
  method: string
  status: string
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

export default function ReceiptPage() {
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!orderId) {
      setLoading(false)
      return
    }
    fetch(`/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Order not found' : 'Failed to load')
        return res.json()
      })
      .then((data) => {
        if (mounted) setOrder(data)
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load order')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [orderId])

  if (loading) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>
  if (error || !order) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p style={{ color: 'red' }}>{error || 'Order not found'}</p><Link href="/pos">← Back to POS</Link></main>
  if (order.status !== 'served') return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Receipt available after payment.</p><Link href={`/pos/orders/${order.orderId}`}>← Back to order</Link></main>

  const totalPaid = order.payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amountUgx, 0)

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', maxWidth: '400px' }}>
      <p><Link href="/pos" style={{ textDecoration: 'none' }}>← Back to POS</Link></p>
      <div style={{ marginBottom: '1rem' }} className="receipt-content">
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{CAFE_NAME}</h1>
        <p style={{ textAlign: 'center', margin: 0 }}>Order #{order.orderNumber}</p>
        <p style={{ margin: '0.25rem 0' }}>Type: {order.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}</p>
        {order.tableId && <p style={{ margin: '0.25rem 0' }}>Table: {order.tableId}</p>}
        <p style={{ margin: '0.25rem 0' }}>Status: {order.status}</p>
        <hr style={{ margin: '0.75rem 0' }} />
        <p style={{ margin: '0.25rem 0', fontWeight: 'bold' }}>Items</p>
        {order.items.map((item) => (
          <p key={item.id} style={{ margin: '0.15rem 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>{item.productId} × {item.quantity}</span>
            <span>{item.subtotalUgx.toLocaleString()} UGX</span>
          </p>
        ))}
        <hr style={{ margin: '0.75rem 0' }} />
        <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Order total</strong></span>
          <span>{order.totalUgx.toLocaleString()} UGX</span>
        </p>
        <p style={{ margin: '0.25rem 0', display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Amount paid</strong></span>
          <span>{totalPaid.toLocaleString()} UGX</span>
        </p>
        <p style={{ margin: '0.25rem 0', fontWeight: 'bold' }}>Payments</p>
        {order.payments.map((p) => (
          <p key={p.id} style={{ margin: '0.15rem 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>{p.method}</span>
            <span>{p.amountUgx.toLocaleString()} UGX</span>
          </p>
        ))}
        <hr style={{ margin: '0.75rem 0' }} />
        <p style={{ textAlign: 'center', margin: '0.5rem 0' }}>Thank you</p>
        <p style={{ textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>{new Date().toLocaleString()}</p>
      </div>
      <button type="button" onClick={() => window.print()} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Print Receipt</button>
    </main>
  )
}
