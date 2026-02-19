'use client'

import BackToTop from '@/components/ui/BackToTop'
import { PosAuthGuard } from '@/components/pos/PosAuthGuard'
import { PosShiftGuard } from '@/components/pos/PosShiftGuard'
import { usePathname } from 'next/navigation'

/**
 * POS route group layout.
 * Full-screen wrapper only — no Navbar, no Footer. Shell is suppressed by ConditionalShell for /, /pos/*, and /kds.
 * Shift guard only applies to POS routes, not admin/manager/kitchen routes.
 */
export default function PosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPosRoute = pathname?.startsWith('/pos') && !pathname?.startsWith('/pos/login')
  const isAdminRoute = pathname?.startsWith('/admin')
  const isManagerRoute = pathname?.startsWith('/manager')
  const isKitchenRoute = pathname?.startsWith('/kitchen')
  const isLoginRoute = pathname === '/login'

  // Skip shift guard for admin, manager, kitchen, and login routes
  if (isAdminRoute || isManagerRoute || isKitchenRoute || isLoginRoute) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-unified" style={{ minHeight: '100dvh' }}>
        {children}
        <BackToTop />
      </div>
    )
  }

  return (
    <PosAuthGuard>
      <PosShiftGuard>
        <div className="min-h-screen w-full flex flex-col bg-unified" style={{ minHeight: '100dvh' }}>
          {children}
          <BackToTop />
        </div>
      </PosShiftGuard>
    </PosAuthGuard>
  )
}
