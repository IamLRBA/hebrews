'use client'

import { useEffect, useState, useRef } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { CreditCard, Search, X } from 'lucide-react'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [statusFilter, methodFilter])

  const searchSuggestions = searchQuery.trim()
    ? [...new Set(payments.filter((p) => (p.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase())).map((p) => p.orderNumber))].slice(0, 10)
    : []
  const showSearchSuggestions = searchFocused && searchQuery.trim().length > 0

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
                <div className="flex-1 relative" ref={searchWrapperRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by order name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className="pos-input pl-10 pr-10 w-full"
                    aria-label="Search payments by order name"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSearchFocused(false) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showSearchSuggestions && (
                    <ul className="absolute z-50 w-full mt-1 top-full left-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchSuggestions.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</li>
                      ) : (
                        searchSuggestions.map((orderNum) => (
                          <li key={orderNum}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                              onClick={() => { setSearchQuery(orderNum); setSearchFocused(false) }}
                            >
                              {orderNum}
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
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                    {statusDropdownOpen ? '⇑' : '⇓'}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={methodFilter}
                    onFocus={() => setMethodDropdownOpen(true)}
                    onBlur={() => setMethodDropdownOpen(false)}
                    onChange={(e) => {
                      setMethodFilter(e.target.value)
                      setMethodDropdownOpen(false)
                    }}
                    className="pos-input w-full md:w-48 pr-10 appearance-none"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                    {methodDropdownOpen ? '⇑' : '⇓'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md border-2 border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  No payments found
                </div>
              ) : (
                <div className="pos-data-table-wrap border-2 border-neutral-200 dark:border-neutral-800">
                  <table className="w-full">
                    <thead className="bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-tl-lg">
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
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-tr-lg">
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
