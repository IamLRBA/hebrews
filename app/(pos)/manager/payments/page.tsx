'use client'

import { RoleGuard } from '@/components/pos/RoleGuard'
import { ManagerNavHeader } from '@/components/manager/ManagerNavHeader'
import { CreditCard } from 'lucide-react'

export default function ManagerPaymentsPage() {
  return (
    <RoleGuard allowedRoles={['manager']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <ManagerNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Payment Overview
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                View payment summaries and transactions
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">
                Payment overview - Implementation in progress
              </p>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
