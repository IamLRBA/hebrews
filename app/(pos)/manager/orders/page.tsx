'use client'

import { useEffect, useState, useRef, Fragment } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { posFetch } from '@/lib/pos-client'
import { Search, Eye, X } from 'lucide-react'
import Link from 'next/link'

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<string | null>(null)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      order.orderNumber.toLowerCase().includes(q) ||
      (order.tableCode && order.tableCode.toLowerCase().includes(q))
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const searchSuggestions = searchQuery.trim()
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.tableCode && o.tableCode.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 10)
    : []
  const showSearchSuggestions = searchFocused && searchQuery.trim().length > 0

  async function handleCancelOrder(orderId: string) {
    try {
      const staffId = localStorage.getItem('pos_staff_id')
      const res = await posFetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledByStaffId: staffId }),
      })
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId))
        setConfirmCancelOrderId(null)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to cancel order')
      }
    } catch (e) {
      alert('Failed to cancel order')
    }
  }

  return (
    <RoleGuard allowedRoles={['manager']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <ManagerNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Order Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                View and manage orders
              </p>
            </div>

            {/* Filters */}
            <div className="bg-accent-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative" ref={searchWrapperRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by order name or table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className="pos-input pl-10 pr-10 w-full"
                    aria-label="Search orders"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSearchFocused(false)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showSearchSuggestions && (
                    <ul className="absolute z-50 w-full mt-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchSuggestions.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</li>
                      ) : (
                        searchSuggestions.map((o) => (
                          <li key={o.orderId}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                              onClick={() => {
                                setSearchQuery(o.orderNumber)
                                setSearchFocused(false)
                              }}
                            >
                              {o.orderNumber}
                              {o.tableCode ? ` · ${o.tableCode}` : ''}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onFocus={() => setStatusDropdownOpen(true)}
                    onBlur={() => setStatusDropdownOpen(false)}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setStatusDropdownOpen(false)
                    }}
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
                    {statusDropdownOpen ? '⇑' : '⇓'}
                  </span>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md border-2 border-neutral-100 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  No orders found
                </div>
              ) : (
                <div className="pos-data-table-wrap border-2 border-neutral-100 dark:border-neutral-800">
                  <table className="w-full">
                    <thead className="bg-white dark:bg-neutral-800">
                      <tr>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-tl-lg">
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
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-tr-lg">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, idx) => (
                        <Fragment key={order.orderId}>
                          {idx > 0 && (
                            <tr className="border-t border-neutral-200 dark:border-neutral-800">
                              <td colSpan={6} className="py-0 px-6">
                                <div className="h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent"></div>
                              </td>
                            </tr>
                          )}
                          <tr
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
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/manager/orders/${order.orderId}`}
                                  className="btn btn-outline p-2"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                {order.status !== 'served' && order.status !== 'cancelled' && (
                                  <button
                                    onClick={() => setConfirmCancelOrderId(order.orderId)}
                                    className="btn btn-outline p-2 text-red-600 dark:text-red-400"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <ConfirmDialog
              open={!!confirmCancelOrderId}
              title="Cancel order"
              message="Are you sure you want to cancel this order? This cannot be undone."
              confirmLabel="Cancel order"
              cancelLabel="Keep order"
              variant="neutral"
              onConfirm={() => {
                const id = confirmCancelOrderId
                setConfirmCancelOrderId(null)
                if (id) void handleCancelOrder(id)
              }}
              onCancel={() => setConfirmCancelOrderId(null)}
            />
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
