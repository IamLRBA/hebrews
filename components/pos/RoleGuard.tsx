'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getStaffId, getStaffRole, posFetch } from '@/lib/pos-client'

type Role = 'admin' | 'manager' | 'cashier' | 'kitchen'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: Role[]
  redirectTo?: string
}

export function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const staffId = getStaffId()
      const role = getStaffRole() as Role | null

      if (!staffId || !role) {
        router.replace('/login')
        return
      }

      // Verify role with server
      try {
        const res = await posFetch('/api/auth/me')
        if (!res.ok) {
          router.replace('/login')
          return
        }
        const data = await res.json()
        const serverRole = data.role as Role

        if (!allowedRoles.includes(serverRole)) {
          // Redirect based on role
          const defaultRedirect = redirectTo || getDefaultRedirect(serverRole)
          router.replace(defaultRedirect)
          return
        }

        setAuthorized(true)
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router, allowedRoles, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}

function getDefaultRedirect(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'manager':
      return '/manager/dashboard'
    case 'kitchen':
      return '/kitchen'
    case 'cashier':
    default:
      return '/pos/start'
  }
}
