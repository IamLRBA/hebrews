'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { CreditCard, Search } from 'lucide-react'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')

  useEffect(() => {
    fetchPayments()
  }, [statusFilter, methodFilter])

  async function fetchPayments() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (methodFilter !== 'all') params.append('method', methodFilter)
      params.append('limit', '100')

      const res = await posFetch(`/api/admin/payments?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments)
      }
    } catch (e) {
      console.error('Failed to fetch payments:', e)
    } finally {
      setLoading(false)
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
                Payment Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                View and manage all payments
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by order number..."
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
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                    ⇓
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="pos-input w-full md:w-48 pr-10 appearance-none"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                    ⇓
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  No payments found
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
                          Amount
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Method
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Staff
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments
                        .filter((p) =>
                          searchQuery === '' ||
                          p.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                          >
                            <td className="py-4 px-6 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {payment.orderNumber}
                            </td>
                            <td className="py-4 px-6 text-sm text-neutral-900 dark:text-neutral-100">
                              {payment.amountUgx.toLocaleString()} UGX
                            </td>
                            <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                              {payment.method.replace('_', ' ')}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.status === 'completed'
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                              {payment.createdByStaffName}
                            </td>
                            <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                              {new Date(payment.createdAt).toLocaleString()}
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
