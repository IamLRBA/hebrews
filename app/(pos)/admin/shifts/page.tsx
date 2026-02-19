'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShifts()
  }, [])

  async function fetchShifts(status: string = 'all') {
    setLoading(true)
    try {
      const res = await posFetch(`/api/admin/shifts?status=${status}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setShifts(data.shifts)
      }
    } catch (e) {
      console.error('Failed to fetch shifts:', e)
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
                Shift Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                View and manage all shifts
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => fetchShifts('all')}
                  className="btn btn-outline"
                >
                  All Shifts
                </button>
                <button
                  onClick={() => fetchShifts('active')}
                  className="btn btn-outline"
                >
                  Active
                </button>
                <button
                  onClick={() => fetchShifts('closed')}
                  className="btn btn-outline"
                >
                  Closed
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : shifts.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  No shifts found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Staff
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Terminal
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Start Time
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          End Time
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift) => (
                        <tr
                          key={shift.id}
                          className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="py-4 px-6 text-sm text-neutral-900 dark:text-neutral-100">
                            {shift.staffName} ({shift.staffRole})
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {shift.terminalId}
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {new Date(shift.startTime).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {shift.endTime ? new Date(shift.endTime).toLocaleString() : '-'}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                shift.isActive
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              {shift.isActive ? 'Active' : 'Closed'}
                            </span>
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
