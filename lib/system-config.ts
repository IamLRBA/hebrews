/**
 * Phase 10: Centralized system config (key-value).
 */

import { prisma } from '@/lib/db'

export const CONFIG_KEYS = {
  backupRetentionDays: 'backupRetentionDays',
  autoBackupEnabled: 'autoBackupEnabled',
  exportLimits: 'exportLimits',
  integrityCheckInterval: 'integrityCheckInterval',
} as const

export async function getConfigValue(key: string): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({
    where: { key },
    select: { value: true },
  })
  return row?.value ?? null
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: value.slice(0, 512) },
    update: { value: value.slice(0, 512) },
  })
}
