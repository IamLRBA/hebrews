'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconLayoutDashboard,
  IconShoppingCart,
  IconCreditCard,
  IconClock,
  IconLogout,
} from '@tabler/icons-react'
import { clearStaffSession } from '@/lib/pos-client'
import { useRouter } from 'next/navigation'

const menuItems = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  { href: '/manager/orders', label: 'Orders', icon: IconShoppingCart },
  { href: '/manager/payments', label: 'Payments', icon: IconCreditCard },
  { href: '/manager/shifts', label: 'Shifts', icon: IconClock },
]

export function ManagerSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    clearStaffSession()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300">
          Manager Panel
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Cafe Havilah POS
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 w-full transition-colors"
        >
          <IconLogout className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
