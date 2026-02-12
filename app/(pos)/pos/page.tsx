'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { setShiftId } from '@/lib/pos-shift-store'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import {
  LayoutGrid,
  UtensilsCrossed,
  ListOrdered,
  Clock,
  ClipboardList,
  PlusCircle,
  PlayCircle,
} from 'lucide-react'

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
  const [shiftLoading, setShiftLoading] = useState(true)
  const [hasActiveShift, setHasActiveShift] = useState(false)
  const [shiftError, setShiftError] = useState<string | null>(null)
  const [startingShift, setStartingShift] = useState(false)
  const [terminalId, setTerminalId] = useState('')
  const [hasChosenToContinue, setHasChosenToContinue] = useState(false)
  const [hasContinuedSession, setHasContinuedSession] = useState(false)
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<'dine-in' | 'takeaway' | null>(null)

  async function fetchActiveShift() {
    setShiftLoading(true)
    setShiftError(null)
    try {
      const res = await posFetch('/api/shifts/active')
      if (res.ok) {
        setHasActiveShift(true)
      } else if (res.status === 404) {
        setHasActiveShift(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setShiftError(data.error || 'Failed to load shift')
      }
    } catch {
      setShiftError('Failed to load shift')
    } finally {
      setShiftLoading(false)
    }
  }

  async function handleStartShift(e: React.FormEvent) {
    e.preventDefault()
    setStartingShift(true)
    try {
      const res = await posFetch('/api/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          terminalId.trim() ? { terminalId: terminalId.trim() } : {}
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      if (data.shiftId) setShiftId(data.shiftId)
      setHasActiveShift(true)
      setShiftError(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start shift')
    } finally {
      setStartingShift(false)
    }
  }

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
    fetchActiveShift()
  }, [staffOk])

  useEffect(() => {
    if (hasActiveShift && typeof window !== 'undefined' && window.sessionStorage.getItem('pos_has_continued')) {
      setHasContinuedSession(true)
    }
  }, [hasActiveShift])

  useEffect(() => {
    if (staffOk && hasActiveShift) fetchOrders()
  }, [staffOk, hasActiveShift])

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

  if (shiftLoading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300">Checking shift…</p>
        </div>
      </main>
    )
  }

  if (!hasActiveShift) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto">
          <PosNavHeader hideNav />
          <div className="pos-card text-center">
            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-800 flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-7 h-7 text-primary-600 dark:text-primary-300" aria-hidden />
            </div>
            <h1 className="pos-section-title text-2xl mb-2">Start your shift</h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 max-w-sm mx-auto">
              You need an active shift to use Tables, create orders, and record payments. Start your shift to begin.
            </p>
            {shiftError && (
              <div className="pos-alert pos-alert-error mb-4 text-left">{shiftError}</div>
            )}
            <form onSubmit={handleStartShift} className="text-left max-w-xs mx-auto">
              <label className="block mb-2">
                <span className="pos-label">Terminal (optional)</span>
                <input
                  type="text"
                  placeholder="pos-1"
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value)}
                  className="pos-input mt-1"
                  aria-label="Terminal ID"
                />
              </label>
              <button
                type="submit"
                disabled={startingShift}
                className="btn btn-primary w-full mt-4 disabled:opacity-60"
              >
                {startingShift ? 'Starting…' : 'Start shift'}
              </button>
            </form>
          </div>
          <p className="text-center mt-6">
            <Link href="/pos/login" className="pos-link text-sm">Use a different staff account</Link>
          </p>
        </div>
      </main>
    )
  }

  const showContinueScreen = hasActiveShift && !hasChosenToContinue && !hasContinuedSession

  if (showContinueScreen) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto">
          <PosNavHeader hideNav />
          <div className="pos-card text-center">
            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-800 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-primary-600 dark:text-primary-300" aria-hidden />
            </div>
            <h1 className="pos-section-title text-2xl mb-2">Shift</h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 max-w-sm mx-auto">
              You have an active shift. Continue to the POS to use Tables, orders, and payments.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.sessionStorage.setItem('pos_has_continued', '1')
                setHasChosenToContinue(true)
              }}
              className="btn btn-primary w-full sm:w-auto min-w-[200px]"
            >
              Continue to POS
            </button>
          </div>
          <p className="text-center mt-6">
            <Link href="/pos/login" className="pos-link text-sm">Use a different staff account</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl">
        <PosNavHeader />

        {/* Four main cards */}
        <section className="pos-dashboard-grid mb-10" aria-label="POS actions">
          <Link href="/pos/tables" className="pos-dashboard-card text-center items-center">
            <div className="pos-dashboard-card-icon mx-auto">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Tables</h2>
            <p className="pos-dashboard-card-desc">
              View dine-in tables and open or continue orders by table.
            </p>
            <span className="btn btn-outline pos-dashboard-card-cta-btn">Open Tables ⇒</span>
          </Link>
          <Link href="/pos/orders" className="pos-dashboard-card text-center items-center">
            <div className="pos-dashboard-card-icon mx-auto">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Shift Orders</h2>
            <p className="pos-dashboard-card-desc">
              All active orders for this shift. Open, update status, or checkout.
            </p>
            <span className="btn btn-outline pos-dashboard-card-cta-btn">View orders ⇒</span>
          </Link>
          <Link href="/pos/ready" className="pos-dashboard-card text-center items-center">
            <div className="pos-dashboard-card-icon mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Ready Orders</h2>
            <p className="pos-dashboard-card-desc">
              Orders ready for pickup. Mark as served when delivered to the customer.
            </p>
            <span className="btn btn-outline pos-dashboard-card-cta-btn">Ready to serve ⇒</span>
          </Link>
          <Link href="/pos/shift" className="pos-dashboard-card text-center items-center">
            <div className="pos-dashboard-card-icon mx-auto">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="pos-dashboard-card-title">Shift</h2>
            <p className="pos-dashboard-card-desc">
              Shift summary, payment breakdown, and close shift with declared cash.
            </p>
            <span className="btn btn-outline pos-dashboard-card-cta-btn">Shift summary ⇒</span>
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
                    : 'list-none p-0 flex flex-wrap justify-center gap-4 max-w-4xl mx-auto pos-order-list'
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
                        : 'pos-order-list-item'
                  }
                >
                  <Link
                    href={`/pos/orders/${o.orderId}`}
                    className="pos-order-card pos-order-card-centered block no-underline text-inherit hover:border-primary-300 dark:hover:border-primary-600 h-full"
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
