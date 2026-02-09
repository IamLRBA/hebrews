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
    <div className="min-h-screen w-full flex flex-col bg-unified" style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}
