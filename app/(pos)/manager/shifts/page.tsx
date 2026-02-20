'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Clock, DollarSign, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ManagerShiftsPage() {
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActiveShift() {
      try {
        const res = await posFetch('/api/shifts/active')
        if (res.ok) {
          const data = await res.json()
          setActiveShift(data)
        }
      } catch (e) {
        console.error('Failed to fetch shift:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchActiveShift()
  }, [])

  return (
    <RoleGuard allowedRoles={['manager']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <ManagerNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Shift Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                View and close shifts
              </p>
            </div>

            {loading ? (
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-8 border border-neutral-200 dark:border-neutral-800 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : activeShift ? (
              <div className="bg-primary-50 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800 text-center max-w-md mx-auto">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Active Shift
                </h2>
                <div className="space-y-2 flex flex-col items-center">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium">Shift ID:</span> {activeShift.shiftId}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium">Started:</span>{' '}
                    {new Date(activeShift.startTime).toLocaleString()}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium">Terminal:</span> {activeShift.terminalId}
                  </p>
                </div>
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`/manager/shifts/${activeShift.shiftId}`}
                    className="btn btn-primary"
                  >
                    View Details & Close Shift
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <p className="text-neutral-500 dark:text-neutral-400">
                  No active shift
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
