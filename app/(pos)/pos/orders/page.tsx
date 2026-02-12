'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'

type PosProduct = {
  productId: string
  name: string
  priceUgx: number
  category?: string | null
}

type OrderItem = {
  id: string
  productId: string
  productName: string
  quantity: number
  subtotalUgx?: number
  lineTotalUgx?: number
}

type OrderDetail = {
  orderId: string
  orderNumber: string
  status: string
  totalUgx: number
  items: OrderItem[]
}

function generateOrderNumber() {
  return `ORD-${Date.now()}`
}

export default function PosOrdersPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [products, setProducts] = useState<PosProduct[]>([])
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category || 'Other').filter(Boolean)))]

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => (p.category || 'Other') === selectedCategory)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await posFetch('/api/pos/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch {
      setProducts([])
    }
  }, [])

  const fetchOrder = useCallback(
    async (orderId: string) => {
      try {
        const res = await posFetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        } else {
          setOrder(null)
        }
      } catch {
        setOrder(null)
      }
    },
    []
  )

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/pos/login')
      return
    }
    const shiftId = getShiftId()
    if (!shiftId) {
      router.replace('/pos/start')
      return
    }
    setStaffOk(true)
  }, [router])

  useEffect(() => {
    if (!staffOk) return
    setLoading(true)
    fetchProducts().finally(() => setLoading(false))
  }, [staffOk, fetchProducts])

  async function handleNewOrder() {
    const staffId = getStaffId()
    if (!staffId) return
    setCreating(true)
    try {
      const res = await posFetch('/api/orders/takeaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          orderNumber: generateOrderNumber(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create order')
      }
      const data = await res.json()
      setOrder({
        orderId: data.id,
        orderNumber: data.orderNumber,
        status: data.status,
        totalUgx: data.totalUgx ?? 0,
        items: [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  async function handleAddProduct(product: PosProduct) {
    let orderId = order?.orderId
    if (!orderId) {
      const staffId = getStaffId()
      if (!staffId) return
      setAddingItem(true)
      setCreating(true)
      try {
        const createRes = await posFetch('/api/orders/takeaway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId,
            orderNumber: generateOrderNumber(),
          }),
        })
        if (!createRes.ok) {
          const data = await createRes.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create order')
        }
        const createData = await createRes.json()
        orderId = createData.id
        setOrder({
          orderId: createData.id,
          orderNumber: createData.orderNumber,
          status: createData.status,
          totalUgx: createData.totalUgx ?? 0,
          items: [],
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create order')
        setCreating(false)
        setAddingItem(false)
        return
      } finally {
        setCreating(false)
      }
    }

    setAddingItem(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.productId, quantity: 1 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add item')
      }
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleQuantityChange(itemId: string, delta: number) {
    if (!order) return
    const item = order.items.find((i) => i.id === itemId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty < 1) return

    try {
      const res = await posFetch(`/api/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update quantity')
    }
  }

  async function handleSendToKitchen() {
    if (!order || order.status !== 'pending') return
    if (order.items.length === 0) {
      alert('Add items before sending to kitchen')
      return
    }

    setSubmitting(true)
    try {
      const res = await posFetch(`/api/orders/${order.orderId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedByStaffId: getStaffId() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send to kitchen')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePay() {
    if (!order || order.items.length === 0) return
    router.push(`/pos/payment/${order.orderId}`)
  }

  if (!staffOk) {
    return (
      <main className="pos-page flex items-center justify-center min-h-screen">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <div className="flex-shrink-0">
        <PosNavHeader />
      </div>
      {error && (
        <div className="mx-4 mt-2">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left: Categories */}
        <aside className="flex-shrink-0 w-full lg:w-32 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </aside>

        {/* Center: Products */}
        <section className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <p className="text-neutral-500 text-center py-8">Loading products…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.productId}
                  type="button"
                  onClick={() => handleAddProduct(product)}
                  disabled={addingItem}
                  className="pos-card p-4 text-left hover:border-primary-400 dark:hover:border-primary-500 disabled:opacity-60"
                >
                  <p className="font-medium text-primary-800 dark:text-primary-100 m-0 truncate">
                    {product.name}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mt-1">
                    UGX {product.priceUgx.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right: Order panel */}
        <aside className="flex-shrink-0 w-full lg:w-80 flex flex-col pos-card p-4 min-h-[200px] lg:min-h-0">
          <h2 className="pos-section-title text-lg mb-3">Current Order</h2>

          {!order ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-neutral-500 text-center mb-4">No order yet</p>
              <button
                type="button"
                onClick={handleNewOrder}
                disabled={creating}
                className="btn btn-primary py-3 px-6 disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'New Order'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mb-2">
                #{order.orderNumber} · {order.status}
              </p>
              <ul className="flex-1 overflow-auto list-none p-0 m-0 space-y-2 mb-4">
                {order.items.length === 0 ? (
                  <li className="text-neutral-500 text-center py-4">No items in order</li>
                ) : (
                order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-neutral-100 dark:border-neutral-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="m-0 font-medium truncate">{item.productName}</p>
                      <p className="m-0 text-sm text-neutral-500">
                        UGX {(item.subtotalUgx ?? item.lineTotalUgx ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-lg"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-lg"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))
                )}
              </ul>

              <p className="font-semibold text-lg text-primary-700 dark:text-primary-200 mb-4">
                Total: UGX {order.totalUgx.toLocaleString()}
              </p>

              <div className="flex flex-col gap-2">
                {order.status === 'pending' && (
                  <button
                    type="button"
                    onClick={handleSendToKitchen}
                    disabled={submitting || order.items.length === 0}
                    className="btn btn-outline py-3 disabled:opacity-60"
                  >
                    {submitting ? 'Sending…' : 'Send to Kitchen'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={order.items.length === 0}
                  className="btn btn-primary py-3 disabled:opacity-60"
                >
                  Pay
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-700">
        <Link href="/pos/close" className="pos-link text-sm">Close Shift</Link>
      </div>
    </main>
  )
}

