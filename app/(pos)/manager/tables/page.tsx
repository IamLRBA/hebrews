'use client'

import { useEffect, useState, useRef } from 'react'
import NextImage from 'next/image'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { TableModal } from '@/components/admin/TableModal'
import { posFetch } from '@/lib/pos-client'
import { Plus, Edit, Search, X } from 'lucide-react'

const TABLE_PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

function getTableImageSrc(images: string[] | undefined): string {
  const first = images?.[0]
  if (!first) return TABLE_PLACEHOLDER_IMAGE
  if (first.startsWith('http') || first.startsWith('/')) return first
  return `/${first}`
}

export default function ManagerTablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableModalOpen, setTableModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchTables() {
    setLoading(true)
    try {
      const res = await posFetch('/api/admin/tables')
      if (res.ok) {
        const data = await res.json()
        setTables(data.tables || data)
      } else {
        const fallbackRes = await posFetch('/api/pos/tables?shiftId=all')
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          setTables(Array.isArray(fallbackData) ? fallbackData : fallbackData.tables || [])
        }
      }
    } catch (e) {
      console.error('Failed to fetch tables:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [])

  const filteredTables = tables.filter((t) =>
    (t.code || t.tableCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  const searchSuggestions = searchQuery.trim()
    ? tables.filter((t) => (t.code || t.tableCode || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
    : []
  const showSearchSuggestions = searchFocused && searchQuery.trim().length > 0

  return (
    <RoleGuard allowedRoles={['manager']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <ManagerNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Table Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Manage restaurant tables
              </p>
              <button type="button" onClick={() => { setEditingTable(null); setTableModalOpen(true) }} className="btn btn-primary flex items-center gap-2 mx-auto">
                <Plus className="w-5 h-5" />
                Add Table
              </button>
            </div>

            <div className="mb-6 flex justify-center" ref={searchWrapperRef}>
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="pos-input pl-10 pr-10 w-full"
                  aria-label="Search tables"
                />
                {searchQuery.length > 0 && (
                  <button type="button" onClick={() => { setSearchQuery(''); setSearchFocused(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600" aria-label="Clear search">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showSearchSuggestions && (
                  <ul className="absolute z-50 w-full mt-1 top-full left-0 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchSuggestions.length === 0 ? <li className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</li> : searchSuggestions.map((t) => (
                      <li key={t.id || t.tableId}><button type="button" className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30" onClick={() => { setSearchQuery(t.code || t.tableCode || ''); setSearchFocused(false) }}>{t.code || t.tableCode}</button></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {loading ? (
                <div className="w-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : (
                filteredTables.map((table) => {
                  const isOccupied = table.status === 'occupied' || table.hasActiveOrder
                  return (
                    <div
                      key={table.id || table.tableId}
                      className={`w-full sm:w-[280px] bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-4 border-2 text-center ${
                        isOccupied
                          ? 'border-primary-300 dark:border-primary-700'
                          : 'border-primary-200 dark:border-primary-800'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-3">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 mx-auto">
                          <NextImage
                            src={getTableImageSrc(table.images)}
                            alt={table.code || table.tableCode || 'Table'}
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized
                          />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                        {table.code || table.tableCode}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                          isOccupied
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                            : 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                        }`}
                      >
                        {isOccupied ? 'Occupied' : 'Available'}
                      </span>
                      {(table.capacity || table.capacity === 0) && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          Capacity: {table.capacity}
                        </p>
                      )}
                      {isOccupied && table.orderNumber && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 mb-3">
                          Order: {table.orderNumber}
                        </p>
                      )}
                      <div className="mt-3">
                        <button type="button" onClick={() => { setEditingTable(table); setTableModalOpen(true) }} className="btn btn-outline text-sm py-2 w-full flex items-center justify-center gap-1">
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <TableModal
              isOpen={tableModalOpen}
              onClose={() => { setTableModalOpen(false); setEditingTable(null) }}
              onSuccess={() => { setTableModalOpen(false); setEditingTable(null); void fetchTables() }}
              table={editingTable}
            />
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
