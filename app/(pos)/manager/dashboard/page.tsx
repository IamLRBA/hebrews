'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { posFetch } from '@/lib/pos-client'
import { DollarSign, ShoppingCart, Clock, AlertCircle, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [orderCounts, setOrderCounts] = useState<{ pending: number; preparing: number; ready: number }>({ pending: 0, preparing: 0, ready: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch active orders for counts only
        const ordersRes = await posFetch('/api/orders/active')
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          const pending = ordersData.filter((o: any) => o.status === 'pending').length
          const preparing = ordersData.filter((o: any) => o.status === 'preparing').length
          const ready = ordersData.filter((o: any) => o.status === 'ready' || o.status === 'awaiting_payment').length
          setOrderCounts({ pending, preparing, ready })
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
                <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

                <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

                <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

                <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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
            <div className="flex justify-center mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
                <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-4 md:p-5 lg:p-6 border border-neutral-200 dark:border-neutral-800 max-w-xs mx-auto sm:max-w-none flex flex-col items-center text-center">
                  <div className="flex items-center justify-center mb-3 md:mb-4 w-full">
                    <h2 className="text-base md:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Pending Orders
                    </h2>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent ml-2 md:ml-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                    {orderCounts.pending}
                  </p>
                  <Link
                    href="/manager/orders?status=pending"
                    className="btn btn-outline text-sm"
                  >
                    View all
                  </Link>
                </div>

                <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-4 md:p-5 lg:p-6 border border-neutral-200 dark:border-neutral-800 max-w-xs mx-auto sm:max-w-none flex flex-col items-center text-center">
                  <div className="flex items-center justify-center mb-3 md:mb-4 w-full">
                    <h2 className="text-base md:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Preparing Orders
                    </h2>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent ml-2 md:ml-3">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                    {orderCounts.preparing}
                  </p>
                  <Link
                    href="/manager/orders?status=preparing"
                    className="btn btn-outline text-sm"
                  >
                    View all
                  </Link>
                </div>

                <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-4 md:p-5 lg:p-6 border border-neutral-200 dark:border-neutral-800 max-w-xs mx-auto sm:max-w-none flex flex-col items-center text-center sm:col-span-2 lg:col-span-1 sm:mx-auto">
                  <div className="flex items-center justify-center mb-3 md:mb-4 w-full">
                    <h2 className="text-base md:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Ready for Payment
                    </h2>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent ml-2 md:ml-3">
                      <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                    {orderCounts.ready}
                  </p>
                  <Link
                    href="/manager/orders?status=ready"
                    className="btn btn-outline text-sm"
                  >
                    View all
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
