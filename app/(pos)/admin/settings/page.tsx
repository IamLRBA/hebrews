'use client'

import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'

export default function AdminSettingsPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <AdminNavHeader />
          <main>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Settings
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                System configuration and preferences
              </p>
            </div>

            <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">
                Settings panel - Configuration options to be implemented
              </p>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
