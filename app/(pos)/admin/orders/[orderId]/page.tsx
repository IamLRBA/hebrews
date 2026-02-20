'use client'

import { Fragment, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { posFetch } from '@/lib/pos-client'
import { X } from 'lucide-react'
import Link from 'next/link'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirmCancelOrder, setConfirmCancelOrder] = useState(false)
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<{ id: string; name: string } | null>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await posFetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        }
      } catch (e) {
        console.error('Failed to fetch order:', e)
      } finally {
        setLoading(false)
      }
    }
    if (orderId) fetchOrder()
  }, [orderId])

  async function handleCancelOrder() {
    try {
      const staffId = localStorage.getItem('pos_staff_id')
      const res = await posFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledByStaffId: staffId }),
      })
      if (res.ok) {
        setConfirmCancelOrder(false)
        router.push('/admin/orders')
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to cancel order')
      }
    } catch (e) {
      alert('Failed to cancel order')
    }
  }

  async function handleRemoveItem(itemId: string) {
    setRemovingItemId(itemId)
    try {
      const res = await posFetch(`/api/order-items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        setConfirmRemoveItem(null)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to remove item')
      }
    } catch (e) {
      alert('Failed to remove item')
    } finally {
      setRemovingItemId(null)
    }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <AdminNavHeader />
          <main>
            <div className="mb-6 text-center">
              <Link
                href="/admin/orders"
                className="pos-link inline-block mb-4"
              >
                ⇐ Back to Orders
              </Link>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Order Details
              </h1>
            </div>

            {loading ? (
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-8 border border-neutral-200 dark:border-neutral-800 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : order ? (
              <div className="space-y-6">
                <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 text-center">
                      Order #{order.orderNumber}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center mb-4">
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Status</p>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                        {order.status}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Type</p>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {order.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Total</p>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {order.totalUgx?.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Paid</p>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {order.totalPaidUgx?.toLocaleString()} UGX
                      </p>
                    </div>
                  </div>
                  {order.status !== 'served' && order.status !== 'cancelled' && (
                    <div className="flex justify-center mt-4">
                      <button
                        type="button"
                        onClick={() => setConfirmCancelOrder(true)}
                        className="btn btn-outline flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel Order
                      </button>
                    </div>
                  )}
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Items
                    </h3>
                    <ul className="list-none m-0 p-0">
                      {order.items.map((item: any, idx: number) => {
                        const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                        const canRemove = (order.status === 'pending' || order.status === 'preparing') && item.id
                        const lineTotal = item.lineTotalUgx ?? item.subtotalUgx
                        return (
                          <Fragment key={item.id ?? idx}>
                            <li className="flex items-center gap-3 py-3">
                              <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                                <Image src={imgSrc} alt={item.productName || 'Product'} fill className="object-cover" sizes="48px" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {item.productName || 'Unknown'} × {item.quantity}
                                </p>
                                {item.size && (
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Size: {item.size}
                                  </p>
                                )}
                              </div>
                              <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                                {typeof lineTotal === 'number' ? lineTotal.toLocaleString() : String(lineTotal)} UGX
                              </p>
                              {canRemove && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveItem({ id: item.id, name: item.productName || 'this item' })}
                                  disabled={!!removingItemId}
                                  className="btn btn-outline p-2"
                                  aria-label={`Remove ${item.productName}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </li>
                            {idx < order.items.length - 1 && <li aria-hidden className="pos-order-item-divider" />}
                          </Fragment>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {order.payments && order.payments.length > 0 && (
                  <div className="bg-accent-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Payments
                    </h3>
                    <div className="space-y-2">
                      {order.payments.map((payment: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                              {payment.method.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {new Date(payment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-neutral-900 dark:text-neutral-100">
                            {payment.amountUgx?.toLocaleString()} UGX
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-8 border border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">Order not found</p>
              </div>
            )}

            <ConfirmDialog
              open={confirmCancelOrder}
              title="Cancel order"
              message="Are you sure you want to cancel this order? This cannot be undone."
              confirmLabel="Cancel order"
              cancelLabel="Keep order"
              variant="neutral"
              onConfirm={handleCancelOrder}
              onCancel={() => setConfirmCancelOrder(false)}
            />
            <ConfirmDialog
              open={!!confirmRemoveItem}
              title="Remove item"
              message={confirmRemoveItem ? `Remove "${confirmRemoveItem.name}" from this order?` : ''}
              confirmLabel="Remove"
              cancelLabel="Keep"
              variant="neutral"
              onConfirm={() => {
                const item = confirmRemoveItem
                setConfirmRemoveItem(null)
                if (item) void handleRemoveItem(item.id)
              }}
              onCancel={() => setConfirmRemoveItem(null)}
            />
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
