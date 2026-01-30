/**
 * POS route group layout.
 * Full-screen shell for POS; no Navbar/Footer (handled by root ConditionalShell for pathname === '/').
 * Tablet/desktop friendly.
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
