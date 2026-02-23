'use client'

import dynamic from 'next/dynamic'
import BackToTop from '@/components/ui/BackToTop'
import { PosAuthGuard } from '@/components/pos/PosAuthGuard'
import { PosShiftGuard } from '@/components/pos/PosShiftGuard'
import { OfflineBadge } from '@/components/pos/OfflineBadge'
import { OfflineSyncProvider } from '@/components/pos/OfflineSyncProvider'
import { usePathname } from 'next/navigation'

const RealtimeNotificationProvider = dynamic(
  () => import('@/components/pos/RealtimeNotificationProvider').then((m) => ({ default: m.RealtimeNotificationProvider })),
  { ssr: false, loading: () => null }
)

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
  const isBarRoute = pathname?.startsWith('/bar')
  const isLoginRoute = pathname === '/login'

  // Skip shift guard for admin, manager, kitchen, bar, and login routes
  if (isAdminRoute || isManagerRoute || isKitchenRoute || isBarRoute || isLoginRoute) {
    return (
      <>
        <OfflineSyncProvider />
        <RealtimeNotificationProvider />
        <div className="min-h-screen w-full flex flex-col bg-unified" style={{ minHeight: '100dvh' }}>
          {children}
          <BackToTop />
        </div>
        <OfflineBadge />
      </>
    )
  }

  return (
    <PosAuthGuard>
      <PosShiftGuard>
        <OfflineSyncProvider />
        <RealtimeNotificationProvider />
        <div className="min-h-screen w-full flex flex-col bg-unified" style={{ minHeight: '100dvh' }}>
          {children}
          <BackToTop />
        </div>
        <OfflineBadge />
      </PosShiftGuard>
    </PosAuthGuard>
  )
}
