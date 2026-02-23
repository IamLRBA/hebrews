/**
 * Server-side idempotency for Phase 8 offline sync.
 * When client sends clientRequestId, return stored response if already processed.
 */

import { prisma } from '@/lib/db'

export type ResourceType =
  | 'order_create_dine_in'
  | 'order_create_takeaway'
  | 'add_item'
  | 'pay_cash'
  | 'pay_momo'
  | 'pay_airtel'
  | 'kitchen_status'

/**
 * If clientRequestId was already processed, return the stored response.
 * Otherwise run fn(), store the result, and return it.
 * response must be JSON-serializable.
 */
export async function getOrSetIdempotent<T>(
  clientRequestId: string,
  resourceType: ResourceType,
  fn: () => Promise<T>
): Promise<T> {
  if (!clientRequestId || clientRequestId.length > 64) {
    return fn()
  }
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { clientRequestId },
    select: { responseJson: true },
  })
  if (existing) {
    return existing.responseJson as unknown as T
  }
  const result = await fn()
  const serializable =
    result !== undefined && result !== null && typeof result === 'object'
      ? (result as object)
      : result
  try {
    await prisma.idempotencyRecord.create({
      data: {
        clientRequestId,
        resourceType,
        responseJson: JSON.parse(JSON.stringify(serializable)),
      },
    })
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
    if (code === 'P2002') {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { clientRequestId },
        select: { responseJson: true },
      })
      if (existing) return existing.responseJson as unknown as T
    }
    throw e
  }
  return result
}
