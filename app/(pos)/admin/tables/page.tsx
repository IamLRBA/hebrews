'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Table, Plus, Edit } from 'lucide-react'

export default function AdminTablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTables() {
      try {
        // Fetch all tables (not shift-specific)
        const res = await posFetch('/api/admin/tables')
        if (res.ok) {
          const data = await res.json()
          setTables(data.tables || data)
        } else {
          // Fallback: try to get tables from a different endpoint
          const fallbackRes = await posFetch('/api/pos/tables?shiftId=all')
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json()
            setTables(fallbackData)
          }
        }
      } catch (e) {
        console.error('Failed to fetch tables:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchTables()
  }, [])

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <AdminNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Table Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Manage restaurant tables
              </p>
              <button className="btn btn-primary flex items-center gap-2 mx-auto">
                <Plus className="w-5 h-5" />
                Add Table
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : (
                tables.map((table) => {
                  const isOccupied = table.status === 'occupied' || table.hasActiveOrder
                  return (
                    <div
                      key={table.id || table.tableId}
                      className={`bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 border-2 text-center ${
                        isOccupied
                          ? 'border-primary-300 dark:border-primary-700'
                          : 'border-primary-200 dark:border-primary-800'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-full">
                          <Table className="w-5 h-5 text-primary-600 dark:text-primary-400" />
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
                        <button className="btn btn-outline text-sm py-2 w-full flex items-center justify-center gap-1">
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
