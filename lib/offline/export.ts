/**
 * Phase 10: Export offline data (IndexedDB) for recovery if device fails before sync.
 */

import {
  getAllOrders,
  getOrderItemsByOrderLocalId,
  getPaymentsByOrderLocalId,
  getAllQueueItems,
  getSyncMetadata,
  META_ID,
} from '@/lib/offline/db'

export interface OfflineExportSnapshot {
  exportedAt: string
  orders: Awaited<ReturnType<typeof getAllOrders>>
  orderItemsByOrder: Record<string, Awaited<ReturnType<typeof getOrderItemsByOrderLocalId>>>
  paymentsByOrder: Record<string, Awaited<ReturnType<typeof getPaymentsByOrderLocalId>>>
  mutationQueue: Awaited<ReturnType<typeof getAllQueueItems>>
  syncMetadata: Awaited<ReturnType<typeof getSyncMetadata>>
}

/**
 * Export all IndexedDB content as JSON. Use for backup before device loss.
 */
export async function exportOfflineDataJSON(): Promise<string> {
  const orders = await getAllOrders()
  const orderItemsByOrder: Record<string, Awaited<ReturnType<typeof getOrderItemsByOrderLocalId>>> = {}
  for (const o of orders) {
    orderItemsByOrder[o.localId] = await getOrderItemsByOrderLocalId(o.localId)
  }
  const paymentsByOrder: Record<string, Awaited<ReturnType<typeof getPaymentsByOrderLocalId>>> = {}
  for (const o of orders) {
    paymentsByOrder[o.localId] = await getPaymentsByOrderLocalId(o.localId)
  }
  const mutationQueue = await getAllQueueItems()
  const syncMetadata = await getSyncMetadata()

  const snapshot: OfflineExportSnapshot = {
    exportedAt: new Date().toISOString(),
    orders,
    orderItemsByOrder,
    paymentsByOrder,
    mutationQueue,
    syncMetadata,
  }
  return JSON.stringify(snapshot, null, 2)
}

/**
 * Export offline data as JSON and trigger a browser download. No-op on server.
 */
export async function downloadOfflineDataJSON(): Promise<void> {
  const json = await exportOfflineDataJSON()
  if (typeof window === 'undefined') return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pos-offline-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export orders, items, payments, queue as CSV-style text (one section per store).
 */
export async function exportOfflineDataCSV(): Promise<string> {
  const orders = await getAllOrders()
  const lines: string[] = [
    '# Offline data export',
    `# ExportedAt,${new Date().toISOString()}`,
    '',
    '[orders]',
    'localId,serverId,orderNumber,orderType,tableId,shiftId,terminalId,createdByStaffId,status,totalUgx,createdAt,syncStatus',
  ]
  for (const o of orders) {
    lines.push(
      [
        o.localId,
        o.serverId ?? '',
        o.orderNumber,
        o.orderType,
        o.tableId ?? '',
        o.shiftId,
        o.terminalId,
        o.createdByStaffId,
        o.status,
        o.totalUgx,
        o.createdAt,
        o.syncStatus,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    )
  }
  lines.push('', '[orderItems]')
  for (const o of orders) {
    const items = await getOrderItemsByOrderLocalId(o.localId)
    for (const i of items) {
      lines.push(
        [i.localId, i.orderLocalId, i.productId, i.productName, i.quantity, i.unitPriceUgx, i.lineTotalUgx, i.createdAt].map((c) =>
          `"${String(c).replace(/"/g, '""')}"`
        ).join(',')
      )
    }
  }
  lines.push('', '[payments]')
  for (const o of orders) {
    const payments = await getPaymentsByOrderLocalId(o.localId)
    for (const p of payments) {
      lines.push(
        [p.localId, p.orderLocalId, p.amountUgx, p.method, p.clientRequestId, p.createdAt, p.syncStatus].map((c) =>
          `"${String(c).replace(/"/g, '""')}"`
        ).join(',')
      )
    }
  }
  const queue = await getAllQueueItems()
  lines.push('', '[mutationQueue]')
  lines.push('id,type,clientRequestId,status,createdAt,errorMessage')
  for (const q of queue) {
    lines.push(
      [q.id, q.type, q.clientRequestId, q.status, q.createdAt, (q.errorMessage ?? '').replace(/"/g, '""')].map((c) =>
        `"${String(c).replace(/"/g, '""')}"`
      ).join(',')
    )
  }
  const meta = await getSyncMetadata()
  if (meta) {
    lines.push('', '[syncMetadata]')
    lines.push(`id,${META_ID},lastSyncAt,${meta.lastSyncAt ?? ''},pendingCount,${meta.pendingCount ?? 0}`)
  }
  return lines.join('\n')
}
