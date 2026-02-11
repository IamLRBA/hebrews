'use client'

/**
 * POS-only app: no Navbar/Footer. Renders children only (full-screen POS/KDS and landing).
 */
export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
