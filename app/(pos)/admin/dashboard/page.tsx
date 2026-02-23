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
import { DollarSign, ShoppingCart, TrendingUp, Users, Download, Calendar, UtensilsCrossed, Wine } from 'lucide-react'

const COLORS = ['#6F4E37', '#8B6F47', '#A67C52', '#C19A6B']
/* Theme-aligned: food = amber, drinks = gold (see tailwind theme food/drinks) */
const FOOD_COLOR = '#D97706'   /* food-500 */
const FOOD_COLOR_ALT = '#B45309' /* food-600 for secondary series */
const DRINKS_COLOR = '#CA8A04' /* drinks-500 */
const DRINKS_COLOR_ALT = '#A16207' /* drinks-600 for secondary series */

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

    const csvRows: string[][] = [
      ['Metric', 'Value'],
      ['Daily Revenue', analytics.daily.revenue],
      ['Daily Orders', analytics.daily.orders],
      ['Weekly Revenue', analytics.weekly.revenue],
      ['Weekly Orders', analytics.weekly.orders],
      ['Monthly Revenue', analytics.monthly.revenue],
      ['Monthly Orders', analytics.monthly.orders],
    ]
    if (analytics.monthly?.foodRevenue != null || analytics.monthly?.drinksRevenue != null) {
      csvRows.push(['Monthly Food Revenue', String(analytics.monthly.foodRevenue ?? 0)])
      csvRows.push(['Monthly Drinks Revenue', String(analytics.monthly.drinksRevenue ?? 0)])
    }
    csvRows.push(
      [''],
      ['Top Products', 'Quantity', 'Orders'],
      ...(analytics.topProducts ?? []).map((p: { name: string; quantity: number; orderCount: number }) => [p.name, p.quantity, p.orderCount]),
    )
    if (Array.isArray(analytics.topFoodProducts) && analytics.topFoodProducts.length > 0) {
      csvRows.push([''], ['Top Food Products', 'Quantity', 'Orders'])
      csvRows.push(...analytics.topFoodProducts.map((p: { name: string; quantity: number; orderCount: number }) => [p.name, p.quantity, p.orderCount]))
    }
    if (Array.isArray(analytics.topDrinksProducts) && analytics.topDrinksProducts.length > 0) {
      csvRows.push([''], ['Top Drinks Products', 'Quantity', 'Orders'])
      csvRows.push(...analytics.topDrinksProducts.map((p: { name: string; quantity: number; orderCount: number }) => [p.name, p.quantity, p.orderCount]))
    }
    if (analytics.salesByMethod) {
      csvRows.push([''], ['Payment method', 'Revenue (UGX)'])
      csvRows.push(['Cash', String(analytics.salesByMethod.cash ?? 0)])
      csvRows.push(['MTN MoMo', String(analytics.salesByMethod.mtn_momo ?? 0)])
      csvRows.push(['Airtel Money', String(analytics.salesByMethod.airtel_money ?? 0)])
    }

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
                <div className="bg-accent-50 dark:bg-neutral-900 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-800 mb-6">
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

            {/* KPI Cards — first row: 4 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

              <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

              <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

              <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
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

            {/* Food & Drinks revenue — centered under the first four on desktop */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="bg-food-50 dark:bg-food-950/30 rounded-lg shadow-md p-6 border border-food-200 dark:border-food-800 w-full sm:w-auto sm:min-w-[280px] max-w-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-food-700 dark:text-food-300 mb-1">Food Revenue (period)</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {(analytics.monthly?.foodRevenue ?? 0).toLocaleString()} UGX
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-food-400 dark:border-food-600 flex items-center justify-center bg-transparent">
                    <UtensilsCrossed className="w-6 h-6 text-food-600 dark:text-food-400" />
                  </div>
                </div>
              </div>

              <div className="bg-drinks-50 dark:bg-drinks-950/30 rounded-lg shadow-md p-6 border border-drinks-200 dark:border-drinks-800 w-full sm:w-auto sm:min-w-[280px] max-w-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-drinks-700 dark:text-drinks-300 mb-1">Drinks Revenue (period)</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {(analytics.monthly?.drinksRevenue ?? 0).toLocaleString()} UGX
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-drinks-400 dark:border-drinks-600 flex items-center justify-center bg-transparent">
                    <Wine className="w-6 h-6 text-drinks-600 dark:text-drinks-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Trend */}
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
                  Revenue Trend (Total, Food, Drinks)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="recharts-cartesian-grid" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number | undefined) => (value != null ? `${value.toLocaleString()} UGX` : '')} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6F4E37"
                      strokeWidth={2}
                      name="Total Revenue"
                    />
                    {'foodRevenue' in (analytics.revenueTrends?.[0] ?? {}) && (
                      <Line
                        type="monotone"
                        dataKey="foodRevenue"
                        stroke={FOOD_COLOR}
                        strokeWidth={2}
                        name="Food"
                      />
                    )}
                    {'drinksRevenue' in (analytics.revenueTrends?.[0] ?? {}) && (
                      <Line
                        type="monotone"
                        dataKey="drinksRevenue"
                        stroke={DRINKS_COLOR}
                        strokeWidth={2}
                        name="Drinks"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods */}
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
                  Sales by Payment Method
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | undefined) => (value != null ? `${value.toLocaleString()} UGX` : '')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products - horizontal bars so product names don't overlap */}
            <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
                Top Products (Last 30 Days)
              </h2>
              <ResponsiveContainer width="100%" height={Math.max(400, (analytics.topProducts?.length ?? 0) * 36 + 80)}>
                <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="recharts-cartesian-grid" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#6F4E37" name="Quantity Sold" />
                  <Bar dataKey="orderCount" fill="#8B6F47" name="Order Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Food & Top Drinks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
                  Top Food Products (Monthly)
                </h2>
                <ResponsiveContainer width="100%" height={Math.max(300, ((analytics.topFoodProducts?.length ?? 0) * 36) + 80)}>
                  <BarChart
                    data={Array.isArray(analytics.topFoodProducts) ? analytics.topFoodProducts : []}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="recharts-cartesian-grid" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill={FOOD_COLOR} name="Quantity Sold" />
                    <Bar dataKey="orderCount" fill={FOOD_COLOR_ALT} name="Order Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4 text-center">
                  Top Drinks Products (Monthly)
                </h2>
                <ResponsiveContainer width="100%" height={Math.max(300, ((analytics.topDrinksProducts?.length ?? 0) * 36) + 80)}>
                  <BarChart
                    data={Array.isArray(analytics.topDrinksProducts) ? analytics.topDrinksProducts : []}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="recharts-cartesian-grid" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill={DRINKS_COLOR} name="Quantity Sold" />
                    <Bar dataKey="orderCount" fill={DRINKS_COLOR_ALT} name="Order Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
