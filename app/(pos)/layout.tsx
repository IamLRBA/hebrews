'use client'

import BackToTop from '@/components/ui/BackToTop'
import { PosAuthGuard } from '@/components/pos/PosAuthGuard'
import { PosShiftGuard } from '@/components/pos/PosShiftGuard'

/**
 * POS route group layout.
 * Full-screen wrapper only — no Navbar, no Footer. Shell is suppressed by ConditionalShell for /, /pos/*, and /kds.
 */
export default function PosLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
