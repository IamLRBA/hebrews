'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconLayoutList,
  IconLayoutListFilled,
  IconClock,
  IconClockFilled,
  IconClipboardList,
  IconClipboardListFilled,
} from '@tabler/icons-react'
import CafeHavilahWord from '@/components/ui/CafeHavilahWord'
import SettingsDropdown from '@/components/ui/SettingsDropdown'

const NAV_ITEMS = [
  { href: '/pos', label: 'All', iconOutline: null, iconFilled: null },
  { href: '/pos/tables', label: 'Tables', iconOutline: IconLayoutGrid, iconFilled: IconLayoutGridFilled },
  { href: '/pos/orders', label: 'Orders', iconOutline: IconLayoutList, iconFilled: IconLayoutListFilled },
  { href: '/pos/ready', label: 'Ready', iconOutline: IconClock, iconFilled: IconClockFilled },
  { href: '/pos/shift', label: 'Shift', iconOutline: IconClipboardList, iconFilled: IconClipboardListFilled },
] as const

export function PosNavHeader({ hideNav }: { hideNav?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const isOrderDetail = /^\/pos\/orders\/[^/]+$/.test(pathname)
  const isPaymentPage = /^\/pos\/payment\/[^/]+$/.test(pathname)
  const showBackToHistory = (isOrderDetail && !pathname.includes('/receipt')) || isPaymentPage

  return (
    <header className={`pos-dashboard-header flex flex-col gap-4 mb-6 ${!hideNav ? 'pos-dashboard-header-sticky' : ''}`}>
      <div className="flex flex-row items-center justify-between gap-3">
        <Link
          href="/pos"
          className="flex items-center gap-2 text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-primary-100 transition-colors w-fit"
        >
          <div className="relative w-[84px] h-[84px] flex-shrink-0">
            {/* Light mode logo */}
            <img
              src="/Light.jpg"
              alt="Cafe Havilah Logo"
              className="w-[84px] h-[84px] object-contain dark:hidden"
            />
            {/* Dark mode logo - transparent background */}
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
          {pathname === '/pos' ? (
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Point of Sale</span>
          ) : showBackToHistory ? (
            <button type="button" onClick={() => router.back()} className="pos-link text-sm font-medium w-fit bg-transparent border-none cursor-pointer p-0">
              ⇐ Back
            </button>
          ) : (
            <Link href="/pos" className="pos-link text-sm font-medium w-fit">
              ⇐ Back to POS
            </Link>
          )}
          <SettingsDropdown />
        </div>
      </div>
      {!hideNav && (
      <nav className="pos-dashboard-nav" aria-label="POS sections">
        {NAV_ITEMS.map(({ href, label, iconOutline, iconFilled }) => {
          const isActive = href === '/pos' ? pathname === '/pos' : (pathname === href || pathname.startsWith(href))
          const Icon = isActive ? iconFilled : iconOutline
          return (
            <Link
              key={href}
              href={href}
              className={`pos-dashboard-nav-link ${isActive ? '!bg-primary-100 !border-primary-300 !text-primary-800 dark:!bg-primary-800 dark:!border-primary-600 dark:!text-primary-100' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon != null && (
                <Icon className="w-4 h-4 shrink-0" aria-hidden stroke={1.5} />
              )}
              {label}
            </Link>
          )
        })}
      </nav>
      )}
    </header>
  )
}
