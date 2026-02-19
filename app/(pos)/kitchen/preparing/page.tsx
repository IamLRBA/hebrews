'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { KitchenNavHeader } from '@/components/kitchen/KitchenNavHeader'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { useSearchParams } from 'next/navigation'

export default function KitchenPreparingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shiftId = searchParams.get('shiftId')
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!shiftId) {
      setError('Shift ID required')
      setLoading(false)
      return
    }
    try {
      const res = await posFetch(`/api/kitchen/${shiftId}/queue`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load queue')
      }
      const data = await res.json()
      const allOrders = Array.isArray(data) ? data : []
      // Filter only preparing orders
      setQueue(allOrders.filter((order: any) => order.status === 'preparing'))
      setError(null)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load queue'
      setError(errorMsg)
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/login')
      return
    }
    if (shiftId) {
      fetchQueue()
      const interval = setInterval(fetchQueue, 5000)
      return () => clearInterval(interval)
    }
  }, [shiftId, fetchQueue, router])

  return (
    <RoleGuard allowedRoles={['kitchen']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <KitchenNavHeader />
          <main className="flex flex-col items-center">
            {error && (
              <div className="mb-4 w-full max-w-7xl">
                <ErrorBanner message={error} onDismiss={() => setError(null)} />
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-neutral-500 dark:text-neutral-400 mt-4">Loading orders...</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="pos-card max-w-md mx-auto text-center py-12">
                <p className="m-0 text-neutral-600 dark:text-neutral-400">No preparing orders</p>
              </div>
            ) : (
              <div className="w-full max-w-7xl">
                <p className="text-center text-neutral-500 dark:text-neutral-400 mb-4">
                  {queue.length} order{queue.length !== 1 ? 's' : ''} being prepared
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
