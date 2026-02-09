'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, LayoutGrid, ListOrdered, Clock, ClipboardList } from 'lucide-react'

const CAFE_NAME = 'Cafe Havilah & Pizzeria'

const NAV_ITEMS = [
  { href: '/pos/tables', label: 'Tables', icon: LayoutGrid },
  { href: '/pos/orders', label: 'Shift Orders', icon: ListOrdered },
  { href: '/pos/ready', label: 'Ready Orders', icon: Clock },
  { href: '/pos/shift', label: 'Shift', icon: ClipboardList },
] as const

export function PosNavHeader({ hideNav }: { hideNav?: boolean }) {
  const pathname = usePathname()

  return (
    <header className="pos-dashboard-header flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/pos"
          className="flex items-center gap-2 text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100 transition-colors w-fit"
        >
          <Coffee className="w-7 h-7" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">{CAFE_NAME}</span>
        </Link>
        {pathname === '/pos' ? (
          <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Point of Sale</span>
        ) : (
          <Link href="/pos" className="pos-link text-sm font-medium w-fit">
            ⇐ Back to POS
          </Link>
        )}
      </div>
      {!hideNav && (
      <nav className="pos-dashboard-nav" aria-label="POS sections">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/pos' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`pos-dashboard-nav-link ${isActive ? '!bg-primary-100 !border-primary-300 !text-primary-800 dark:!bg-primary-800 dark:!border-primary-600 dark:!text-primary-100' : ''}`}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
      )}
    </header>
  )
}
