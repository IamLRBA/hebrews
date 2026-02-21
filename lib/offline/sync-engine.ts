/**
 * Sync engine: when back online, replay mutation queue in dependency order,
 * map local IDs to server IDs, update local store, trigger receipt/drawer for synced cash.
 */

import { isOnline } from '@/lib/offline/connection'
import { posFetch, getToken } from '@/lib/pos-client'
import {
  getPendingMutations,
  markQueueItemSyncing,
  markQueueItemSynced,
  markQueueItemFailed,
  resetQueueItemToPending,
  type MutationQueueItem,
} from '@/lib/offline/queue'
import {
  getOrderByLocalId,
  putOrder,
  putPayment,
  getSyncMetadata,
  putSyncMetadata,
  getPaymentsByOrderLocalId,
  META_ID,
  type OfflinePayment,
} from '@/lib/offline/db'

const SYNC_ORDER: string[] = ['createOrder', 'addItem', 'updateItem', 'updateOrderStatus', 'payCash']
const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 1000

function sortByDependency(items: MutationQueueItem[]): MutationQueueItem[] {
  const byType = (a: MutationQueueItem, b: MutationQueueItem) =>
    SYNC_ORDER.indexOf(a.type) - SYNC_ORDER.indexOf(b.type)
  const byCreated = (a: MutationQueueItem, b: MutationQueueItem) =>
    a.createdAt.localeCompare(b.createdAt)
  return [...items].sort((a, b) => byType(a, b) || byCreated(a, b))
}

function backoffMs(retryCount: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, Math.min(retryCount, 4))
}

let syncInProgress = false
let syncListeners: Array<(status: { running: boolean; lastError?: string }) => void> = []

function notifySyncStatus(status: { running: boolean; lastError?: string }) {
  syncListeners.forEach((cb) => cb(status))
}

export function subscribeSyncStatus(callback: (status: { running: boolean; lastError?: string }) => void): () => void {
  syncListeners.push(callback)
  return () => {
    syncListeners = syncListeners.filter((l) => l !== callback)
  }
}

/**
 * Resolve order server ID from local ID (from IndexedDB or from just-synced map).
 */
async function resolveOrderServerId(
  orderLocalId: string,
  serverIdMap: Map<string, string>
): Promise<string | null> {
  const fromMap = serverIdMap.get(orderLocalId)
  if (fromMap) return fromMap
  const order = await getOrderByLocalId(orderLocalId)
  return order?.serverId ?? null
}

/**
 * Run one sync pass. Call when ONLINE. Uses exponential backoff on failure.
 */
