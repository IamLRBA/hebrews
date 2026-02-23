/**
 * Client-side persistent store (IndexedDB) for offline POS data.
 * Stores: orders, orderItems, payments, mutationQueue, syncMetadata.
 * All entities use localId (UUID), optional serverId, syncStatus, timestamps.
 */

const DB_NAME = 'pos-offline-db'
const DB_VERSION = 1

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface OfflineOrder {
  localId: string
  serverId: string | null
  orderNumber: string
  orderType: 'dine_in' | 'takeaway'
  tableId: string | null
  shiftId: string
  terminalId: string
  createdByStaffId: string
  assignedWaiterId: string | null
  status: string
  subtotalUgx: number
  taxUgx: number
  totalUgx: number
  notes: string | null
  customerName: string | null
  customerPhone: string | null
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
  isOfflineServed?: boolean
}

export interface OfflineOrderItem {
  localId: string
  serverId: string | null
  orderLocalId: string
  orderServerId: string | null
  productId: string
  productName: string
  quantity: number
  unitPriceUgx: number
  lineTotalUgx: number
  size: string | null
  modifier: string | null
  notes: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface OfflinePayment {
  localId: string
  serverId: string | null
  orderLocalId: string
  orderServerId: string | null
  amountUgx: number
  changeUgx: number | null
  method: 'cash' | 'mtn_momo' | 'airtel_money'
  createdByStaffId: string
  terminalId: string | null
  clientRequestId: string
  createdAt: string
  syncStatus: SyncStatus
}

export interface SyncMetadata {
  id: string
  lastSyncAt: string | null
  pendingCount: number
  failedCount: number
  updatedAt: string
}

export type QueueItemStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface MutationQueueItem {
  id: string
  type: string
  payload: Record<string, unknown>
  clientRequestId: string
  dependencies: string[]
  retryCount: number
  status: QueueItemStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

let dbInstance: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'))
  }
  if (dbInstance) return Promise.resolve(dbInstance)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      dbInstance = req.result
      resolve(req.result)
    }
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('orders')) {
        const os = db.createObjectStore('orders', { keyPath: 'localId' })
        os.createIndex('serverId', 'serverId', { unique: false })
        os.createIndex('syncStatus', 'syncStatus', { unique: false })
        os.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains('orderItems')) {
        const os = db.createObjectStore('orderItems', { keyPath: 'localId' })
        os.createIndex('orderLocalId', 'orderLocalId', { unique: false })
        os.createIndex('orderServerId', 'orderServerId', { unique: false })
      }
      if (!db.objectStoreNames.contains('payments')) {
        const os = db.createObjectStore('payments', { keyPath: 'localId' })
        os.createIndex('clientRequestId', 'clientRequestId', { unique: true })
        os.createIndex('orderLocalId', 'orderLocalId', { unique: false })
      }
      if (!db.objectStoreNames.contains('mutationQueue')) {
        const os = db.createObjectStore('mutationQueue', { keyPath: 'id' })
        os.createIndex('createdAt', 'createdAt', { unique: false })
        os.createIndex('status', 'status', { unique: false })
        os.createIndex('clientRequestId', 'clientRequestId', { unique: false })
      }
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'id' })
      }
    }
  })
}

export async function getDb(): Promise<IDBDatabase> {
  return openDb()
}

// --- Orders ---
export async function putOrder(order: OfflineOrder): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readwrite')
    tx.objectStore('orders').put(order)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOrderByLocalId(localId: string): Promise<OfflineOrder | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readonly')
    const req = tx.objectStore('orders').get(localId)
    tx.oncomplete = () => resolve(req.result ?? null)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOrderByServerId(serverId: string): Promise<OfflineOrder | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readonly')
    const req = tx.objectStore('orders').index('serverId').get(serverId)
    tx.oncomplete = () => resolve(req.result ?? null)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllOrders(): Promise<OfflineOrder[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readonly')
    const req = tx.objectStore('orders').getAll()
    tx.oncomplete = () => resolve(req.result ?? [])
    tx.onerror = () => reject(tx.error)
  })
}

// --- Order items ---
export async function putOrderItem(item: OfflineOrderItem): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orderItems', 'readwrite')
    tx.objectStore('orderItems').put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOrderItemsByOrderLocalId(orderLocalId: string): Promise<OfflineOrderItem[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orderItems', 'readonly')
    const req = tx.objectStore('orderItems').index('orderLocalId').getAll(orderLocalId)
    tx.oncomplete = () => resolve(req.result ?? [])
    tx.onerror = () => reject(tx.error)
  })
}

// --- Payments ---
export async function putPayment(payment: OfflinePayment): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('payments', 'readwrite')
    tx.objectStore('payments').put(payment)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPaymentsByOrderLocalId(orderLocalId: string): Promise<OfflinePayment[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('payments', 'readonly')
    const req = tx.objectStore('payments').index('orderLocalId').getAll(orderLocalId)
    tx.oncomplete = () => resolve(req.result ?? [])
    tx.onerror = () => reject(tx.error)
  })
}

// --- Sync metadata ---
const META_ID = 'default'
export async function getSyncMetadata(): Promise<SyncMetadata | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncMetadata', 'readonly')
    const req = tx.objectStore('syncMetadata').get(META_ID)
    tx.oncomplete = () => resolve(req.result ?? null)
    tx.onerror = () => reject(tx.error)
  })
}

export async function putSyncMetadata(meta: SyncMetadata): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncMetadata', 'readwrite')
    tx.objectStore('syncMetadata').put(meta)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// --- Mutation queue ---
export async function putQueueItem(item: MutationQueueItem): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutationQueue', 'readwrite')
    tx.objectStore('mutationQueue').put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingQueueItems(): Promise<MutationQueueItem[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutationQueue', 'readonly')
    const req = tx.objectStore('mutationQueue').index('status').getAll('pending')
    tx.oncomplete = () => resolve((req.result ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    tx.onerror = () => reject(tx.error)
  })
}

export async function getSyncingOrPendingQueueItems(): Promise<MutationQueueItem[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutationQueue', 'readonly')
    const all = tx.objectStore('mutationQueue').getAll()
    tx.oncomplete = () => {
      const list = (all.result ?? []).filter((i: MutationQueueItem) => i.status === 'pending' || i.status === 'syncing')
      list.sort((a: MutationQueueItem, b: MutationQueueItem) => a.createdAt.localeCompare(b.createdAt))
      resolve(list)
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllQueueItems(): Promise<MutationQueueItem[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutationQueue', 'readonly')
    const req = tx.objectStore('mutationQueue').getAll()
    tx.oncomplete = () => resolve((req.result ?? []).sort((a: MutationQueueItem, b: MutationQueueItem) => a.createdAt.localeCompare(b.createdAt)))
    tx.onerror = () => reject(tx.error)
  })
}

export async function updateQueueItem(item: MutationQueueItem): Promise<void> {
  return putQueueItem(item)
}

export function generateLocalId(): string {
  return crypto.randomUUID()
}
