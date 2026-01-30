'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import SkipToContent from '@/components/ui/SkipToContent'
import AccountPromptPopup from '@/components/ui/AccountPromptPopup'
import BackToTop from '@/components/ui/BackToTop'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts'

/**
 * Renders Navbar, Footer, and global UI only for non-POS routes.
 * When pathname is '/' (POS home), only children are rendered (no marketing shell).
 */
export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPosRoot = pathname === '/'

  if (isPosRoot) {
    return <>{children}</>
  }

  return (
    <>
      <SkipToContent />
      <Navbar />
      <main id="main-content">
        {children}
      </main>
      <Footer />
      <AccountPromptPopup />
      <BackToTop />
      <KeyboardShortcuts />
    </>
  )
}
