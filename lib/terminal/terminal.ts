/**
 * Client-side terminal identity for multi-terminal POS.
 * Persistent UUID v4 in IndexedDB + localStorage; survives reloads and offline.
 */

const TERMINAL_STORAGE_KEY = 'pos-terminal-id'
const TERMINAL_DB_NAME = 'pos-terminal-db'
const TERMINAL_DB_VERSION = 1
const TERMINAL_STORE = 'terminal'

let cachedTerminalId: string | null = null

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  const hex = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-'
    else if (i === 14) s += '4'
    else if (i === 19) s += hex[(Math.random() * 4) | 0]
    else s += hex[(Math.random() * 16) | 0]
  }
  return s
}

function openTerminalDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'))
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TERMINAL_DB_NAME, TERMINAL_DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(TERMINAL_STORE)) {
        req.result.createObjectStore(TERMINAL_STORE, { keyPath: 'id' })
      }
    }
  })
}

async function readFromIndexedDB(): Promise<string | null> {
  try {
    const db = await openTerminalDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TERMINAL_STORE, 'readonly')
      const store = tx.objectStore(TERMINAL_STORE)
      const req = store.get('terminalId')
      req.onsuccess = () => {
        const row = req.result
        resolve(row?.value ?? null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function writeToIndexedDB(value: string): Promise<void> {
  try {
    const db = await openTerminalDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TERMINAL_STORE, 'readwrite')
      const store = tx.objectStore(TERMINAL_STORE)
      store.put({ id: 'terminalId', value })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

function readFromLocalStorage(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(TERMINAL_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeToLocalStorage(value: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(TERMINAL_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

/**
 * Get this device's persistent terminal ID (UUID v4).
 * Reads from cache, then IndexedDB, then localStorage; generates and persists if missing.
 */
export async function getTerminalId(): Promise<string> {
  if (cachedTerminalId) return cachedTerminalId
  const fromDb = await readFromIndexedDB()
  if (fromDb) {
    cachedTerminalId = fromDb
    writeToLocalStorage(fromDb)
    return fromDb
  }
  const fromLs = readFromLocalStorage()
  if (fromLs) {
    cachedTerminalId = fromLs
    await writeToIndexedDB(fromLs)
    return fromLs
  }
  const newId = generateUuid()
  cachedTerminalId = newId
  writeToLocalStorage(newId)
  await writeToIndexedDB(newId)
  return newId
}

/**
 * Synchronous get when ID was already resolved (e.g. after ensureTerminalRegistered).
 * Returns null if not yet loaded (e.g. SSR).
 */
export function getTerminalIdSync(): string | null {
  return cachedTerminalId
}

/**
 * Register this terminal with the server (create or update lastSeenAt).
 * Call when online; safe to call repeatedly. No-op when offline.
 */
export async function ensureTerminalRegistered(params?: {
  name?: string
  location?: string
}): Promise<void> {
  if (typeof window === 'undefined') return
  const terminalId = await getTerminalId()
  try {
    const res = await fetch('/api/terminal/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terminalId,
        name: params?.name ?? undefined,
        location: params?.location ?? undefined,
      }),
    })
    if (!res.ok) {
      // Don't throw; registration is best-effort
      return
    }
  } catch {
    // Offline or network error; ignore
  }
}
