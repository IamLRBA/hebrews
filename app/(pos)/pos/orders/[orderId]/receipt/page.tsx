'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const CAFE_NAME = 'Cafe Havilah & Pizzeria'

type OrderItem = {
  id: string
  productId: string
  productName: string
  quantity: number
  subtotalUgx: number
}

type Payment = {
  method: string
  amountUgx: number
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

  if (loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }
  if (error || !order) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md">
          <div className="pos-alert pos-alert-error mb-4">{error || 'Order not found'}</div>
          <Link href="/pos" className="pos-link">← Back to POS</Link>
        </div>
      </main>
    )
  }
  if (order.status !== 'served') {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md">
          <div className="pos-card">
            <p className="m-0 text-neutral-700 dark:text-neutral-300">Receipt available after payment.</p>
          </div>
          <Link href={`/pos/orders/${order.orderId}`} className="pos-link inline-block mt-4">← Back to order</Link>
        </div>
      </main>
    )
  }

  const totalPaid = order.payments.reduce((sum, p) => sum + p.amountUgx, 0)

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-md">
        <Link href="/pos" className="pos-link inline-block mb-4">← Back to POS</Link>
        <div className="pos-card receipt-content">
          <h1 className="pos-section-title text-center mb-2">{CAFE_NAME}</h1>
          <p className="text-center m-0 text-neutral-600 dark:text-neutral-400">Order #{order.orderNumber}</p>
          <p className="m-0 mt-2 text-neutral-700 dark:text-neutral-300">Type: {order.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}</p>
          {order.tableId && <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300">Table: {order.tableId}</p>}
          <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300">Status: {order.status}</p>
          <hr className="border-neutral-200 dark:border-neutral-600 my-4" />
          <p className="pos-section-title text-base m-0 mb-2">Items</p>
          {order.items.map((item) => (
            <p key={item.id} className="m-0 py-1 flex justify-between text-neutral-800 dark:text-neutral-200">
              <span>{item.productName} × {item.quantity}</span>
              <span className="font-medium text-primary-700 dark:text-primary-200">{item.subtotalUgx.toLocaleString()} UGX</span>
            </p>
          ))}
          <hr className="border-neutral-200 dark:border-neutral-600 my-4" />
          <p className="m-0 py-1 flex justify-between font-medium">
            <span>Order total</span>
            <span className="text-primary-700 dark:text-primary-200">{order.totalUgx.toLocaleString()} UGX</span>
          </p>
          <p className="m-0 py-1 flex justify-between font-medium">
            <span>Amount paid</span>
            <span className="text-primary-700 dark:text-primary-200">{totalPaid.toLocaleString()} UGX</span>
          </p>
          <p className="pos-section-title text-base m-0 mt-3 mb-2">Payments</p>
          {order.payments.map((p, i) => (
            <p key={i} className="m-0 py-1 flex justify-between text-neutral-700 dark:text-neutral-300">
              <span>{p.method}</span>
              <span>{p.amountUgx.toLocaleString()} UGX</span>
            </p>
          ))}
          <hr className="border-neutral-200 dark:border-neutral-600 my-4" />
          <p className="text-center m-0 font-medium text-primary-700 dark:text-primary-200">Thank you</p>
          <p className="text-center m-0 mt-1 text-sm text-neutral-500 dark:text-neutral-400">{new Date().toLocaleString()}</p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn btn-primary mt-4">Print Receipt</button>
      </div>
    </main>
  )
}
