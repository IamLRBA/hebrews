'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href: string
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on homepage
  if (pathname === '/') return null

  const pathSegments = pathname.split('/').filter(Boolean)
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/')
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return { label, href }
    }),
  ]

  return (
    <nav aria-label="Breadcrumb" className="container-custom py-4">
      <ol className="flex items-center space-x-2 text-sm text-primary-600 dark:text-primary-300">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          
          return (
            <li key={crumb.href} className="flex items-center">
              {index === 0 ? (
                <Link
                  href={crumb.href}
                  className="flex items-center hover:text-primary-800 dark:hover:text-primary-100 transition-colors"
                  aria-label="Home"
                >
                  <Home className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mx-2 text-primary-400" />
                  {isLast ? (
                    <span className="font-medium text-primary-800 dark:text-primary-100" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-primary-800 dark:hover:text-primary-100 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

