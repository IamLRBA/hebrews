'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Search, Eye, X } from 'lucide-react'
import Link from 'next/link'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await posFetch('/api/orders/active')
        if (res.ok) {
          const data = await res.json()
          setOrders(data)
        }
      } catch (e) {
        console.error('Failed to fetch orders:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.tableCode && order.tableCode.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return

    try {
      const staffId = localStorage.getItem('pos_staff_id')
      const res = await posFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledByStaffId: staffId }),
      })
      if (res.ok) {
        setOrders(orders.filter((o) => o.orderId !== orderId))
      }
    } catch (e) {
      alert('Failed to cancel order')
    }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <AdminNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Order Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                View and manage all orders
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by order number or table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pos-input pl-10 w-full"
                  />
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pos-input w-full md:w-48 pr-10 appearance-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                    ⇓
                  </span>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  No orders found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Order #
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Type
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Total
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Paid
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Created
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr
                          key={order.orderId}
                          className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="py-4 px-6 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {order.orderNumber}
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {order.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'pending'
                                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                                  : order.status === 'preparing'
                                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                                  : order.status === 'ready'
                                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                                  : order.status === 'served'
                                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-900 dark:text-neutral-100">
                            {order.totalUgx.toLocaleString()} UGX
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {order.totalPaidUgx.toLocaleString()} UGX
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/orders/${order.orderId}`}
                                className="btn btn-outline p-2"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {order.status !== 'served' && order.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleCancelOrder(order.orderId)}
                                  className="btn btn-outline p-2 text-red-600 dark:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
