'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'

type OrderItem = {
  id: string
  productId: string
  productName: string
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
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cashReceivedUgx, setCashReceivedUgx] = useState('')
  const [completingPayment, setCompletingPayment] = useState(false)
  const [momoAmountUgx, setMomoAmountUgx] = useState('')
  const [completingMomoPayment, setCompletingMomoPayment] = useState(false)
  const [completingPesapalPayment, setCompletingPesapalPayment] = useState(false)
  const [paymentInProgress, setPaymentInProgress] = useState(false)

  const [staffOk, setStaffOk] = useState(false)
  const [products, setProducts] = useState<PosProduct[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'mtn_momo' | 'airtel_money' | 'card' | null>(null)

  async function fetchOrder() {
    setLoading(true)
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
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const res = await posFetch('/api/pos/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
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
      setQuantity(1)
      setOrder(data)
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
      setOrder(data)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update quantity')
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function handleCompletePayment(e: React.FormEvent) {
    e.preventDefault()
    const staffId = getStaffId()
    if (!staffId) return
    const amount = parseFloat(cashReceivedUgx)
    if (isNaN(amount) || amount < 0) {
      alert('Enter a valid cash amount')
      return
    }
    setCompletingPayment(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx: amount, staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(data)
      setCashReceivedUgx('')
      setSelectedPaymentMethod(null)
      if (data.status === 'served') {
        router.push(`/pos/orders/${orderId}/receipt`)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to complete payment')
    } finally {
      setCompletingPayment(false)
    }
  }

  async function handleCompleteMomoPayment(e: React.FormEvent) {
    e.preventDefault()
    const staffId = getStaffId()
    if (!staffId) return
    const amount = Number(momoAmountUgx)
    if (Number.isNaN(amount) || amount < 0) {
      alert('Enter a valid amount')
      return
    }
    setCompletingMomoPayment(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-momo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx: amount, staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(data)
      setMomoAmountUgx('')
      if (data.status === 'served') {
        router.push(`/pos/orders/${orderId}/receipt`)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to complete MoMo payment')
    } finally {
      setCompletingMomoPayment(false)
    }
  }

  async function handlePayWithPesapal() {
    setPaymentInProgress(true)
    setCompletingPesapalPayment(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay-pesapal`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error('No payment URL')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start payment')
      setPaymentInProgress(false)
      setCompletingPesapalPayment(false)
    }
  }

  async function handleRemoveItem(itemId: string) {
    setUpdatingItemId(itemId)
    try {
      const res = await posFetch(`/api/order-items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(data)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove item')
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function handleCheckout() {
    setCheckingOut(true)
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
      const res = await posFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledByStaffId: getStaffId() }),
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
        <div className="pos-page-container max-w-md mx-auto text-center">
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
          <Link href="/pos" className="pos-link">⇐ Back to POS</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl mx-auto text-center">
        <Link href="/pos" className="pos-link inline-block mb-4">⇐ Back to POS</Link>
        <h1 className="pos-section-title text-2xl mb-2">Order {order?.orderNumber}</h1>

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
                <strong>Table:</strong> {order.tableId}
              </p>
            )}
            {order?.createdAt && (
              <p className="m-0 text-neutral-600 dark:text-neutral-400">
                Created {formatRelativeTime(order.createdAt)}
              </p>
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
        {order?.items.length === 0 && <p className="text-neutral-600 dark:text-neutral-400 m-0">No items.</p>}
        <ul className="list-none p-0">
          {order?.items.map((item) => (
            <li key={item.id} className="py-3 border-b border-neutral-200 dark:border-neutral-600 flex items-center gap-2 flex-wrap">
              {!block && (
                <>
                  <button type="button" onClick={() => handleItemQuantity(item.id, item.quantity - 1)} disabled={updatingItemId !== null || item.quantity <= 1} className="btn btn-outline py-1 px-2 min-w-[2rem] disabled:opacity-60">−</button>
                  <span className="min-w-[1.5rem] text-center font-medium">{item.quantity}</span>
                  <button type="button" onClick={() => handleItemQuantity(item.id, item.quantity + 1)} disabled={updatingItemId !== null} className="btn btn-outline py-1 px-2 min-w-[2rem] disabled:opacity-60">+</button>
                </>
              )}
              {block && <span className="font-medium">{item.quantity} × </span>}
              <span className="flex-1 text-neutral-800 dark:text-neutral-200">
                {item.productName}
                {item.size && ` • ${item.size}`}
                {item.modifier && ` • ${item.modifier}`}
              </span>
              <span className="font-medium text-primary-700 dark:text-primary-200">{formatCurrency(item.subtotalUgx)}</span>
              {!block && (
                <button type="button" onClick={() => handleRemoveItem(item.id)} disabled={updatingItemId !== null} className="btn btn-ghost text-sm py-1 px-2 disabled:opacity-60">Remove</button>
              )}
            </li>
          ))}
        </ul>
        {!block && (
          <form onSubmit={handleAddItem} className="flex flex-wrap gap-2 items-end mt-4">
            <label className="flex-1 min-w-[12rem]">
              <span className="pos-label">Product</span>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="pos-select">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} — {p.priceUgx.toLocaleString()} UGX
                  </option>
                ))}
              </select>
            </label>
            <label className="w-20">
              <span className="pos-label">Qty</span>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} className="pos-input" />
            </label>
            <button type="submit" disabled={addingItem} className="btn btn-primary disabled:opacity-60">Add Item</button>
          </form>
        )}
      </section>

      {/* Single Payments section: auto-calculated totals, choose method (Cash / MTN MoMo / Airtel Money / Card), then flow */}
      <section className="pos-section pos-card pos-order-card-centered">
        <h2 className="pos-section-title">Payments</h2>
        {order && (
          <>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Order total:</span>
                <span className="font-semibold text-primary-700 dark:text-primary-200">{formatCurrency(order.totalUgx)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">Amount paid:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(order.payments?.reduce((sum, p) => sum + p.amountUgx, 0) ?? 0)}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Remaining:</span>
                <span className="font-bold text-lg text-primary-700 dark:text-primary-200">
                  {formatCurrency(order.totalUgx - (order.payments?.reduce((sum, p) => sum + p.amountUgx, 0) ?? 0))}
                </span>
              </div>
            </div>
          </>
        )}
        {order?.payments && order.payments.length > 0 && (
          <ul className="list-none p-0 mt-2 mb-2">
            {order.payments.map((p, i) => (
              <li key={i} className="py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-sm flex justify-between">
                <span className="text-neutral-700 dark:text-neutral-300 capitalize">{p.method.replace('_', ' ')}</span>
                <span className="font-medium text-primary-700 dark:text-primary-200">{formatCurrency(p.amountUgx)}</span>
              </li>
            ))}
          </ul>
        )}
        {!block && order && (() => {
          const totalPaid = order.payments?.reduce((sum, p) => sum + p.amountUgx, 0) ?? 0
          const remaining = order.totalUgx - totalPaid
          if (remaining <= 0) return null
          return (
            <>
              <p className="m-0 mt-2 pos-section-title text-sm">Choose payment method</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                <button type="button" onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'cash' ? null : 'cash')} className={selectedPaymentMethod === 'cash' ? 'btn btn-primary' : 'btn btn-outline'}>Cash</button>
                <button type="button" onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'mtn_momo' ? null : 'mtn_momo')} className={selectedPaymentMethod === 'mtn_momo' ? 'btn btn-primary' : 'btn btn-outline'}>MTN MoMo</button>
                <button type="button" onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'airtel_money' ? null : 'airtel_money')} className={selectedPaymentMethod === 'airtel_money' ? 'btn btn-primary' : 'btn btn-outline'}>Airtel Money</button>
                <button type="button" onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'card' ? null : 'card')} className={selectedPaymentMethod === 'card' ? 'btn btn-primary' : 'btn btn-outline'}>Card</button>
              </div>
              {selectedPaymentMethod === 'cash' && (
                <form onSubmit={handleCompletePayment} className="mt-4 max-w-xs mx-auto text-left">
                  <label className="block">
                    <span className="pos-label">Cash received (UGX)</span>
                    <input type="number" min="0" step="100" value={cashReceivedUgx} onChange={(e) => setCashReceivedUgx(e.target.value)} placeholder={String(remaining)} className="pos-input w-full mt-1" />
                  </label>
                  {(() => {
                    const received = parseFloat(cashReceivedUgx)
                    const total = order?.totalUgx ?? 0
                    const changeUgx = !isNaN(received) && received > total ? received - total : 0
                    return received > 0 && changeUgx > 0 ? (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="m-0 text-sm font-semibold text-blue-700 dark:text-blue-300">
                          Change: {formatCurrency(changeUgx)}
                        </p>
                      </div>
                    ) : null
                  })()}
                  <button type="submit" disabled={paymentInProgress || completingPayment} className="btn btn-primary mt-3 w-full disabled:opacity-60">Complete Payment</button>
                </form>
              )}
              {(selectedPaymentMethod === 'mtn_momo' || selectedPaymentMethod === 'airtel_money' || selectedPaymentMethod === 'card') && (
                <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                  <p className="m-0 text-neutral-700 dark:text-neutral-300 text-sm mb-3">
                    Amount to pay: <strong className="text-lg">{formatCurrency(remaining)}</strong>
                  </p>
                  <button type="button" onClick={handlePayWithPesapal} disabled={paymentInProgress || completingPesapalPayment} className="btn btn-secondary w-full disabled:opacity-60">
                    {completingPesapalPayment ? 'Redirecting to payment…' : 'Pay with Pesapal'}
                  </button>
                </div>
              )}
            </>
          )
        })()}
      </section>

      {paymentInProgress && (
        <section className="pos-alert pos-alert-warning pos-section">
          <strong>Payment in progress…</strong>
          <div className="text-sm mt-1">Please wait while the customer completes the payment.</div>
        </section>
      )}

      <section className="flex flex-wrap gap-3 mt-6 justify-center">
        <button onClick={handleCheckout} disabled={!canCheckout || checkingOut} className="btn btn-primary disabled:opacity-60">Checkout Order</button>
        <button onClick={handleCancel} disabled={block || cancelling} className="btn btn-danger disabled:opacity-60">Cancel Order</button>
      </section>
      </div>
    </main>
  )
}
