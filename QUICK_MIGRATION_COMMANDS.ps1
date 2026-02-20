# Quick Migration Script - Add awaiting_payment Enum Value
# Run this script step by step, verifying each step before proceeding

Write-Host "=== SAFE MIGRATION: Add awaiting_payment Enum Value ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current enum values
Write-Host "Step 1: Checking current enum values..." -ForegroundColor Yellow
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::`"OrderStatus`")) AS status ORDER BY status;"
Write-Host ""

# Step 2: Create backup
Write-Host "Step 2: Creating database backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "backups" | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\pos_backup_$timestamp.sql"
pg_dump -U postgres -d pos -F p -f $backupFile -v
if (Test-Path $backupFile) {
    $size = (Get-Item $backupFile).Length
    Write-Host "✓ Backup created: $backupFile ($([math]::Round($size/1MB, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "✗ ERROR: Backup failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Add enum value (SAFE - non-destructive)
Write-Host "Step 3: Adding awaiting_payment enum value..." -ForegroundColor Yellow
psql -U postgres -d pos -c "ALTER TYPE `"OrderStatus`" ADD VALUE IF NOT EXISTS 'awaiting_payment';"
Write-Host "✓ Enum value added" -ForegroundColor Green
Write-Host ""

# Step 4: Verify enum value
Write-Host "Step 4: Verifying enum value..." -ForegroundColor Yellow
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::`"OrderStatus`")) AS status ORDER BY status;"
Write-Host ""

# Step 5: Create migration file
Write-Host "Step 5: Creating Prisma migration file..." -ForegroundColor Yellow
$migrationName = "add_awaiting_payment_status"
$migrationTimestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationDir = "prisma\migrations\${migrationTimestamp}_$migrationName"
New-Item -ItemType Directory -Force -Path $migrationDir | Out-Null
@"
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
"@ | Out-File -FilePath "$migrationDir\migration.sql" -Encoding utf8
Write-Host "✓ Migration file created: $migrationDir\migration.sql" -ForegroundColor Green
Write-Host ""

# Step 6: Regenerate Prisma client
Write-Host "Step 6: Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✓ Prisma client regenerated" -ForegroundColor Green
Write-Host ""

Write-Host "=== MIGRATION COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify application starts: npm run dev"
Write-Host "2. Test order flow: Create order → Kitchen marks ready → Verify awaiting_payment status"
Write-Host "3. Test payment: Process payment → Verify served status"
Write-Host ""
Write-Host "Backup location: $backupFile" -ForegroundColor Yellow
