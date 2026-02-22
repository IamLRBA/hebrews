'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getToken } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { RealtimeNotificationPopup } from './RealtimeNotificationPopup'

type Notification = {
  title: string
  message: string
}

export function RealtimeNotificationProvider() {
  const pathname = usePathname()
  const [notification, setNotification] = useState<Notification | null>(null)
  const [open, setOpen] = useState(false)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const showNotification = useCallback((title: string, message: string) => {
    setNotification({ title, message })
    setOpen(true)
  }, [])

  const closeNotification = useCallback(() => {
    setOpen(false)
    setNotification(null)
  }, [])

  useEffect(() => {
    const token = getToken()
    const shiftId = getShiftId()
    const isPos = pathname?.startsWith('/pos') && !pathname?.startsWith('/pos/login')
    const isKitchen = pathname?.startsWith('/kitchen')
    if (!token || (!isPos && !isKitchen)) return

    const url = shiftId
      ? `/api/realtime/stream?shiftId=${encodeURIComponent(shiftId)}`
      : '/api/realtime/stream'
    const controller = new AbortController()
    abortRef.current = controller

    let buffer = ''
    const processLine = (line: string) => {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as {
            type: string
            payload?: {
              orderNumber?: string
              orderId?: string
              newStatus?: string
            }
          }
          if (data.type === 'ORDER_SENT_TO_KITCHEN' && isKitchen) {
            const orderNumber = data.payload?.orderNumber ?? data.payload?.orderId ?? ''
            const orderLabel = orderNumber ? `Order #${orderNumber}` : 'An order'
            showNotification(
              'New order',
              `${orderLabel} has been sent to the kitchen.`
            )
          }
          if (
            data.type === 'ORDER_STATUS_CHANGED' &&
            isPos &&
            (data.payload?.newStatus === 'ready' || data.payload?.newStatus === 'awaiting_payment')
          ) {
            const orderNumber = data.payload?.orderNumber ?? data.payload?.orderId ?? ''
            const orderLabel = orderNumber ? `Order #${orderNumber}` : 'An order'
            showNotification(
              'Order ready',
              `${orderLabel} is ready and has been moved to the Ready page.`
            )
          }
        } catch {
          // ignore parse errors (e.g. heartbeat comment)
        }
      }
    }

    const connect = () => {
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok || !res.body) return
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          const read = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) return
              buffer += decoder.decode(value, { stream: true })
              const parts = buffer.split('\n\n')
              buffer = parts.pop() ?? ''
              for (const part of parts) {
                for (const line of part.split('\n')) {
                  processLine(line)
                }
              }
              return read()
            })
          return read()
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return
          reconnectRef.current = setTimeout(connect, 3000)
        })
    }

    connect()
    return () => {
      controller.abort()
      abortRef.current = null
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }
  }, [pathname, showNotification])

  return (
    <RealtimeNotificationPopup
      open={open && notification !== null}
      title={notification?.title ?? ''}
      message={notification?.message ?? ''}
      onClose={closeNotification}
    />
  )
}
