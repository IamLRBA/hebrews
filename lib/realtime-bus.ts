/**
 * Shared message bus for realtime events. Multi-instance safe when REDIS_URL is set.
 * When REDIS_URL is unset, falls back to in-memory (single instance only).
 */

import type { RealtimeEvent } from '@/lib/realtime'

const REDIS_URL_ENV = 'REDIS_URL'
const CHANNEL = 'pos:realtime'

export type BusMessage =
  | { kind: 'shift'; shiftId: string; event: RealtimeEvent }
  | { kind: 'table'; event: RealtimeEvent }

type LocalDeliveryFn = (msg: BusMessage) => void

let localDelivery: LocalDeliveryFn | null = null
let redisClient: {
  publish: (ch: string, msg: string) => Promise<number>
  connect: () => Promise<void>
  on: (event: string, handler: () => void) => void
} | null = null
let redisSub: {
  subscribe: (ch: string, listener: (message: string) => void) => Promise<void>
  connect: () => Promise<void>
  on: (event: string, handler: () => void) => void
} | null = null
let subscriberReady = false

/**
 * Register the function that delivers messages to local connections.
 * Called once from realtime.ts.
 */
export function setLocalDelivery(fn: LocalDeliveryFn): void {
  localDelivery = fn
}

function deliverLocally(msg: BusMessage): void {
  if (localDelivery) localDelivery(msg)
}

/**
 * Publish a shift-scoped event. With Redis, all instances receive it and deliver to their local connections.
 */
export function publishShift(shiftId: string, event: RealtimeEvent): void {
  const msg: BusMessage = { kind: 'shift', shiftId, event }
  if (redisClient) {
    redisClient.publish(CHANNEL, JSON.stringify(msg)).catch(() => {
      deliverLocally(msg)
    })
  } else {
    deliverLocally(msg)
  }
}

/**
 * Publish a table event (all connections). Optional branchId for future multi-branch partitioning.
 */
export function publishTable(event: RealtimeEvent, _branchId?: string): void {
  const msg: BusMessage = { kind: 'table', event }
  if (redisClient) {
    redisClient.publish(CHANNEL, JSON.stringify(msg)).catch(() => {
      deliverLocally(msg)
    })
  } else {
    deliverLocally(msg)
  }
}

/**
 * Initialize the bus. If REDIS_URL is set, connect and subscribe; otherwise in-memory only.
 * Graceful fallback: on connection error, continues in in-memory mode (no crash).
 * Call once at app startup (e.g. from realtime.ts when first used).
 */
export async function initBus(): Promise<void> {
  const url = process.env[REDIS_URL_ENV]?.trim()
  if (!url) return

  try {
    const { createClient } = await import('redis')
    redisClient = createClient({ url })
    redisSub = createClient({ url })

    redisSub.on('error', () => { /* silent; avoid crash */ })
    redisClient.on('error', () => { /* silent; avoid crash */ })

    await redisClient.connect()
    await redisSub.connect()
    await redisSub.subscribe(CHANNEL, (message: string) => {
      try {
        const msg = JSON.parse(message) as BusMessage
        if (msg.kind === 'shift' || msg.kind === 'table') deliverLocally(msg)
      } catch {
        /* ignore malformed */
      }
    })
    subscriberReady = true
  } catch {
    redisClient = null
    redisSub = null
    subscriberReady = false
  }
}

export function isUsingRedis(): boolean {
  return subscriberReady && redisClient != null
}
