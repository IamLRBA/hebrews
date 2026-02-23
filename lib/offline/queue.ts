/**
 * Durable mutation queue for offline sync.
 * Persists to IndexedDB; survives reloads. Operations execute locally first, then enqueue for sync.
 */

import {
  putQueueItem,
  updateQueueItem,
  getPendingQueueItems,
  getSyncingOrPendingQueueItems,
  type MutationQueueItem,
  type QueueItemStatus,
  generateLocalId,
} from '@/lib/offline/db'

export type { MutationQueueItem } from '@/lib/offline/db'

export type MutationType =
  | 'createOrder'
  | 'addItem'
  | 'updateItem'
  | 'updateOrderStatus'
  | 'payCash'
  | 'payMomo'
  | 'payAirtel'

export interface EnqueueCreateOrderPayload {
  localId: string
  orderType: 'dine_in' | 'takeaway'
  tableId?: string | null
  shiftId: string
  terminalId: string
  createdByStaffId: string
  orderNumber: string
  assignedWaiterId?: string | null
}

export interface EnqueueAddItemPayload {
  orderLocalId: string
  orderServerId: string | null
  productId: string
  productName: string
  quantity: number
  unitPriceUgx: number
  size?: string | null
  modifier?: string | null
  notes?: string | null
  sortOrder?: number
}

export interface EnqueueUpdateItemPayload {
  orderItemLocalId: string
  orderLocalId: string
  orderServerId: string | null
  quantity: number
}

export interface EnqueueUpdateStatusPayload {
  orderLocalId: string
  orderServerId: string | null
  newStatus: string
  staffId: string
}

export interface EnqueuePayCashPayload {
  orderLocalId: string
  orderServerId: string | null
  amountUgx: number
  changeUgx: number | null
  staffId: string
  terminalId: string | null
  paymentLocalId: string
}

export interface EnqueuePayMomoPayload {
  orderLocalId: string
  orderServerId: string | null
  amountUgx: number
  staffId: string
  terminalId: string | null
  paymentLocalId: string
}

export interface EnqueuePayAirtelPayload {
  orderLocalId: string
  orderServerId: string | null
  amountUgx: number
  staffId: string
  terminalId: string | null
  paymentLocalId: string
}

function now(): string {
  return new Date().toISOString()
}

/**
 * Enqueue a create-order mutation. No dependencies.
 */
export async function enqueueCreateOrder(
  clientRequestId: string,
  payload: EnqueueCreateOrderPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'createOrder',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Enqueue add-item. Depends on order being synced (orderServerId may be filled by sync engine before this runs).
 */
export async function enqueueAddItem(
  clientRequestId: string,
  payload: EnqueueAddItemPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'addItem',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [payload.orderLocalId],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Enqueue update-item quantity.
 */
export async function enqueueUpdateItem(
  clientRequestId: string,
  payload: EnqueueUpdateItemPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'updateItem',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [payload.orderLocalId],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Enqueue kitchen status change.
 */
export async function enqueueUpdateOrderStatus(
  clientRequestId: string,
  payload: EnqueueUpdateStatusPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'updateOrderStatus',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [payload.orderLocalId],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Enqueue cash payment. Depends on order (and ideally all items) being synced.
 */
export async function enqueuePayCash(
  clientRequestId: string,
  payload: EnqueuePayCashPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'payCash',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [payload.orderLocalId],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Enqueue MTN MoMo payment. Same dependency as payCash.
 */
export async function enqueuePayMomo(
  clientRequestId: string,
  payload: EnqueuePayMomoPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'payMomo',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [payload.orderLocalId],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Enqueue Airtel Money payment. Same dependency as payCash.
 */
export async function enqueuePayAirtel(
  clientRequestId: string,
  payload: EnqueuePayAirtelPayload
): Promise<MutationQueueItem> {
  const item: MutationQueueItem = {
    id: generateLocalId(),
    type: 'payAirtel',
    payload: payload as unknown as Record<string, unknown>,
    clientRequestId,
    dependencies: [payload.orderLocalId],
    retryCount: 0,
    status: 'pending',
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }
  await putQueueItem(item)
  return item
}

/**
 * Get all pending (and syncing) items in order. Used by sync engine.
 */
export async function getPendingMutations(): Promise<MutationQueueItem[]> {
  return getSyncingOrPendingQueueItems()
}

/**
 * Mark item as syncing.
 */
export async function markQueueItemSyncing(item: MutationQueueItem): Promise<void> {
  await updateQueueItem({ ...item, status: 'syncing', updatedAt: now() })
}

/**
 * Mark item as synced.
 */
export async function markQueueItemSynced(item: MutationQueueItem): Promise<void> {
  await updateQueueItem({ ...item, status: 'synced', updatedAt: now() })
}

/**
 * Mark item as failed (will retry on next sync).
 */
export async function markQueueItemFailed(
  item: MutationQueueItem,
  errorMessage: string
): Promise<void> {
  await updateQueueItem({
    ...item,
    status: 'failed',
    errorMessage: errorMessage.slice(0, 512),
    retryCount: item.retryCount + 1,
    updatedAt: now(),
  })
}

/**
 * Reset failed item to pending for retry.
 */
export async function resetQueueItemToPending(item: MutationQueueItem): Promise<void> {
  await updateQueueItem({
    ...item,
    status: 'pending',
    errorMessage: null,
    updatedAt: now(),
  })
}

/**
 * Phase 10 crash recovery: reset any item stuck in "syncing" to "pending".
 * Call on sync start so no mutation is left stuck after a crash.
 */
export async function resetAllSyncingToPending(): Promise<number> {
  const { getAllQueueItems } = await import('@/lib/offline/db')
  const all = await getAllQueueItems()
  const syncing = all.filter((i) => i.status === 'syncing')
  for (const item of syncing) {
    await resetQueueItemToPending(item)
  }
  return syncing.length
}

/**
 * Count of pending mutations (for UI).
 */
export async function getPendingCount(): Promise<number> {
  const list = await getPendingQueueItems()
  return list.length
}
