'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DollarSign, ShoppingCart, TrendingUp, Users, Download, Calendar } from 'lucide-react'

const COLORS = ['#6F4E37', '#8B6F47', '#A67C52', '#C19A6B']

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, startDate, endDate])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange === 'custom' && startDate && endDate) {
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      } else {
        params.append('range', dateRange)
      }

      const res = await posFetch(`/api/admin/analytics?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const data = await res.json()
      setAnalytics(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    if (!analytics) return

    const csvRows = [
      ['Metric', 'Value'],
      ['Daily Revenue', analytics.daily.revenue],
      ['Daily Orders', analytics.daily.orders],
      ['Weekly Revenue', analytics.weekly.revenue],
      ['Weekly Orders', analytics.weekly.orders],
      ['Monthly Revenue', analytics.monthly.revenue],
      ['Monthly Orders', analytics.monthly.orders],
      [''],
      ['Top Products', 'Quantity', 'Orders'],
      ...analytics.topProducts.map((p: any) => [p.name, p.quantity, p.orderCount]),
    ]

    const csv = csvRows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin']}>
        <div className="pos-page min-h-screen">
          <div className="pos-page-container">
            <AdminNavHeader />
            <main className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (error || !analytics) {
    return (
      <RoleGuard allowedRoles={['admin']}>
        <div className="pos-page min-h-screen">
          <div className="pos-page-container">
            <AdminNavHeader />
            <main>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400">{error || 'Failed to load analytics'}</p>
              </div>
            </main>
          </div>
        </div>
      </RoleGuard>
    )
  }

  const paymentMethodData = [
    { name: 'Cash', value: analytics.salesByMethod.cash },
    { name: 'MTN MoMo', value: analytics.salesByMethod.mtn_momo },
    { name: 'Airtel Money', value: analytics.salesByMethod.airtel_money },
    { name: 'Card', value: analytics.salesByMethod.card },
  ]

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <AdminNavHeader />
          <main>
            <div className="mb-8">
              <div className="mb-4">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                    Admin Dashboard
                  </h1>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Comprehensive analytics and management overview
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setDateRange('today')}
                      className={`btn ${dateRange === 'today' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setDateRange('week')}
                      className={`btn ${dateRange === 'week' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setDateRange('month')}
                      className={`btn ${dateRange === 'month' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setDateRange('custom')}
                      className={`btn flex items-center gap-2 ${dateRange === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      <Calendar className="w-4 h-4" />
                      Custom
                    </button>
                    <button
                      onClick={handleExport}
                      className="btn btn-outline flex items-center gap-2"
                      disabled={!analytics}
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {dateRange === 'custom' && (
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-800 mb-6">
                  <div className="flex gap-4">
                    <label className="flex-1">
                      <span className="pos-label">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pos-input mt-1 w-full"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="pos-label">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pos-input mt-1 w-full"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Daily Revenue</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {analytics.daily.revenue.toLocaleString()} UGX
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
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Weekly Revenue</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {analytics.weekly.revenue.toLocaleString()} UGX
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent">
                    <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {analytics.monthly.revenue.toLocaleString()} UGX
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
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Monthly Orders</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {analytics.monthly.orders}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-primary-300 dark:border-primary-700 flex items-center justify-center bg-transparent">
                    <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Trend */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Revenue Trend (Last 7 Days)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} UGX`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6F4E37"
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Sales by Payment Method
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} UGX`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Top Products (Last 30 Days)
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#6F4E37" name="Quantity Sold" />
                  <Bar dataKey="orderCount" fill="#8B6F47" name="Order Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
