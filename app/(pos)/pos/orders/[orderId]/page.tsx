'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'

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

type ActiveProduct = {
  id: string
  name: string
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

function statusBadgeClass(status: string): string {
  const base = 'pos-badge '
  switch (status) {
    case 'pending': return base + 'pos-badge-pending'
    case 'preparing': return base + 'pos-badge-preparing'
    case 'ready': return base + 'pos-badge-ready'
    case 'served': return base + 'pos-badge-served'
    case 'cancelled': return base + 'pos-badge-cancelled'
    default: return base + 'pos-badge-pending'
  }
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
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [payingType, setPayingType] = useState<'cash' | 'mobile' | 'card' | null>(null)
  const [paymentAmountUgx, setPaymentAmountUgx] = useState('')
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
  const [activeProducts, setActiveProducts] = useState<ActiveProduct[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [amountUgx, setAmountUgx] = useState('')
  const [method, setMethod] = useState('cash')

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

  async function fetchActiveProducts() {
    try {
      const res = await posFetch('/api/products/active')
      if (res.ok) {
        const data = await res.json()
        setActiveProducts(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
      }
    } catch {
      // ignore
    }
  }

  async function handleTapProduct(product: PosProduct) {
    setAddingItem(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.productId, quantity: 1 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrder()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
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
    fetchActiveProducts()
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

  async function handleAddOne(productId: string) {
    setAddingItem(true)
    try {
      const res = await posFetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setOrder(data)
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
      const res = await posFetch(`/api/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUgx: amount,
          method,
          status: 'completed',
          createdByStaffId: getStaffId(),
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

  async function handlePay(paymentType: 'cash' | 'mobile' | 'card') {
    if (!order || order.status !== 'ready') return
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amountUgx, 0)
    const remaining = order.totalUgx - totalPaid
    const enteredAmount = paymentAmountUgx === '' ? remaining : parseFloat(paymentAmountUgx)
    if (isNaN(enteredAmount) || enteredAmount <= 0 || enteredAmount > remaining) return
    setPayingType(paymentType)
    try {
      const res = await posFetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUgx: enteredAmount, paymentType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrder()
      setPaymentAmountUgx('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to record payment')
    } finally {
      setPayingType(null)
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
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300">Loading…</p>
        </div>
      </main>
    )
  }
  if (error && !order) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md">
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
          <Link href="/pos" className="pos-link">← Back to POS</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container">
        <Link href="/pos" className="pos-link inline-block mb-4">← Back to POS</Link>
        <h1 className="pos-section-title text-2xl mb-2">Order {order?.orderNumber}</h1>

        <section className="pos-section pos-card">
          <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Type:</strong> {order?.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}</p>
          {order?.tableId && <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>Table:</strong> {order.tableId}</p>}
          <p className="m-0 mt-1">
            <span className={order ? statusBadgeClass(order.status) : 'pos-badge pos-badge-pending'}>{order?.status}</span>
          </p>
          {order?.status === 'served' && (
            <p className="m-0 mt-2">
              <strong className="text-primary-700 dark:text-primary-200">Payment complete</strong>
              {' '}
              <Link href={`/pos/orders/${order.orderId}/receipt`} className="pos-link">View Receipt</Link>
            </p>
          )}
          <p className="m-0 mt-2 font-medium text-primary-700 dark:text-primary-200"><strong>Total:</strong> {order?.totalUgx?.toLocaleString()} UGX</p>
        </section>

      <section className="pos-section pos-card">
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
              <span className="font-medium text-primary-700 dark:text-primary-200">{item.subtotalUgx.toLocaleString()} UGX</span>
              {!block && (
                <button type="button" onClick={() => handleRemoveItem(item.id)} disabled={updatingItemId !== null} className="btn btn-ghost text-sm py-1 px-2 disabled:opacity-60">Remove</button>
              )}
            </li>
          ))}
        </ul>
        {(order?.status === 'pending' || order?.status === 'preparing') && (
          <>
            <h3 className="pos-section-title text-lg mt-4 mb-2">Add Items</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {products.map((p) => (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => handleTapProduct(p)}
                  disabled={addingItem}
                  className="pos-order-card text-left disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="font-medium text-primary-800 dark:text-primary-100 block">{p.name}</span>
                  <span className="text-sm text-primary-600 dark:text-primary-300">UGX {p.priceUgx.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </>
        )}
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

      {(order?.status === 'pending' || order?.status === 'preparing') && activeProducts.length > 0 && (
        <section className="pos-section pos-card">
          <h2 className="pos-section-title">Add Items to Order</h2>
          <ul className="list-none p-0 m-0">
            {activeProducts.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2 border-b border-neutral-200 dark:border-neutral-600 last:border-0">
                <span className="flex-1 text-neutral-800 dark:text-neutral-200">{p.name}</span>
                <button type="button" onClick={() => handleAddOne(p.id)} disabled={addingItem} className="btn btn-outline text-sm py-1 px-2 disabled:opacity-60">Add</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pos-section pos-card">
        <h2 className="pos-section-title">Payments</h2>
        {order?.payments.length === 0 && <p className="text-neutral-600 dark:text-neutral-400 m-0">No payments.</p>}
        <ul className="list-none p-0">
          {order?.payments.map((p, i) => (
            <li key={i} className="py-1 text-neutral-700 dark:text-neutral-300">
              {p.method}: {p.amountUgx.toLocaleString()} UGX
            </li>
          ))}
        </ul>
        {!block && (
          <form onSubmit={handleRecordPayment} className="flex flex-wrap gap-2 items-end mt-4">
            <label className="w-40">
              <span className="pos-label">Amount (UGX)</span>
              <input type="number" min="0" step="100" placeholder="Amount" value={amountUgx} onChange={(e) => setAmountUgx(e.target.value)} className="pos-input" />
            </label>
            <label className="w-40">
              <span className="pos-label">Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="pos-select">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mtn_momo">MTN MoMo</option>
                <option value="airtel_money">Airtel Money</option>
              </select>
            </label>
            <button type="submit" disabled={recordingPayment} className="btn btn-outline disabled:opacity-60">Record Payment</button>
          </form>
        )}
      </section>

      {order?.status === 'ready' && (
        <section className="pos-section pos-card">
          <h2 className="pos-section-title">Payment</h2>
          {(() => {
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amountUgx, 0)
            const remaining = order.totalUgx - totalPaid
            const displayAmount = paymentAmountUgx === '' ? String(remaining) : paymentAmountUgx
            const enteredAmount = paymentAmountUgx === '' ? remaining : parseFloat(paymentAmountUgx)
            const validAmount = !isNaN(enteredAmount) && enteredAmount > 0 && enteredAmount <= remaining
            return (
              <>
                <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Order total:</strong> {order.totalUgx.toLocaleString()} UGX</p>
                <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>Amount paid:</strong> {totalPaid.toLocaleString()} UGX</p>
                <p className="m-0 mt-1 text-neutral-700 dark:text-neutral-300"><strong>Remaining:</strong> {remaining.toLocaleString()} UGX</p>
                {remaining > 0 && (
                  <>
                    <label className="block mt-3">
                      <span className="pos-label">Amount to pay (UGX)</span>
                      <input type="number" min={0} step={100} value={displayAmount} onChange={(e) => setPaymentAmountUgx(e.target.value)} className="pos-input w-40 mt-1" />
                    </label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" onClick={() => handlePay('cash')} disabled={payingType !== null || !validAmount} className="btn btn-outline disabled:opacity-60">Pay Cash</button>
                      <button type="button" onClick={() => handlePay('mobile')} disabled={payingType !== null || !validAmount} className="btn btn-outline disabled:opacity-60">Pay MoMo</button>
                      <button type="button" onClick={() => handlePay('card')} disabled={payingType !== null || !validAmount} className="btn btn-outline disabled:opacity-60">Pay Card</button>
                    </div>
                  </>
                )}
              </>
            )
          })()}
        </section>
      )}

      {paymentInProgress && (
        <section className="pos-alert pos-alert-warning pos-section">
          <strong>Payment in progress…</strong>
          <div className="text-sm mt-1">Please wait while the customer completes the payment.</div>
        </section>
      )}

      {(order?.status === 'pending' || order?.status === 'preparing' || order?.status === 'ready') && (
        <section className="pos-section pos-card">
          <h2 className="pos-section-title mb-2">Cash Payment</h2>
          <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Total:</strong> UGX {order?.totalUgx?.toLocaleString()}</p>
          <form onSubmit={handleCompletePayment} className="mt-3">
            <label className="block">
              <span className="pos-label">Cash received</span>
              <input type="number" min="0" step="100" value={cashReceivedUgx} onChange={(e) => setCashReceivedUgx(e.target.value)} placeholder="0" className="pos-input w-40 mt-1" />
            </label>
            {(() => {
              const received = parseFloat(cashReceivedUgx)
              const total = order?.totalUgx ?? 0
              const changeUgx = !isNaN(received) && received > total ? received - total : 0
              return received > 0 && changeUgx > 0 ? (
                <p className="m-0 mt-2 font-medium text-primary-700 dark:text-primary-200"><strong>Change:</strong> UGX {changeUgx.toLocaleString()}</p>
              ) : null
            })()}
            <button type="submit" disabled={paymentInProgress || completingPayment} className="btn btn-primary mt-3 disabled:opacity-60">Complete Payment</button>
          </form>
        </section>
      )}

      {(order?.status === 'pending' || order?.status === 'preparing' || order?.status === 'ready') && (
        <section className="pos-section pos-card">
          <h2 className="pos-section-title mb-2">Mobile Money Payment</h2>
          <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Total:</strong> UGX {order?.totalUgx?.toLocaleString()}</p>
          <form onSubmit={handleCompleteMomoPayment} className="mt-3">
            <label className="block">
              <span className="pos-label">Amount received</span>
              <input type="number" min="0" step="100" value={momoAmountUgx} onChange={(e) => setMomoAmountUgx(e.target.value)} placeholder="0" className="pos-input w-40 mt-1" />
            </label>
            <button type="submit" disabled={paymentInProgress || completingMomoPayment} className="btn btn-primary mt-3 disabled:opacity-60">Complete MoMo Payment</button>
          </form>
        </section>
      )}

      {(order?.status === 'pending' || order?.status === 'preparing' || order?.status === 'ready') && (
        <section className="pos-section pos-card">
          <h2 className="pos-section-title mb-2">Card / MoMo / Airtel (Pesapal)</h2>
          <p className="m-0 text-neutral-700 dark:text-neutral-300"><strong>Total:</strong> UGX {order?.totalUgx?.toLocaleString()}</p>
          <button type="button" onClick={handlePayWithPesapal} disabled={paymentInProgress || completingPesapalPayment} className="btn btn-secondary mt-3 disabled:opacity-60">
            {completingPesapalPayment ? 'Redirecting to payment…' : 'Pay with Pesapal'}
          </button>
        </section>
      )}

      {order?.payments && order.payments.length > 0 && (
        <section className="pos-section">
          <h2 className="pos-section-title">Payment Summary</h2>
          {order.payments.map((p, i) => (
            <p key={i} className="m-0 py-1 text-neutral-700 dark:text-neutral-300">{p.method}: UGX {p.amountUgx.toLocaleString()}</p>
          ))}
        </section>
      )}

      <section className="flex flex-wrap gap-3 mt-6">
        <button onClick={handleCheckout} disabled={!canCheckout || checkingOut} className="btn btn-primary disabled:opacity-60">Checkout Order</button>
        <button onClick={handleCancel} disabled={block || cancelling} className="btn btn-danger disabled:opacity-60">Cancel Order</button>
      </section>
      </div>
    </main>
  )
}
