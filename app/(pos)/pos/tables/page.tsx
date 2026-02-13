'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LayoutGrid, Search, X } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
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

  const filteredTables = tables.filter((table) =>
    table.tableCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const searchSuggestions = searchQuery.trim()
    ? tables.filter((table) =>
        table.tableCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []
  const showSuggestions = searchFocused && searchQuery.trim().length > 0

  const occupiedCount = tables.filter((t) => t.hasActiveOrder).length
  const availableCount = tables.length - occupiedCount

  if (!staffOk || loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full p-6">
          <SkeletonLoader variant="card" lines={3} />
        </div>
      </main>
    )
  }
  if (error && !shiftId) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto text-center">
          <PosNavHeader />
          <div className="pos-alert pos-alert-error mb-4">{error}</div>
          <Link href="/pos/shift" className="pos-link">Open Shift</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page">
      <div className="pos-page-container max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <PosNavHeader />
        <h1 className="pos-section-title text-2xl mb-4">Tables</h1>
        
        {/* Stats and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium">
              {availableCount} Available
            </span>
            <span className="px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-200 font-medium">
              {occupiedCount} Occupied
            </span>
          </div>
          <div className="relative w-full sm:w-64" ref={searchWrapperRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="pos-input pl-10 pr-10 w-full"
              aria-label="Search tables"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSearchFocused(false)
                  searchInputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showSuggestions && (
              <ul
                className="absolute left-0 right-0 top-full mt-1 py-2 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg z-50 max-h-60 overflow-auto"
                role="listbox"
              >
                {searchSuggestions.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400" role="option">
                    No tables match
                  </li>
                ) : (
                  searchSuggestions.map((table) => (
                    <li key={table.tableId} role="option">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none"
                        onClick={() => {
                          setSearchQuery(table.tableCode)
                          setSearchFocused(false)
                        }}
                      >
                        <span className="text-primary-700 dark:text-primary-300">Table {table.tableCode}</span>
                        {table.hasActiveOrder && table.orderNumber && (
                          <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                            #{table.orderNumber}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        {tables.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No tables found"
            description="Tables will appear here once configured."
          />
        ) : filteredTables.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No tables match your search"
            description={`No tables found matching "${searchQuery}"`}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center justify-center max-w-4xl mx-auto">
            {filteredTables.map((table) => (
              <button
                key={table.tableId}
                type="button"
                onClick={() => handleTableClick(table)}
                disabled={creating !== null}
                className={`pos-table-btn w-full text-center font-medium disabled:opacity-60 disabled:cursor-not-allowed ${table.hasActiveOrder ? 'pos-table-btn-occupied' : ''}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>Table {table.tableCode}</span>
                  {table.hasActiveOrder && table.orderNumber && (
                    <span className="text-xs text-primary-600 dark:text-primary-400 font-normal">
                      #{table.orderNumber}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
