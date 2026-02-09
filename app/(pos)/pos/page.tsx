'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import {
  LayoutGrid,
  UtensilsCrossed,
  ListOrdered,
  Clock,
  ClipboardList,
  PlusCircle,
  Coffee,
} from 'lucide-react'

const CAFE_NAME = 'Cafe Havilah & Pizzeria'

function generateOrderNumber() {
  return `ORD-${Date.now()}`
}

type ActiveOrder = {
  orderId: string
  orderNumber: string
  orderType: string
  tableId: string | null
  status: string
  createdAt: string
  totalUgx: number
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

export default function PosDashboardPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<'dine-in' | 'takeaway' | null>(null)

  async function fetchOrders() {
    setLoading(true)
    setError(null)
    try {
      const res = await posFetch('/api/orders/active')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const sorted = [...data].sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setOrders(sorted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
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
    if (!staffOk) return
    fetchOrders()
  }, [staffOk])

  async function handleNewDineIn() {
    setCreating('dine-in')
    try {
      const tableId = prompt('Table ID (e.g. T1):') || 'T1'
      const staffId = getStaffId()
      if (!staffId) return
      const res = await posFetch('/api/orders/dine-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, createdByStaffId: staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(null)
    }
  }

  async function handleNewTakeaway() {
    setCreating('takeaway')
    try {
      const res = await posFetch('/api/orders/takeaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: getStaffId(),
          orderNumber: generateOrderNumber(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(null)
    }
  }

  if (!staffOk) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300">Loading…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl">
        {/* Header */}
        <header className="pos-dashboard-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100 transition-colors">
              <Coffee className="w-8 h-8" aria-hidden />
              <span className="text-xl font-semibold tracking-tight">{CAFE_NAME}</span>
            </Link>
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Point of Sale</span>
        </header>

        {/* Quick nav pills */}
        <nav className="pos-dashboard-nav" aria-label="POS sections">
          <Link href="/pos/tables" className="pos-dashboard-nav-link">
            <LayoutGrid className="w-4 h-4" aria-hidden />
            Tables
          </Link>
          <Link href="/pos/orders" className="pos-dashboard-nav-link">
            <ListOrdered className="w-4 h-4" aria-hidden />
            Shift Orders
          </Link>
          <Link href="/pos/ready" className="pos-dashboard-nav-link">
            <Clock className="w-4 h-4" aria-hidden />
            Ready Orders
          </Link>
          <Link href="/pos/shift" className="pos-dashboard-nav-link">
            <ClipboardList className="w-4 h-4" aria-hidden />
            Shift
          </Link>
        </nav>

        {/* Four main cards */}
        <section className="pos-dashboard-grid mb-10" aria-label="POS actions">
          <Link href="/pos/tables" className="pos-dashboard-card">
            <div className="pos-dashboard-card-icon">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Tables</h2>
            <p className="pos-dashboard-card-desc">
              View dine-in tables and open or continue orders by table.
            </p>
            <span className="pos-dashboard-card-cta">Open Tables →</span>
          </Link>
          <Link href="/pos/orders" className="pos-dashboard-card">
            <div className="pos-dashboard-card-icon">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Shift Orders</h2>
            <p className="pos-dashboard-card-desc">
              All active orders for this shift. Open, update status, or checkout.
            </p>
            <span className="pos-dashboard-card-cta">View orders →</span>
          </Link>
          <Link href="/pos/ready" className="pos-dashboard-card">
            <div className="pos-dashboard-card-icon">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Ready Orders</h2>
            <p className="pos-dashboard-card-desc">
              Orders ready for pickup. Mark as served when delivered to the customer.
            </p>
            <span className="pos-dashboard-card-cta">Ready to serve →</span>
          </Link>
          <Link href="/pos/shift" className="pos-dashboard-card">
            <div className="pos-dashboard-card-icon">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Shift</h2>
            <p className="pos-dashboard-card-desc">
              Shift summary, payment breakdown, and close shift with declared cash.
            </p>
            <span className="pos-dashboard-card-cta">Shift summary →</span>
          </Link>
        </section>

        {/* Quick actions */}
        <section className="pos-section pos-card mb-6 text-center">
          <h2 className="pos-section-title flex items-center justify-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden />
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={handleNewDineIn}
              disabled={creating !== null}
              className="btn btn-outline inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" aria-hidden />
              {creating === 'dine-in' ? 'Creating…' : 'New Dine-In Order'}
            </button>
            <button
              type="button"
              onClick={handleNewTakeaway}
              disabled={creating !== null}
              className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" aria-hidden />
              {creating === 'takeaway' ? 'Creating…' : 'New Takeaway Order'}
            </button>
          </div>
        </section>

        {/* Active orders */}
        <section className="pos-section text-center">
          <h2 className="pos-section-title mb-3">Active orders</h2>
          {loading && (
            <div className="pos-card max-w-sm mx-auto">
              <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
            </div>
          )}
          {error && (
            <div className="pos-alert pos-alert-error mb-4 max-w-md mx-auto">{error}</div>
          )}
          {!loading && !error && orders.length === 0 && (
            <div className="pos-card max-w-md mx-auto">
              <p className="text-neutral-600 dark:text-neutral-400 m-0">
                No active orders. Create a dine-in or takeaway order above, or open Tables to start from a table.
              </p>
            </div>
          )}
          {!loading && !error && orders.length > 0 && (
            <ul
              className={
                orders.length === 1
                  ? 'list-none p-0 flex justify-center'
                  : orders.length === 2
                    ? 'list-none p-0 flex justify-center gap-4 flex-wrap max-w-2xl mx-auto'
                    : 'list-none p-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto'
              }
            >
              {orders.map((o) => (
                <li
                  key={o.orderId}
                  className={
                    orders.length === 1
                      ? 'w-full max-w-sm'
                      : orders.length === 2
                        ? 'w-full min-w-[240px] sm:w-[calc(50%-0.5rem)] sm:max-w-[320px]'
                        : undefined
                  }
                >
                  <Link
                    href={`/pos/orders/${o.orderId}`}
                    className="pos-order-card block no-underline text-inherit hover:border-primary-300 dark:hover:border-primary-600 h-full"
                  >
                    <p className="font-medium text-primary-800 dark:text-primary-100 m-0">{o.orderNumber}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mt-1">
                      {o.orderType === 'dine_in' ? 'Dine-in' : 'Takeaway'}
                      {o.tableId && ` · Table ${o.tableId}`}
                    </p>
                    <p className="text-sm m-0 mt-1">
                      <span className={statusBadgeClass(o.status)}>{o.status}</span>
                    </p>
                    <p className="text-base font-medium mt-2 m-0 text-primary-700 dark:text-primary-200">
                      UGX {o.totalUgx.toLocaleString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
