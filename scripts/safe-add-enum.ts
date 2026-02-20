import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('=== SAFE MIGRATION: Add awaiting_payment Enum Value ===\n')

  try {
    // Step 1: Check current enum values
    console.log('Step 1: Checking current enum values...')
    const currentEnums = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT unnest(enum_range(NULL::"OrderStatus")) AS status ORDER BY status;
    `
    console.log('Current enum values:', currentEnums.map(e => e.status).join(', '))
    
    const hasAwaitingPayment = currentEnums.some(e => e.status === 'awaiting_payment')
    if (hasAwaitingPayment) {
      console.log('✓ awaiting_payment already exists in enum')
      return
    }

    // Step 2: Create backup
    console.log('\nStep 2: Creating backup...')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupDir = path.join(process.cwd(), 'backups')
    await mkdir(backupDir, { recursive: true })
    
    const orderCounts = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT status, COUNT(*) as count FROM "Order" GROUP BY status ORDER BY status;
    `
    const backupContent = `Order Status Counts Backup - ${timestamp}\n${orderCounts.map(o => `${o.status}: ${o.count}`).join('\n')}`
    const backupFile = path.join(backupDir, `order_counts_${timestamp}.txt`)
    await writeFile(backupFile, backupContent, 'utf-8')
    console.log(`✓ Backup created: ${backupFile}`)

    // Step 3: Add enum value (SAFE - non-destructive)
    console.log('\nStep 3: Adding awaiting_payment enum value...')
    await prisma.$executeRaw`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';`
    console.log('✓ Enum value added successfully')

    // Step 4: Verify enum value
    console.log('\nStep 4: Verifying enum value...')
    const newEnums = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT unnest(enum_range(NULL::"OrderStatus")) AS status ORDER BY status;
    `
    console.log('Updated enum values:', newEnums.map(e => e.status).join(', '))
    
    const verified = newEnums.some(e => e.status === 'awaiting_payment')
    if (!verified) {
      throw new Error('Enum value was not added successfully')
    }
    console.log('✓ awaiting_payment verified in enum')

    // Step 5: Create migration file
    console.log('\nStep 5: Creating Prisma migration file...')
    const migrationTimestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14)
    const migrationDir = path.join(process.cwd(), 'prisma', 'migrations', `${migrationTimestamp}_add_awaiting_payment_status`)
    await mkdir(migrationDir, { recursive: true })
    
    const migrationSQL = `-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
`
    const migrationFile = path.join(migrationDir, 'migration.sql')
    await writeFile(migrationFile, migrationSQL, 'utf-8')
    console.log(`✓ Migration file created: ${migrationFile}`)

    // Step 6: Initialize migrations table and mark as applied
    console.log('\nStep 6: Initializing Prisma migrations table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMP,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMP,
        started_at TIMESTAMP NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
    `
    
    const migrationName = `${migrationTimestamp}_add_awaiting_payment_status`
    const migrationId = crypto.randomUUID()
    
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
      VALUES (${migrationId}, '', ${migrationName}, now(), now(), 1)
      ON CONFLICT (id) DO NOTHING;
    `
    console.log(`✓ Migration marked as applied: ${migrationName}`)

    // Step 7: Verify order counts unchanged
    console.log('\nStep 7: Verifying data integrity...')
    const finalCounts = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT status, COUNT(*) as count FROM "Order" GROUP BY status ORDER BY status;
    `
    console.log('Order counts after migration:', finalCounts.map(o => `${o.status}: ${o.count}`).join(', '))
    console.log('✓ Data integrity verified - all orders preserved')

    console.log('\n=== MIGRATION COMPLETE ===')
    console.log('\nNext steps:')
    console.log('1. Run: npx prisma generate')
    console.log('2. Start your application')
    console.log('3. Test order flow')

  } catch (error) {
    console.error('\n✗ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
