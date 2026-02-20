'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconShoppingCart,
  IconShoppingCartFilled,
  IconCreditCard,
  IconCreditCardFilled,
  IconClock,
  IconClockFilled,
  IconUsers,
  IconPackage,
  IconTable,
  IconTableFilled,
} from '@tabler/icons-react'
import CafeHavilahWord from '@/components/ui/CafeHavilahWord'
import SettingsDropdown from '@/components/ui/SettingsDropdown'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', iconOutline: IconLayoutDashboard, iconFilled: IconLayoutDashboardFilled },
  { href: '/admin/orders', label: 'Orders', iconOutline: IconShoppingCart, iconFilled: IconShoppingCartFilled },
  { href: '/admin/payments', label: 'Payments', iconOutline: IconCreditCard, iconFilled: IconCreditCardFilled },
  { href: '/admin/shifts', label: 'Shifts', iconOutline: IconClock, iconFilled: IconClockFilled },
  { href: '/admin/staff', label: 'Staff', iconOutline: IconUsers, iconFilled: null },
  { href: '/admin/products', label: 'Products', iconOutline: IconPackage, iconFilled: null },
  { href: '/admin/tables', label: 'Tables', iconOutline: IconTable, iconFilled: IconTableFilled },
] as const

export function AdminNavHeader() {
  const pathname = usePathname()

  return (
    <header className="pos-dashboard-header flex flex-col gap-4 mb-6 pos-dashboard-header-sticky">
      <div className="flex flex-row items-center justify-between gap-3">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100 transition-colors w-fit"
        >
          <div className="relative w-[84px] h-[84px] flex-shrink-0">
            <img
              src="/Light.jpg"
              alt="Cafe Havilah Logo"
              className="w-[84px] h-[84px] object-contain dark:hidden"
            />
            <img
              src="/Dark.jpg"
              alt="Cafe Havilah Logo"
              className="hidden w-[84px] h-[84px] object-contain dark:block"
              style={{ backgroundColor: 'transparent', mixBlendMode: 'normal' }}
            />
          </div>
          <CafeHavilahWord className="text-lg font-semibold tracking-tight" />
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Admin Panel</span>
          <SettingsDropdown />
        </div>
      </div>
      <nav className="pos-dashboard-nav" aria-label="Admin sections">
        {NAV_ITEMS.map(({ href, label, iconOutline, iconFilled }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const Icon = isActive && iconFilled ? iconFilled : iconOutline
          return (
            <Link
              key={href}
              href={href}
              className={`pos-dashboard-nav-link ${isActive ? '!bg-primary-100 !border-primary-300 !text-primary-800 dark:!bg-primary-800 dark:!border-primary-600 dark:!text-primary-100' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden stroke={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
