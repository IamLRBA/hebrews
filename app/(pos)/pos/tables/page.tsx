'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'

type TableStatus = {
  tableId: string
  tableCode: string
  hasActiveOrder: boolean
  orderId: string | null
  orderNumber: string | null
}

export default function PosTablesPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [shiftId, setShiftId] = useState<string | null>(null)
  const [tables, setTables] = useState<TableStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)

  async function fetchActiveShift() {
    try {
      const res = await posFetch('/api/shifts/active')
      if (!res.ok) {
        if (res.status === 404) {
          setError('No active shift')
          setShiftId(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setShiftId(data.shiftId)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load active shift')
      setShiftId(null)
    }
  }

  async function fetchTables() {
    if (!shiftId) {
      setTables([])
      return
    }
    try {
      const res = await posFetch(`/api/pos/tables?shiftId=${encodeURIComponent(shiftId)}`)
      if (!res.ok) throw new Error('Failed to load tables')
      const data = await res.json()
      setTables(data)
    } catch (e) {
      setTables([])
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
    setLoading(true)
    setError(null)
    fetchActiveShift().finally(() => setLoading(false))
  }, [staffOk])

  useEffect(() => {
    if (shiftId) fetchTables()
    else setTables([])
  }, [shiftId])

  async function handleTableClick(table: TableStatus) {
    if (table.hasActiveOrder && table.orderId) {
      router.push(`/pos/orders/${table.orderId}`)
      return
    }
    const staffId = getStaffId()
    if (!staffId) return
    setCreating(table.tableId)
    try {
      const res = await posFetch('/api/orders/dine-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.tableId,
          createdByStaffId: staffId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      router.push(`/pos/orders/${data.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(null)
    }
  }

  if (!staffOk || loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }
  if (error && !shiftId) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md">
          <PosNavHeader />
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
          <Link href="/pos/shift" className="pos-link">Open Shift</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-4">Tables</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <button
              key={table.tableId}
              type="button"
              onClick={() => handleTableClick(table)}
              disabled={creating !== null}
              className={`pos-table-btn w-full text-center font-medium disabled:opacity-60 disabled:cursor-not-allowed ${table.hasActiveOrder ? 'pos-table-btn-occupied' : ''}`}
            >
              Table {table.tableCode}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
