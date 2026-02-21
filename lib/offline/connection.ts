/**
 * Offline detection and connectivity monitor.
 * Uses navigator.onLine, optional failed-request reporting, and optional SSE disconnect.
 * Emits ONLINE / OFFLINE for UI and sync engine.
 */

export type ConnectionStatus = 'ONLINE' | 'OFFLINE'

export type ConnectionChangeCallback = (status: ConnectionStatus) => void

let listeners: ConnectionChangeCallback[] = []
let lastKnown: ConnectionStatus = typeof navigator !== 'undefined' ? (navigator.onLine ? 'ONLINE' : 'OFFLINE') : 'ONLINE'
let pollHandle: ReturnType<typeof setInterval> | null = null

function getNavigatorOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

function notify(status: ConnectionStatus) {
  if (status === lastKnown) return
  lastKnown = status
  listeners.forEach((cb) => cb(status))
}

function check() {
  const online = getNavigatorOnline()
  notify(online ? 'ONLINE' : 'OFFLINE')
}

/**
 * Current online status (navigator.onLine).
 */
export function isOnline(): boolean {
  return getNavigatorOnline()
}

/**
 * Subscribe to connection status changes (ONLINE / OFFLINE).
 * Returns an unsubscribe function.
 */
export function subscribeConnectionChanges(callback: ConnectionChangeCallback): () => void {
  listeners.push(callback)
  callback(lastKnown)
  if (typeof window !== 'undefined' && !pollHandle) {
    window.addEventListener('online', check)
    window.addEventListener('offline', check)
    pollHandle = setInterval(check, 5000)
  }
  return () => {
    listeners = listeners.filter((l) => l !== callback)
    if (listeners.length === 0 && typeof window !== 'undefined') {
      window.removeEventListener('online', check)
      window.removeEventListener('offline', check)
      if (pollHandle) {
        clearInterval(pollHandle)
        pollHandle = null
      }
    }
  }
}

/**
 * Call when an API request fails due to network (e.g. fetch throws or 5xx/timeout).
 * May flip status to OFFLINE if we were assuming online.
 */
export function reportFailedRequest(): void {
  if (lastKnown === 'ONLINE') {
    notify('OFFLINE')
  }
}

/**
 * Call when SSE stream disconnects unexpectedly.
 */
export function reportSseDisconnect(): void {
  reportFailedRequest()
}
