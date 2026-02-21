/**
 * Phase 10: System configuration (backup retention, etc.)
 */

import { prisma } from '@/lib/db'

const DEFAULTS: Record<string, string> = {
  backupRetentionDays: '30',
  autoBackupEnabled: 'false',
  exportLimitOrders: '10000',
  exportLimitPayments: '50000',
  integrityCheckIntervalMinutes: '60',
  cashVarianceThresholdUgx: '5000',
}

export async function getSystemConfig(key: string): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({
    where: { key },
    select: { value: true },
  })
  return row?.value ?? DEFAULTS[key] ?? null
}

export async function setSystemConfig(key: string, value: string): Promise<void> {
  const trimmed = value.slice(0, 512)
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: trimmed },
    update: { value: trimmed },
  })
}

export async function getBackupRetentionDays(): Promise<number> {
  const v = await getSystemConfig('backupRetentionDays')
  const n = parseInt(v ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 30
}
