'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShoppingCart, Package } from 'lucide-react'

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
      <div className="flex-shrink-0 fixed top-0 left-0 right-0 z-[1020] bg-[var(--color-bg-primary)] px-4 pt-4 [&_.pos-dashboard-header]:mb-0">
        <PosNavHeader />
      </div>
      {/* Spacer so content starts below fixed nav (same height as other pages: header + nav + padding + border) */}
      <div className="flex-shrink-0 min-h-[14rem]" aria-hidden />
      {error && (
        <div className="mx-4 mt-2 flex-shrink-0">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden min-h-0">
        {/* Left: Categories */}
        <aside className="flex-shrink-0 w-full lg:w-48 flex flex-wrap gap-3 overflow-visible justify-center md:justify-center lg:justify-start lg:flex-col lg:py-2 lg:px-1 py-2 px-1 lg:items-stretch">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`btn whitespace-nowrap py-2 px-4 text-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </aside>

        {/* Center: Products */}
        <section className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pos-card p-4">
                  <SkeletonLoader variant="card" lines={2} />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description={selectedCategory === 'all' ? 'No products available' : `No products in "${selectedCategory}" category`}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const itemInOrder = order?.items.find((item) => item.productId === product.productId)
                return (
                  <button
                    key={product.productId}
                    type="button"
                    onClick={() => handleAddProduct(product)}
                    disabled={addingItem}
                    className="pos-card p-4 text-left hover:border-primary-400 dark:hover:border-primary-500 disabled:opacity-60 transition-all relative group"
                  >
                    {itemInOrder && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                        {itemInOrder.quantity}
                      </span>
                    )}
                    <p className="font-medium text-primary-800 dark:text-primary-100 m-0 truncate">
                      {product.name}
                    </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mt-1">
                    {product.priceUgx.toLocaleString()} UGX
                  </p>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Right: Order panel */}
        <aside className="flex-shrink-0 w-full lg:w-80 flex flex-col pos-card p-5 min-h-[200px] lg:min-h-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
          <h2 className="pos-section-title text-lg mb-3 text-center">Current Order</h2>

          {!order ? (
            <EmptyState
              icon={ShoppingCart}
              title="No order yet"
              description="Start adding items to create an order"
              action={
                <button
                  type="button"
                  onClick={handleNewOrder}
                  disabled={creating}
                  className="btn btn-primary py-3 px-6 disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'New Order'}
                </button>
              }
            />
          ) : (
            <>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mb-2">
                #{order.orderNumber} · {order.status}
              </p>
              <ul className="flex-1 overflow-auto list-none p-0 m-0 space-y-3 mb-4">
                {order.items.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No items yet"
                    description="Add products from the menu"
                  />
                ) : (
                order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="m-0 font-medium truncate text-sm">{item.productName}</p>
                      <p className="m-0 text-xs text-neutral-500 mt-0.5">
                        {(item.subtotalUgx ?? item.lineTotalUgx ?? 0).toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="w-9 h-9 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center text-lg font-medium transition-colors touch-manipulation"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-semibold text-base">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-9 h-9 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center text-lg font-medium transition-colors touch-manipulation"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))
                )}
              </ul>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-auto">
              <p className="font-semibold text-xl text-primary-700 dark:text-primary-200 mb-4">
                Total: {order.totalUgx.toLocaleString()} UGX
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
              </div>
            </>
          )}
        </aside>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-700">
        <Link href="/pos/close" className="btn btn-outline py-2.5 px-4 text-sm font-medium">
          Close Shift
        </Link>
      </div>
    </main>
  )
}

