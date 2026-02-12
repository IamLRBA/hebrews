'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getStaffId } from '@/lib/pos-client'

export function PosAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const isPosRoute = pathname.startsWith('/pos')
    const isKitchenRoute = pathname.startsWith('/kitchen')
    if (!isPosRoute && !isKitchenRoute) return
    if (pathname === '/pos/login') return

    const staffId = getStaffId()
    if (!staffId) {
      router.replace('/pos/login')
    }
  }, [pathname, router])

  return <>{children}</>
}
