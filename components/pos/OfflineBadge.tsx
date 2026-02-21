'use client'

import { useEffect, useState } from 'react'
import { isOnline, subscribeConnectionChanges } from '@/lib/offline/connection'
import { getPendingCount } from '@/lib/offline/queue'
import { subscribeSyncStatus } from '@/lib/offline/sync-engine'
import { downloadOfflineDataJSON } from '@/lib/offline/export'

/**
 * Shows OFFLINE when disconnected; shows "Syncing…" and pending count when online with pending mutations.
 */
export function OfflineBadge() {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)

  useEffect(() => {
    setOnline(isOnline())
    const unsubConnection = subscribeConnectionChanges((status) => {
      setOnline(status === 'ONLINE')
    })
    const unsubSync = subscribeSyncStatus((s) => {
      setSyncing(s.running)
      setLastSyncError(s.lastError ?? null)
    })
    const refreshPending = () => {
      getPendingCount().then(setPendingCount)
    }
    refreshPending()
    const interval = setInterval(refreshPending, 3000)
    return () => {
      unsubConnection()
      unsubSync()
      clearInterval(interval)
    }
  }, [])

  if (online && !syncing && pendingCount === 0 && !lastSyncError) return null

  return (
    <div
      className="fixed top-2 right-2 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
      role="status"
      aria-live="polite"
    >
      {!online ? (
        <span className="bg-amber-500 text-white px-3 py-1 rounded">OFFLINE</span>
      ) : syncing ? (
        <span className="bg-blue-500 text-white px-3 py-1 rounded">Syncing…</span>
      ) : pendingCount > 0 ? (
        <span className="bg-neutral-600 text-white px-3 py-1 rounded">
          {pendingCount} pending sync
        </span>
      ) : lastSyncError ? (
        <span className="bg-amber-600 text-white px-3 py-1 rounded" title={lastSyncError}>
          Sync had conflicts
        </span>
      ) : null}
      {(!online || pendingCount > 0) && (
        <button
          type="button"
          onClick={() => downloadOfflineDataJSON()}
          className="text-xs underline text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Export offline data
        </button>
      )}
    </div>
  )
}
