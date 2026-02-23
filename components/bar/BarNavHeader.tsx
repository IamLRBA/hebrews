'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconClock,
  IconClockFilled,
  IconGlassFull,
} from '@tabler/icons-react'
import CafeHavilahWord from '@/components/ui/CafeHavilahWord'
import SettingsDropdown from '@/components/ui/SettingsDropdown'
import { posFetch } from '@/lib/pos-client'

const NAV_ITEMS = [
  { href: '/bar', label: 'Pending', iconOutline: IconClock, iconFilled: IconClockFilled, requiresShiftId: false, countKey: 'pending' as const },
  { href: '/bar/preparing', label: 'Preparing', iconOutline: IconGlassFull, iconFilled: IconGlassFull, requiresShiftId: true },
] as const

const COUNT_POLL_MS = 30000

export function BarNavHeader({ shiftId }: { shiftId?: string }) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await posFetch('/api/bar/pending-count')
        if (res.ok) {
          const data = await res.json()
          setPendingCount(typeof data?.count === 'number' ? data.count : 0)
        }
      } catch {
        setPendingCount(0)
      }
    }
    fetchPendingCount()
    const t = setInterval(fetchPendingCount, COUNT_POLL_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="pos-dashboard-header flex flex-col gap-4 mb-6 pos-dashboard-header-sticky">
      <div className="flex flex-row items-center justify-between gap-3">
        <Link
          href="/bar"
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
          <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Bar Display</span>
          <SettingsDropdown />
        </div>
      </div>
      <nav className="pos-dashboard-nav" aria-label="Bar sections">
        {NAV_ITEMS.map(({ href, label, iconOutline, iconFilled, requiresShiftId, countKey }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/') || (href === '/bar' && shiftId && pathname === `/bar/${shiftId}`)
          const Icon = isActive ? iconFilled : iconOutline
          const count = countKey === 'pending' ? pendingCount : 0
          const finalHref = href === '/bar' && shiftId ? `/bar/${shiftId}` : requiresShiftId && shiftId ? `${href}?shiftId=${shiftId}` : href
          return (
            <Link
              key={href}
              href={finalHref}
              className={`pos-dashboard-nav-link relative ${isActive ? '!bg-primary-100 !border-primary-300 !text-primary-800 dark:!bg-primary-800 dark:!border-primary-600 dark:!text-primary-100' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={count > 0 ? `${label} (${count} orders)` : label}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden stroke={1.5} />
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
    </header>
  )
}
