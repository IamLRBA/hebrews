/**
 * Production-safe storage paths. Defaults: /app/public/pos-images (products, tables), /app/backups.
 * Override with POS_UPLOAD_BASE or BACKUP_DIR. Creates directories if missing.
 */

import fs from 'fs'
import path from 'path'

const DEFAULT_UPLOAD_BASE = process.env.POS_UPLOAD_BASE ?? path.join(process.cwd(), 'public', 'pos-images')
const DEFAULT_BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), 'backups')

export const UPLOAD_PATHS = {
  products: path.join(DEFAULT_UPLOAD_BASE, 'products'),
  tables: path.join(DEFAULT_UPLOAD_BASE, 'tables'),
} as const

export function getBackupDir(): string {
  return DEFAULT_BACKUP_DIR
}

function ensureDir(dir: string): string {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return dir
  } catch {
    return dir
  }
}

export function ensureUploadDirs(): { products: string; tables: string } {
  return {
    products: ensureDir(UPLOAD_PATHS.products),
    tables: ensureDir(UPLOAD_PATHS.tables),
  }
}

export function ensureBackupDir(): string {
  return ensureDir(DEFAULT_BACKUP_DIR)
}
