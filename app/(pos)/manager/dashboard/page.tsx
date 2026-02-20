'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { posFetch } from '@/lib/pos-client'
import { DollarSign, ShoppingCart, Clock, AlertCircle, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch active orders
        const ordersRes = await posFetch('/api/orders/active')
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          setActiveOrders(ordersData)
        }

        // Fetch shift summary for active shift
        const shiftRes = await posFetch('/api/shifts/active')
        if (shiftRes.ok) {
          const shiftData = await shiftRes.json()
          if (shiftData.shiftId) {
            const summaryRes = await posFetch(`/api/shifts/${shiftData.shiftId}/summary`)
            if (summaryRes.ok) {
              const summaryData = await summaryRes.json()
              setStats(summaryData)
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <RoleGuard allowedRoles={['manager']}>
        <div className="pos-page min-h-screen">
          <div className="pos-page-container">
            <ManagerNavHeader />
            <main className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  const pendingOrders = activeOrders.filter((o) => o.status === 'pending')
  const preparingOrders = activeOrders.filter((o) => o.status === 'preparing')
  const readyOrders = activeOrders.filter((o) => o.status === 'ready')

  return (
    <RoleGuard allowedRoles={['manager']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <ManagerNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Manager Dashboard
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Overview of operations and orders requiring attention
              </p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.totalSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent">
                      <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Orders Served</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.ordersServed}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-primary-600 dark:border-primary-500 flex items-center justify-center bg-transparent">
                      <ShoppingCart className="w-6 h-6 text-primary-700 dark:text-primary-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Cash Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.cashSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent">
                      <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Card Sales</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.cardSales.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent">
                      <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Requiring Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Pending Orders
                  </h2>
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {pendingOrders.length}
                </p>
                <Link
                  href="/manager/orders?status=pending"
                  className="btn btn-outline text-sm"
                >
                  View all
                </Link>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Preparing Orders
                  </h2>
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {preparingOrders.length}
                </p>
                <Link
                  href="/manager/orders?status=preparing"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View all →
                </Link>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Ready for Payment
                  </h2>
                  <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {readyOrders.length}
                </p>
                <Link
                  href="/manager/orders?status=ready"
                  className="btn btn-outline text-sm"
                >
                  View all
                </Link>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border-2 border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Active Orders
              </h2>
              {activeOrders.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400">No active orders</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Order #
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Total
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Paid
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrders.map((order) => (
                        <tr
                          key={order.orderId}
                          className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="py-3 px-4 text-sm text-neutral-900 dark:text-neutral-100">
                            {order.orderNumber}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {order.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'pending'
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                  : order.status === 'preparing'
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                  : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-900 dark:text-neutral-100">
                            {order.totalUgx.toLocaleString()} UGX
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {order.totalPaidUgx.toLocaleString()} UGX
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/manager/orders/${order.orderId}`}
                              className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                            >
                              View
                            </Link>
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
