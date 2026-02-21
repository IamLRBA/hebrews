'use client'

import { useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { exportOfflineDataJSON, exportOfflineDataCSV } from '@/lib/offline/export'

export default function AdminSettingsPage() {
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [integrityReport, setIntegrityReport] = useState<{ ok: boolean; critical: number; warning: number } | null>(null)
  const [offlineExportStatus, setOfflineExportStatus] = useState<string | null>(null)

  async function handleBackupNow() {
    setBackupStatus('Running…')
    try {
      const res = await posFetch('/api/admin/backup/run', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBackupStatus(data.error || 'Backup failed')
        return
      }
      setBackupStatus(`Backup created: ${data.filename}`)
    } catch (e) {
      setBackupStatus(e instanceof Error ? e.message : 'Backup failed')
    }
  }

  async function handleIntegrityCheck() {
    try {
      const res = await posFetch('/api/admin/integrity-report')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setIntegrityReport({ ok: false, critical: 0, warning: 0 })
        return
      }
      const critical = Array.isArray(data.critical) ? data.critical.length : (data.critical ?? 0)
      const warning = Array.isArray(data.warning) ? data.warning.length : (data.warning ?? 0)
      setIntegrityReport({ ok: critical === 0, critical, warning })
    } catch {
      setIntegrityReport({ ok: false, critical: 0, warning: 0 })
    }
  }

  async function downloadExport(path: string, filename: string) {
    const res = await posFetch(path)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportOfflineData(format: 'json' | 'csv') {
    setOfflineExportStatus('Exporting…')
    try {
      const content = format === 'json' ? await exportOfflineDataJSON() : await exportOfflineDataCSV()
      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `offline-export-${new Date().toISOString().slice(0, 10)}.${format === 'json' ? 'json' : 'csv'}`
      a.click()
      URL.revokeObjectURL(url)
      setOfflineExportStatus('Downloaded')
    } catch (e) {
      setOfflineExportStatus(e instanceof Error ? e.message : 'Export failed')
    }
  }

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

            <div className="space-y-6">
              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Backup &amp; Recovery
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                  Run a full database backup now. Backups are stored on the server (see BACKUP_DIR).
                </p>
                <button
                  type="button"
                  onClick={handleBackupNow}
                  className="btn btn-primary py-2 px-4"
                >
                  Backup Now
                </button>
                {backupStatus && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{backupStatus}</p>
                )}
              </div>

              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Data Export
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                  Export orders, payments, or full snapshot (CSV/JSON) for accountants or auditors.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn btn-outline py-2 px-4"
                    onClick={() => downloadExport('/api/admin/export/orders', `orders-${new Date().toISOString().slice(0, 10)}.csv`)}
                  >
                    Orders (CSV)
                  </button>
                  <button
                  type="button"
                  className="btn btn-outline py-2 px-4"
                  onClick={() => downloadExport('/api/admin/export/payments', `payments-${new Date().toISOString().slice(0, 10)}.csv`)}
                >
                  Payments (CSV)
                </button>
                  <button
                    type="button"
                    className="btn btn-outline py-2 px-4"
                    onClick={() => downloadExport('/api/admin/export/full', `pos-full-${new Date().toISOString().slice(0, 10)}.json`)}
                  >
                    Full snapshot (JSON)
                  </button>
                </div>
              </div>

              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Export Offline Data
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                  Download this device&apos;s offline data (orders, items, payments, mutation queue) in case the device is lost before sync.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn btn-outline py-2 px-4"
                    onClick={() => handleExportOfflineData('json')}
                  >
                    Export as JSON
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline py-2 px-4"
                    onClick={() => handleExportOfflineData('csv')}
                  >
                    Export as CSV
                  </button>
                </div>
                {offlineExportStatus && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{offlineExportStatus}</p>
                )}
              </div>

              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                  Integrity Report
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                  Check for data inconsistencies (e.g. orders served without payment, orphan records).
                </p>
                <button
                  type="button"
                  onClick={handleIntegrityCheck}
                  className="btn btn-outline py-2 px-4"
                >
                  Run integrity check
                </button>
                {integrityReport && (
                  <p className="mt-2 text-sm">
                    {integrityReport.ok ? (
                      <span className="text-green-600 dark:text-green-400">No critical issues.</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Critical: {integrityReport.critical}, Warning: {integrityReport.warning}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800">
                <p className="text-neutral-500 dark:text-neutral-400">
                  Additional configuration options can be added here.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