export async function runSync(): Promise<{ synced: number; failed: number; errors: string[] }> {
  if (typeof window === 'undefined') return { synced: 0, failed: 0, errors: [] }
  if (!isOnline()) return { synced: 0, failed: 0, errors: [] }
  if (syncInProgress) return { synced: 0, failed: 0, errors: [] }

  syncInProgress = true
  notifySyncStatus({ running: true })
  const errors: string[] = []
  let synced = 0
  let failed = 0
  const serverIdMap = new Map<string, string>()

  try {
    const { resetAllSyncingToPending } = await import('@/lib/offline/queue')
    await resetAllSyncingToPending()
    let items = await getPendingMutations()
    items = items.filter((i) => i.status === 'pending' || (i.status === 'failed' && i.retryCount < MAX_RETRIES))
    for (const item of items.filter((i) => i.status === 'failed')) {
      await resetQueueItemToPending(item)
    }
    items = await getPendingMutations()
    const sorted = sortByDependency(items)

    for (const item of sorted) {
      const resolved = await resolveDependencies(item, serverIdMap)
      if (!resolved) continue

      await markQueueItemSyncing(item)
      try {
        const result = await executeMutation(item, serverIdMap)
        if (result.success && result.serverOrderId) {
          serverIdMap.set(result.orderLocalId!, result.serverOrderId)
        }
        if (result.success) {
          await markQueueItemSynced(item)
          synced++
        } else {
          await markQueueItemFailed(item, result.error ?? 'Unknown error')
          failed++
          errors.push(result.error ?? '')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await markQueueItemFailed(item, msg)
        failed++
        errors.push(msg)
        notifySyncStatus({ running: true, lastError: msg })
        await sleep(backoffMs(item.retryCount + 1))
      }
    }

    const meta = await getSyncMetadata()
    const now = new Date().toISOString()
    await putSyncMetadata({
      id: META_ID,
      lastSyncAt: synced > 0 ? now : (meta?.lastSyncAt ?? null),
      pendingCount: Math.max(0, (meta?.pendingCount ?? 0) + failed - synced),
      failedCount: (meta?.failedCount ?? 0) + failed,
      updatedAt: now,
    })
  } finally {
    syncInProgress = false
    notifySyncStatus({ running: false })
  }

  return { synced, failed, errors }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function resolveDependencies(
  item: MutationQueueItem,
  serverIdMap: Map<string, string>
): Promise<boolean> {
  for (const dep of item.dependencies) {
    const serverId = serverIdMap.get(dep) ?? (await getOrderByLocalId(dep))?.serverId
    if (!serverId && item.type !== 'createOrder') return false
  }
  return true
}

interface ExecuteResult {
  success: boolean
  error?: string
  serverOrderId?: string
  orderLocalId?: string
}

function getAuthHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function executeMutation(
  item: MutationQueueItem,
  serverIdMap: Map<string, string>
): Promise<ExecuteResult> {

  switch (item.type) {
    case 'createOrder': {
      const p = item.payload as {
        localId: string
        orderType: 'dine_in' | 'takeaway'
        tableId?: string | null
        shiftId: string
        terminalId: string
        createdByStaffId: string
        orderNumber: string
        assignedWaiterId?: string | null
      }
      const url = p.orderType === 'dine_in' ? '/api/orders/dine-in' : '/api/orders/takeaway'
      const body: Record<string, unknown> =
        p.orderType === 'dine_in'
          ? {
              tableId: p.tableId,
              createdByStaffId: p.createdByStaffId,
              orderNumber: p.orderNumber,
              clientRequestId: item.clientRequestId,
              localId: p.localId,
              assignedWaiterId: p.assignedWaiterId ?? undefined,
              terminalId: p.terminalId ?? undefined,
            }
          : {
              staffId: p.createdByStaffId,
              orderNumber: p.orderNumber,
              clientRequestId: item.clientRequestId,
              localId: p.localId,
              terminalId: p.terminalId ?? undefined,
            }
      const res = await posFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; conflict?: string }
        const msg = err.error ?? res.statusText
        if (res.status === 409 && err.conflict === 'TABLE_OCCUPIED') {
          return { success: false, error: `Table conflict: ${msg}`, orderLocalId: p.localId }
        }
        return { success: false, error: msg, orderLocalId: p.localId }
      }
      const data = (await res.json()) as { id: string; orderNumber?: string; shiftId?: string }
      const order = await getOrderByLocalId(p.localId)
      if (order) {
        await putOrder({
          ...order,
          serverId: data.id,
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        })
      }
      return { success: true, serverOrderId: data.id, orderLocalId: p.localId }
    }

    case 'addItem': {
      const p = item.payload as {
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
      const orderServerId = serverIdMap.get(p.orderLocalId) ?? (await getOrderByLocalId(p.orderLocalId))?.serverId
      if (!orderServerId) return { success: false, error: 'Order not yet synced', orderLocalId: p.orderLocalId }
      const res = await posFetch(`/api/orders/${orderServerId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          productId: p.productId,
          quantity: p.quantity,
          size: p.size ?? undefined,
          modifier: p.modifier ?? undefined,
          notes: p.notes ?? undefined,
          clientRequestId: item.clientRequestId,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: (err as { error?: string }).error ?? res.statusText, orderLocalId: p.orderLocalId }
      }
      const orderDetail = (await res.json()) as { orderId: string }
      return { success: true, serverOrderId: orderDetail.orderId, orderLocalId: p.orderLocalId }
    }

    case 'updateOrderStatus': {
      const p = item.payload as { orderLocalId: string; orderServerId: string | null; newStatus: string; staffId: string }
      const orderServerId = serverIdMap.get(p.orderLocalId) ?? (await getOrderByLocalId(p.orderLocalId))?.serverId
      if (!orderServerId) return { success: false, error: 'Order not yet synced', orderLocalId: p.orderLocalId }
      const res = await posFetch(`/api/kitchen/orders/${orderServerId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          newStatus: p.newStatus,
          staffId: p.staffId,
          clientRequestId: item.clientRequestId,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: (err as { error?: string }).error ?? res.statusText, orderLocalId: p.orderLocalId }
      }
      return { success: true, serverOrderId: orderServerId, orderLocalId: p.orderLocalId }
    }

    case 'payCash': {
      const p = item.payload as {
        orderLocalId: string
        orderServerId: string | null
        amountUgx: number
        changeUgx: number | null
        staffId: string
        terminalId: string | null
        paymentLocalId: string
      }
      const orderServerId = serverIdMap.get(p.orderLocalId) ?? (await getOrderByLocalId(p.orderLocalId))?.serverId
      if (!orderServerId) return { success: false, error: 'Order not yet synced', orderLocalId: p.orderLocalId }
      const res = await posFetch(`/api/orders/${orderServerId}/pay-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          amountUgx: p.amountUgx,
          clientRequestId: item.clientRequestId,
          terminalId: p.terminalId ?? undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: (err as { error?: string }).error ?? res.statusText, orderLocalId: p.orderLocalId }
      }
      await res.json()
      const payment = await getPaymentsByOrderLocalId(p.orderLocalId).then((list) =>
        list.find((x) => x.localId === p.paymentLocalId)
      )
      if (payment) {
        await putPayment({ ...payment, syncStatus: 'synced' })
      }
      return { success: true, serverOrderId: orderServerId, orderLocalId: p.orderLocalId }
    }

    default:
      return { success: false, error: `Unknown mutation type: ${item.type}` }
  }
}

