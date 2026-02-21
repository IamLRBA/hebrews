'use client'

import { useEffect } from 'react'
import { subscribeConnectionChanges } from '@/lib/offline/connection'
import { runSync } from '@/lib/offline/sync-engine'
import { ensureTerminalRegistered } from '@/lib/terminal/terminal'

/**
 * When connection goes ONLINE, register terminal and run sync once. Renders nothing.
 */
export function OfflineSyncProvider() {
  useEffect(() => {
    ensureTerminalRegistered().catch(() => {})
    let previousOnline: boolean | null = null
    const unsub = subscribeConnectionChanges((status) => {
      const online = status === 'ONLINE'
      if (previousOnline === false && online) {
        ensureTerminalRegistered().catch(() => {})
        runSync().catch(() => {})
      }
      previousOnline = online
    })
    return unsub
  }, [])
  return null
}
