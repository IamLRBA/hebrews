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
    const isAdminRoute = pathname.startsWith('/admin')
    const isManagerRoute = pathname.startsWith('/manager')
    const isLoginRoute = pathname === '/login' || pathname === '/pos/login'
    
    if (!isPosRoute && !isKitchenRoute && !isAdminRoute && !isManagerRoute) return
    if (isLoginRoute) return

    const staffId = getStaffId()
    if (!staffId) {
      router.replace('/login')
    }
  }, [pathname, router])

  return <>{children}</>
}
