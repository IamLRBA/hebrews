'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { posFetch } from '@/lib/pos-client'

const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 60000

export default function PaymentCallbackPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string
  const [timedOut, setTimedOut] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!orderId) return

    const checkOrder = async () => {
      try {
        const res = await posFetch(`/api/orders/${orderId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'served') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          router.push(`/pos/orders/${orderId}/receipt`)
        }
      } catch {
        // ignore fetch errors, keep polling
      }
    }

    intervalRef.current = setInterval(checkOrder, POLL_INTERVAL_MS)
    checkOrder()

    const timeoutId = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setTimedOut(true)
    }, TIMEOUT_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearTimeout(timeoutId)
    }
  }, [orderId, router])

  return (
    <main className="pos-page flex flex-col items-center justify-center min-h-[50dvh] text-center">
      <div className="pos-card max-w-md w-full">
        {timedOut ? (
          <div className="pos-alert pos-alert-warning">
            <p className="text-lg m-0 font-medium text-primary-800 dark:text-primary-100">
              Payment is taking longer than expected.
            </p>
            <p className="text-sm m-0 mt-2 text-primary-700 dark:text-primary-200">
              Please contact staff if payment was completed.
            </p>
          </div>
        ) : (
          <>
            <p className="pos-section-title text-xl m-0 mb-2">Processing payment…</p>
            <p className="text-neutral-600 dark:text-neutral-400 m-0 text-base">
              Please wait while we confirm your payment.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
