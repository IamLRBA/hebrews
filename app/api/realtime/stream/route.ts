import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { getOptionalTerminal } from '@/lib/terminal'
import { getActiveShift } from '@/lib/staff-session'
import { getActiveOrderCounts } from '@/lib/cafe-workflow'
import {
  addConnection,
  removeConnection,
  formatSSE,
  formatHeartbeat,
  type RealtimeEvent,
} from '@/lib/realtime'

const HEARTBEAT_INTERVAL_MS = 30_000
/** Max events queued per connection; slow clients are dropped when exceeded. */
const MAX_QUEUE_PER_CONNECTION = 50

/**
 * GET /api/realtime/stream?shiftId=<uuid>
 * Requires: Authorization: Bearer <token>
 * Optional: x-terminal-id. If shiftId is omitted, uses the authenticated staff's active shift.
 * Streams SSE events for the shift (order updates, counts) and table events (all shifts).
 * Sends SNAPSHOT with current order counts on connect for resync after reconnection.
 */
export async function GET(request: NextRequest) {
  try {
    const { staffId, role } = await getAuthenticatedStaff(request)
    const terminal = await getOptionalTerminal(request).catch(() => null)

    let shiftId = request.nextUrl.searchParams.get('shiftId')?.trim()
    if (!shiftId) {
      try {
        const shift = await getActiveShift(staffId)
        shiftId = shift.id
      } catch {
        return new Response(
          JSON.stringify({ error: 'No active shift. Start a shift or pass shiftId.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, staffId: true, endTime: true },
    })
    if (!shift) {
      return new Response(JSON.stringify({ error: 'Shift not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (shift.endTime != null) {
      return new Response(JSON.stringify({ error: 'Shift is closed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const canAccess =
      shift.staffId === staffId || role === 'manager' || role === 'admin'
    if (!canAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to this shift' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const counts = await getActiveOrderCounts({ shiftId })
    const snapshot: RealtimeEvent = {
      type: 'SNAPSHOT',
      payload: {
        shiftId,
        orderCounts: {
          shiftId,
          ...counts,
          at: new Date().toISOString(),
        },
        at: new Date().toISOString(),
      },
    }

    const encoder = new TextEncoder()
    let sendRef: ((event: RealtimeEvent) => void) | null = null
    let cleanupRef: (() => void) | null = null

    const stream = new ReadableStream({
      start(controller) {
        const queue: RealtimeEvent[] = []
        let flushing = false

        const flush = () => {
          if (queue.length === 0 || flushing) return
          flushing = true
          const event = queue.shift()!
          try {
            controller.enqueue(encoder.encode(formatSSE(event)))
          } catch {
            if (sendRef) removeConnection(sendRef)
            flushing = false
            return
          }
          flushing = false
          if (queue.length > 0) setImmediate(flush)
        }

        const send = (event: RealtimeEvent) => {
          if (queue.length >= MAX_QUEUE_PER_CONNECTION) {
            if (sendRef) removeConnection(sendRef)
            return
          }
          queue.push(event)
          if (queue.length === 1) setImmediate(flush)
        }
        sendRef = send
        addConnection({
          shiftId,
          staffId,
          terminalId: terminal?.code ?? null,
          send,
        })

        try {
          controller.enqueue(encoder.encode(formatSSE(snapshot)))
        } catch {
          // ignore
        }

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(formatHeartbeat()))
          } catch {
            clearInterval(heartbeat)
          }
        }, HEARTBEAT_INTERVAL_MS)

        const cleanup = () => {
          clearInterval(heartbeat)
          if (sendRef) removeConnection(sendRef)
        }
        cleanupRef = cleanup

        request.signal?.addEventListener('abort', cleanup)
      },
      cancel() {
        cleanupRef?.()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
