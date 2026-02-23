'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconShoppingCart,
  IconShoppingCartFilled,
  IconLayoutList,
  IconLayoutListFilled,
  IconClock,
  IconClockFilled,
  IconClipboardList,
  IconClipboardListFilled,
} from '@tabler/icons-react'
import CafeHavilahWord from '@/components/ui/CafeHavilahWord'
import SettingsDropdown from '@/components/ui/SettingsDropdown'
import { posFetch } from '@/lib/pos-client'

const NAV_ITEMS = [
  { href: '/pos', label: 'All', iconOutline: null, iconFilled: null },
  { href: '/pos/tables', label: 'Tables', iconOutline: IconLayoutGrid, iconFilled: IconLayoutGridFilled },
  { href: '/pos/order', label: 'Order', iconOutline: IconShoppingCart, iconFilled: IconShoppingCartFilled },
  { href: '/pos/orders', label: 'Orders', iconOutline: IconLayoutList, iconFilled: IconLayoutListFilled },
  { href: '/pos/ready', label: 'Ready', iconOutline: IconClock, iconFilled: IconClockFilled, countKey: 'ready' as const },
  { href: '/pos/shift', label: 'Shift', iconOutline: IconClipboardList, iconFilled: IconClipboardListFilled },
] as const

const COUNT_POLL_MS = 30000

export function PosNavHeader({ hideNav }: { hideNav?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [readyCount, setReadyCount] = useState(0)
  const isOrderDetail = /^\/pos\/orders\/[^/]+$/.test(pathname) && pathname !== '/pos/orders'
  const isPaymentPage = /^\/pos\/payment\/[^/]+$/.test(pathname)
  const showBackToHistory = (isOrderDetail && !pathname.includes('/receipt')) || isPaymentPage

  useEffect(() => {
    if (hideNav) return
    const fetchReadyCount = async () => {
      try {
        const res = await posFetch('/api/pos/ready-orders/count')
        if (res.ok) {
          const data = await res.json()
          setReadyCount(typeof data?.count === 'number' ? data.count : 0)
        }
      } catch {
        setReadyCount(0)
      }
    }
    fetchReadyCount()
    const t = setInterval(fetchReadyCount, COUNT_POLL_MS)
    return () => clearInterval(t)
  }, [hideNav])

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
        {NAV_ITEMS.map(({ href, label, iconOutline, iconFilled, countKey }) => {
          const isActive =
            href === '/pos'
              ? pathname === '/pos'
              : href === '/pos/order'
                ? pathname === '/pos/order'
                : pathname === href || pathname.startsWith(href + '/')
          const Icon = isActive ? iconFilled : iconOutline
          const count = countKey === 'ready' ? readyCount : 0
          return (
            <Link
              key={href}
              href={href}
              className={`pos-dashboard-nav-link relative ${isActive ? '!bg-primary-100 !border-primary-300 !text-primary-800 dark:!bg-primary-800 dark:!border-primary-600 dark:!text-primary-100' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={count > 0 ? `${label} (${count} orders)` : label}
            >
              {Icon != null && (
                <Icon className="w-4 h-4 shrink-0" aria-hidden stroke={1.5} />
              )}
              {label}
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-primary-600 dark:bg-primary-500 text-white text-xs font-bold">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      )}
    </header>
  )
}
