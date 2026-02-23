'use client'

import { Fragment, useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { Search, X } from 'lucide-react'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

type OrderItem = {
  id: string
  productId: string
  productName: string
  category?: string | null
  imageUrl?: string | null
  quantity: number
  size: string | null
  modifier: string | null
  notes: string | null
  subtotalUgx: number
}

type Payment = {
  method: string
  amountUgx: number
}

type PosProduct = {
  productId: string
  name: string
  priceUgx: number
  category?: string | null
}

type OrderDetail = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  tableCode?: string | null
  status: string
  totalUgx: number
  createdAt?: string
  sentToKitchenAt?: string | null
  sentToBarAt?: string | null
  preparationNotes?: string | null
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
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [removedForUndo, setRemovedForUndo] = useState<{ productId: string; productName: string; quantity: number; size?: string | null; modifier?: string | null; notes?: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [staffOk, setStaffOk] = useState(false)
  const [products, setProducts] = useState<PosProduct[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  async function fetchOrder(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await posFetch(`/api/orders/${orderId}`)
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
      setOrder(normaliseOrderDetail(data))
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load order')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  function normaliseOrderDetail(data: unknown): OrderDetail {
    const d = data as Record<string, unknown>
    const items = (Array.isArray(d?.items) ? d.items : []) as OrderItem[]
    return {
      orderId: String(d?.orderId ?? d?.id ?? orderId),
      orderNumber: String(d?.orderNumber ?? ''),
      orderType: String(d?.orderType ?? 'takeaway'),
      tableId: d?.tableId != null ? String(d.tableId) : null,
      tableCode: d?.tableCode != null ? String(d.tableCode) : null,
      status: String(d?.status ?? 'pending'),
      totalUgx: Number(d?.totalUgx ?? 0),
      createdAt: d?.createdAt != null ? String(d.createdAt) : undefined,
      sentToKitchenAt: d?.sentToKitchenAt != null ? String(d.sentToKitchenAt) : undefined,
      sentToBarAt: d?.sentToBarAt != null ? String(d.sentToBarAt) : undefined,
      preparationNotes: d?.preparationNotes != null ? String(d.preparationNotes) : undefined,
      items: items.map((it: Record<string, unknown>) => ({
        id: String(it.id),
        productId: String(it.productId),
        productName: String(it.productName ?? it.productId),
        imageUrl: it.imageUrl != null ? String(it.imageUrl) : null,
        category: it.category != null ? String(it.category) : null,
        quantity: Number(it.quantity ?? 1),
        size: it.size != null ? String(it.size) : null,
        modifier: it.modifier != null ? String(it.modifier) : null,
        notes: it.notes != null ? String(it.notes) : null,
        subtotalUgx: Number(it.subtotalUgx ?? it.lineTotalUgx ?? 0),
      })),
      payments: Array.isArray(d?.payments) ? (d.payments as Payment[]) : [],
    }
  }

  async function fetchProducts() {
    try {
      const res = await posFetch('/api/pos/products')
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) setProducts(data)
    } catch {
      // ignore
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
    if (!staffOk || !orderId) return
    fetchOrder()
  }, [staffOk, orderId])

  useEffect(() => {
    if (!staffOk) return
    fetchProducts()
  }, [staffOk])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || quantity < 1) return
    setAddingItem(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setProductId('')
      setSearchQuery('')
      setQuantity(1)
      setOrder(normaliseOrderDetail(data))
      await fetchOrder(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleItemQuantity(itemId: string, newQuantity: number) {
    if (newQuantity < 1) return
    setUpdatingItemId(itemId)
    try {
      const res = await posFetch(`/api/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(normaliseOrderDetail(data))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update quantity')
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function handleSendToKitchenOrBar(destination: 'kitchen' | 'bar') {
    if (!order || order.status !== 'pending') return
    const items = order?.items ?? []
    if (items.length === 0) {
      setError(`Add items before sending to ${destination === 'bar' ? 'bar' : 'kitchen'}`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await posFetch(`/api/orders/${orderId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedByStaffId: getStaffId(),
          destination,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      const data = await res.json()
      setOrder(normaliseOrderDetail(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to send to ${destination === 'bar' ? 'bar' : 'kitchen'}`)
    } finally {
      setSubmitting(false)
    }
  }

  function handlePayment() {
    if (!order) return
    const items = order?.items ?? []
    if (items.length === 0) {
      setError('Add items before payment')
      return
    }
    router.push(`/pos/payment/${orderId}`)
  }

  async function handleRemoveItem(item: OrderItem) {
    setUpdatingItemId(item.id)
    setRemovedForUndo(null)
    try {
      const res = await posFetch(`/api/order-items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(normaliseOrderDetail(data))
      setRemovedForUndo({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        size: item.size ?? null,
        modifier: item.modifier ?? null,
        notes: item.notes ?? null,
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove item')
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function handleUndoRemove() {
    if (!order || !removedForUndo) return
    const toRestore = removedForUndo
    setRemovedForUndo(null)
    setUpdatingItemId('undo')
    try {
      const res = await posFetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: toRestore.productId,
          quantity: toRestore.quantity,
          size: toRestore.size,
          modifier: toRestore.modifier,
          notes: toRestore.notes,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to restore')
      }
      const data = await res.json()
      setOrder(normaliseOrderDetail(data))
      await fetchOrder(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to restore item')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const canEdit = order?.status === 'pending'
  const block = !canEdit
  const orderHasFood = (order?.items ?? []).some((i) => i.category === 'Food')
  const orderHasDrinks = (order?.items ?? []).some((i) => i.category === 'Drinks')
  const orderHasBoth = orderHasFood && orderHasDrinks
  const isDrinksOnly = orderHasDrinks && !orderHasFood
  const isFoodOnly = orderHasFood && !orderHasDrinks
  const canSendToKitchen =
    order?.status === 'pending' &&
    (order?.items?.length ?? 0) > 0 &&
    !order?.sentToKitchenAt &&
    (isFoodOnly || (!orderHasFood && !orderHasDrinks))
  const canSendToBar =
    order?.status === 'pending' &&
    (order?.items?.length ?? 0) > 0 &&
    !order?.sentToBarAt &&
    isDrinksOnly
  const canSend = canSendToKitchen || canSendToBar
  const sendDestination: 'kitchen' | 'bar' = isDrinksOnly ? 'bar' : 'kitchen'
  const items = order?.items ?? []
  const hasItems = items.length > 0

  if (!staffOk || loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full p-6">
          <SkeletonLoader variant="card" lines={4} />
        </div>
      </main>
    )
  }
  if (error && !order) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto px-4">
          <PosNavHeader />
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
          <button type="button" onClick={() => router.back()} className="pos-link">⇐ Back</button>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <div className="flex-shrink-0 fixed top-0 left-0 right-0 z-[1020] bg-[var(--color-bg-primary)] px-4 pt-4 [&_.pos-dashboard-header]:mb-0">
        <PosNavHeader />
      </div>
      <div className="flex-shrink-0 min-h-[14rem] sm:min-h-[16rem] md:min-h-[14rem]" aria-hidden />
      <div className="pos-page-container max-w-4xl mx-auto text-center flex-1 px-4 pb-6 pt-2">
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        <h1 className="pos-section-title text-2xl mb-2 mt-2 sm:mt-4">Order {order?.orderNumber}</h1>

        <section className="pos-section pos-card pos-order-card-centered">
          <div className="mb-4">
            <StatusBadge status={order?.status || 'pending'} />
          </div>
          <div className="space-y-2 text-sm">
            <p className="m-0 text-neutral-700 dark:text-neutral-300">
              <strong>Type:</strong> {order?.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}
            </p>
            {order?.tableId && (
              <p className="m-0 text-neutral-700 dark:text-neutral-300">
                <strong>Table:</strong> {order.tableCode || order.tableId}
              </p>
            )}
            {order?.createdAt && (
              <p className="m-0 text-neutral-600 dark:text-neutral-400">
                Created {formatRelativeTime(order.createdAt)}
              </p>
            )}
            {order?.preparationNotes && (
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                <p className="m-0 text-sm text-amber-800 dark:text-amber-200">
                  <strong>Order note:</strong> {order.preparationNotes}
                </p>
              </div>
            )}
          </div>
          {order?.status === 'served' && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="m-0 text-sm">
                <strong className="text-green-700 dark:text-green-300">Payment complete</strong>
                {' · '}
                <Link href={`/pos/orders/${order.orderId}/receipt`} className="pos-link text-green-600 dark:text-green-400">
                  View Receipt
                </Link>
              </p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="m-0 text-xl font-bold text-primary-700 dark:text-primary-200">
              {formatCurrency(order?.totalUgx || 0)}
            </p>
          </div>
        </section>

      <section className="pos-section pos-card pos-order-card-centered">
        <h2 className="pos-section-title">Items</h2>
        {items.length === 0 && <p className="text-neutral-600 dark:text-neutral-400 m-0">No items.</p>}
        <ul className="list-none m-0 border-2 border-neutral-400 dark:border-neutral-400 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-800">
          {items.map((item, index) => {
            const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
            return (
            <Fragment key={item.id}>
            <li className="py-3 flex items-center gap-3 flex-wrap">
              <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <Image src={imgSrc} alt="" fill className="object-cover" sizes="48px" />
                {!block && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item)}
                    disabled={updatingItemId !== null}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors hover:bg-black/55 disabled:opacity-60 text-neutral-200 hover:text-white dark:text-neutral-300 dark:hover:text-primary-100"
                    aria-label={`Remove ${item.productName}`}
                  >
                    <X className="w-6 h-6 pointer-events-none drop-shadow-sm" strokeWidth={1.5} aria-hidden />
                  </button>
                )}
              </div>
              {!block && (
                <div className="inline-flex items-stretch">
                  <div className="flex items-center justify-center px-3 py-1.5 min-w-[2rem] bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-l-xl border-r-0 font-semibold text-sm">
                    {item.quantity}
                  </div>
                  <div className="flex flex-col border border-neutral-200 dark:border-neutral-600 rounded-r-xl border-l-0 overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                    <button
                      type="button"
                      onClick={() => handleItemQuantity(item.id, item.quantity + 1)}
                      disabled={updatingItemId !== null}
                      className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-600 disabled:opacity-60"
                      aria-label="Increase"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 3v6M3 6h6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemQuantity(item.id, item.quantity - 1)}
                      disabled={updatingItemId !== null || item.quantity <= 1}
                      className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-60"
                      aria-label="Decrease"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h6" /></svg>
                    </button>
                  </div>
                </div>
              )}
              {block && <span className="font-medium">{item.quantity} × </span>}
              <span className="flex-1 text-neutral-800 dark:text-neutral-200">
                {item.productName}
                {item.size && ` • ${item.size}`}
                {item.modifier && ` • ${item.modifier}`}
              </span>
              <span className="font-medium text-primary-700 dark:text-primary-200">{formatCurrency(item.subtotalUgx)}</span>
            </li>
            {index < items.length - 1 && <li aria-hidden className="pos-order-item-divider" />}
          </Fragment>
          )
          })}
        </ul>
        {!block && removedForUndo && (
          <div className="flex items-center justify-between gap-2 py-2 px-3 mt-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-sm">
            <span className="text-neutral-600 dark:text-neutral-400 truncate min-w-0">Removed {removedForUndo.productName}</span>
            <div className="flex items-center gap-1.5 shrink-0 self-center">
              <button
                type="button"
                onClick={handleUndoRemove}
                disabled={updatingItemId !== null}
                className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-60 transition-colors leading-none"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setRemovedForUndo(null)}
                className="inline-flex items-center justify-center w-6 h-6 rounded text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors leading-none"
                aria-label="Confirm removal"
              >
                <X className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </div>
        )}
        {!block && (
          <form onSubmit={handleAddItem} className="flex flex-wrap gap-4 items-end mt-4">
            <div className="flex-1 min-w-[16rem]">
              <label className="block">
                <span className="pos-label">Product</span>
                <div className="relative mt-1" ref={searchWrapperRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" aria-hidden />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setProductId('')
                    }}
                    onFocus={() => setSearchFocused(true)}
                    className="pos-input pl-10 pr-10 w-full"
                    aria-label="Search products"
                    aria-expanded={searchFocused && searchQuery.trim().length > 0}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setProductId('')
                        setSearchFocused(false)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600"
                      aria-label="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {searchFocused && searchQuery.trim().length > 0 && (
                    <ul
                      className="absolute left-0 right-0 top-full mt-1 py-2 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg z-50 max-h-60 overflow-auto"
                      role="listbox"
                    >
                      {products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <li className="px-4 py-3 text-sm text-neutral-500" role="option">No products match</li>
                      ) : (
                        products
                          .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 10)
                          .map((p) => (
                            <li key={p.productId} role="option">
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none"
                                onClick={() => {
                                  setProductId(p.productId)
                                  setSearchQuery(p.name)
                                  setSearchFocused(false)
                                }}
                              >
                                {p.name} — {p.priceUgx.toLocaleString()} UGX
                              </button>
                            </li>
                          ))
                      )}
                    </ul>
                  )}
                </div>
              </label>
            </div>
            {productId && (
              <label className="block">
                <span className="pos-label">Qty</span>
                <div className="relative inline-flex items-stretch mt-1">
                  <div className="flex items-center justify-center px-3 py-2 min-w-[2.5rem] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 rounded-l-xl border-r-0 font-semibold">
                    {quantity}
                  </div>
                  <div className="flex flex-col border border-neutral-200 dark:border-neutral-600 rounded-r-xl border-l-0 overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-600"
                      aria-label="Increase quantity"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 3v6M3 6h6" /></svg>
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h6" /></svg>
                    </button>
                  </div>
                </div>
              </label>
            )}
            <button type="submit" disabled={addingItem || !productId} className="btn btn-primary disabled:opacity-60">Add Item</button>
          </form>
        )}
      </section>

      <section className="flex flex-wrap gap-3 mt-6 justify-center pt-4 pb-4">
        {order?.status === 'pending' ? (
          <>
            {orderHasBoth && (
              <p className="w-full text-sm text-amber-700 dark:text-amber-300 text-center mb-1">
                Please make separate orders for Food and Drinks.
              </p>
            )}
            <button
              type="button"
              onClick={() => handleSendToKitchenOrBar(sendDestination)}
              disabled={!canSend || !hasItems || submitting || orderHasBoth}
              className={`pos-dashboard-nav-link disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none ${submitting ? 'opacity-70' : ''}`}
            >
              {submitting ? 'Sending…' : isDrinksOnly ? 'Send to Bar' : 'Send to Kitchen'}
            </button>
          </>
        ) : (order?.status === 'ready' || order?.status === 'awaiting_payment') ? (
          <Link href="/pos/ready" className="btn btn-primary disabled:opacity-60 inline-block">
            Make payment on Ready page →
          </Link>
        ) : null}
      </section>
      </div>
    </main>
  )
}
