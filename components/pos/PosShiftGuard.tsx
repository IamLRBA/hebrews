'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getShiftId } from '@/lib/pos-shift-store'

export function PosShiftGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname?.startsWith('/pos')) return
    if (pathname === '/pos/start' || pathname === '/pos/login') return

    const shiftId = getShiftId()
    if (!shiftId) {
      router.replace('/pos/start')
    }
  }, [pathname, router])

  return <>{children}</>
}
