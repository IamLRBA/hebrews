'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'

type ReadyOrderItem = {
  productId: string
  productName: string
  quantity: number
}

type ReadyOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: string
  items: ReadyOrderItem[]
}

export default function PosReadyPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [orders, setOrders] = useState<ReadyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await posFetch('/api/pos/ready-orders')
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

  async function handleServe(orderId: string) {
    const staffId = getStaffId()
    if (!staffId) return
    setActing(orderId)
    try {
      // Use checkout API to ensure payment validation
      const res = await posFetch(`/api/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedByStaffId: staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to checkout order')
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to serve order')
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
      <div className="pos-page-container max-w-4xl mx-auto text-center">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-4">Ready Orders</h1>
        {error && <div className="pos-alert pos-alert-error mb-4 max-w-md mx-auto">{error}</div>}
        {orders.length === 0 && !error && (
          <div className="pos-card max-w-md mx-auto">
            <p className="m-0 text-neutral-600 dark:text-neutral-400">No ready orders.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div key={o.orderId} className="pos-card pos-order-card-centered flex flex-col gap-2">
              <p className="m-0 font-semibold text-primary-800 dark:text-primary-100">Order #{o.orderNumber}</p>
              <p className="m-0 text-sm text-neutral-600 dark:text-neutral-400">
                {o.orderType === 'dine_in' && o.tableId ? `Table ${o.tableId}` : 'Takeaway'}
              </p>
              <ul className="m-0 pl-5 list-disc text-neutral-700 dark:text-neutral-300 space-y-1">
                {o.items.map((item, i) => (
                  <li key={i}>{item.productName} × {item.quantity}</li>
                ))}
              </ul>
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleServe(o.orderId)}
                  disabled={acting !== null}
                  className="btn btn-primary disabled:opacity-60"
                >
                  Serve Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
