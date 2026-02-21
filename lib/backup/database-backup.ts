/**
 * Phase 10: Database backup service.
 * Full backup via pg_dump; metadata stored in DatabaseBackup.
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { getBackupRetentionDays } from '@/lib/config/system-config'
import type { DatabaseBackupType, DatabaseBackupStatus } from '@prisma/client'

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const DEFAULT_RETENTION_DAYS = 30

function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
  return BACKUP_DIR
}

function parseDatabaseUrl(url: string): { host?: string; port?: string; user?: string; password?: string; dbname?: string } {
  try {
    const u = new URL(url)
    return {
      host: u.hostname || undefined,
      port: u.port || undefined,
      user: u.username || undefined,
      password: u.password || undefined,
      dbname: u.pathname?.slice(1) || undefined,
    }
  } catch {
    return {}
  }
}

function runPgDump(outPath: string): Promise<{ success: boolean; sizeBytes?: number; error?: string }> {
  return new Promise((resolve) => {
    const url = process.env.DATABASE_URL
    if (!url || !url.startsWith('postgres')) {
      resolve({ success: false, error: 'DATABASE_URL not set or not PostgreSQL' })
      return
    }
    const parsed = parseDatabaseUrl(url)
    const args = [
      '-F', 'p',
      '-f', outPath,
      ...(parsed.host ? ['-h', parsed.host] : []),
      ...(parsed.port ? ['-p', parsed.port] : []),
      ...(parsed.user ? ['-U', parsed.user] : []),
      ...(parsed.dbname ? [parsed.dbname] : []),
    ]
    const env = { ...process.env }
    if (parsed.password) env.PGPASSWORD = parsed.password

    const child = spawn('pg_dump', args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr?.on('data', (ch) => { stderr += ch.toString() })
    child.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({ success: false, error: stderr || `pg_dump exited ${code}` })
        return
      }
      try {
        const stat = fs.statSync(outPath)
        resolve({ success: true, sizeBytes: stat.size })
      } catch {
        resolve({ success: true })
      }
    })
  })
}

export interface BackupResult {
  id: string
  filename: string
  sizeBytes: number | null
  createdAt: Date
  type: DatabaseBackupType
  status: DatabaseBackupStatus
}

export async function runFullBackup(): Promise<BackupResult> {
  const dir = ensureBackupDir()
  const filename = `full-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
  const outPath = path.join(dir, filename)

  const record = await prisma.databaseBackup.create({
    data: {
      filename,
      type: 'FULL',
      status: 'FAILED',
    },
  })

  const result = await runPgDump(outPath)

  if (result.success) {
    await prisma.databaseBackup.update({
      where: { id: record.id },
      data: {
        status: 'SUCCESS',
        sizeBytes: result.sizeBytes != null ? BigInt(result.sizeBytes) : null,
      },
    })
    return {
      id: record.id,
      filename,
      sizeBytes: result.sizeBytes ?? null,
      createdAt: record.createdAt,
      type: 'FULL',
      status: 'SUCCESS',
    }
  }

  if (fs.existsSync(outPath)) try { fs.unlinkSync(outPath) } catch { /* ignore */ }
  return {
    id: record.id,
    filename,
    sizeBytes: null,
    createdAt: record.createdAt,
    type: 'FULL',
    status: 'FAILED',
  }
}

export async function runIncrementalBackup(): Promise<BackupResult> {
  const dir = ensureBackupDir()
  const filename = `incr-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
  const outPath = path.join(dir, filename)

  const record = await prisma.databaseBackup.create({
    data: {
      filename,
      type: 'INCREMENTAL',
      status: 'FAILED',
    },
  })

  const result = await runPgDump(outPath)

  if (result.success) {
    await prisma.databaseBackup.update({
      where: { id: record.id },
      data: {
        status: 'SUCCESS',
        sizeBytes: result.sizeBytes != null ? BigInt(result.sizeBytes) : null,
      },
    })
    return {
      id: record.id,
      filename,
      sizeBytes: result.sizeBytes ?? null,
      createdAt: record.createdAt,
      type: 'INCREMENTAL',
      status: 'SUCCESS',
    }
  }

  if (fs.existsSync(outPath)) try { fs.unlinkSync(outPath) } catch { /* ignore */ }
  return {
    id: record.id,
    filename,
    sizeBytes: null,
    createdAt: record.createdAt,
    type: 'INCREMENTAL',
    status: 'FAILED',
  }
}

export async function listBackups(params?: { limit?: number; type?: DatabaseBackupType }): Promise<BackupResult[]> {
  const limit = Math.min(params?.limit ?? 100, 500)
  const where = params?.type ? { type: params.type } : {}
  const rows = await prisma.databaseBackup.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    sizeBytes: r.sizeBytes != null ? Number(r.sizeBytes) : null,
    createdAt: r.createdAt,
    type: r.type,
    status: r.status,
  }))
}

export async function deleteOldBackups(): Promise<number> {
  const retentionDays = await getBackupRetentionDays()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const deleted = await prisma.databaseBackup.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  return deleted.count
}
