# SAFE MIGRATION PLAN - Add awaiting_payment Enum Value

## ⚠️ CRITICAL: Production Database - Data Preservation Required

**Database:** PostgreSQL at localhost:5432  
**Database Name:** pos  
**Schema:** public  
**Risk Level:** HIGH - Real POS data must be preserved

---

## STEP 1: Verify Current Database State

### 1.1 Check Current Enum Values

```powershell
cd c:\Users\User\Desktop\Hebrews
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status;"
```

**Expected Output:** Should show: pending, preparing, ready, served, cancelled  
**If `awaiting_payment` is missing:** Proceed with migration

### 1.2 Check for Existing Orders

```powershell
psql -U postgres -d pos -c "SELECT status, COUNT(*) FROM \"Order\" GROUP BY status;"
```

**Purpose:** Verify data exists and current status distribution

---

## STEP 2: Create Full Database Backup (MANDATORY)

### 2.1 Check if pg_dump is Available

```powershell
where.exe pg_dump
```

**If NOT found:** Install PostgreSQL client tools (see Step 2.2)  
**If found:** Proceed to Step 2.3

### 2.2 Install PostgreSQL Client Tools (If Needed)

**Option A: Full PostgreSQL Installation**
- Download: https://www.postgresql.org/download/windows/
- Install PostgreSQL (includes pg_dump)
- Add to PATH: `C:\Program Files\PostgreSQL\<version>\bin`

**Option B: Standalone Client Tools**
- Download: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- Install "Command Line Tools" only

**Verify Installation:**
```powershell
pg_dump --version
```

### 2.3 Create Full Database Backup

```powershell
cd c:\Users\User\Desktop\Hebrews

# Create backup directory
New-Item -ItemType Directory -Force -Path "backups" | Out-Null

# Create timestamped backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\pos_backup_$timestamp.sql"

# Full database backup (includes schema + data)
pg_dump -U postgres -d pos -F p -f $backupFile -v

# Verify backup file exists and has content
if (Test-Path $backupFile) {
    $size = (Get-Item $backupFile).Length
    Write-Host "Backup created: $backupFile ($([math]::Round($size/1MB, 2)) MB)"
} else {
    Write-Host "ERROR: Backup file not created!" -ForegroundColor Red
    exit 1
}
```

**Expected Output:** Backup file created in `backups/` directory  
**File Size:** Should be > 0 bytes (depends on data volume)

### 2.4 Verify Backup Integrity

```powershell
# Check backup file contains data
$backupFile = Get-ChildItem "backups\pos_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-Content $backupFile.FullName | Select-String -Pattern "CREATE TABLE|INSERT INTO" | Measure-Object | Select-Object -ExpandProperty Count
```

**Expected:** Should show table creation and data insertion statements

---

## STEP 3: Manual Enum Addition (NON-DESTRUCTIVE)

### 3.1 Add Enum Value Using SQL

**This is SAFE - PostgreSQL allows adding enum values without data loss.**

```powershell
cd c:\Users\User\Desktop\Hebrews

# Connect to database and add enum value
psql -U postgres -d pos -c "ALTER TYPE \"OrderStatus\" ADD VALUE IF NOT EXISTS 'awaiting_payment';"
```

**Expected Output:** `ALTER TYPE` (no errors)

**Why This is Safe:**
- PostgreSQL enum additions are non-destructive
- Existing data remains unchanged
- No table recreation required
- No data loss risk

### 3.2 Verify Enum Value Added

```powershell
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"
```

**Expected Output:** Should now include `awaiting_payment` in the list

---

## STEP 4: Create Prisma Migration (Track the Change)

### 4.1 Initialize Migrations (If Not Already Done)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Create migrations directory structure
New-Item -ItemType Directory -Force -Path "prisma\migrations" | Out-Null

# Create initial migration baseline (if needed)
# This tells Prisma the current state matches the schema
```

### 4.2 Create Migration File Manually

```powershell
cd c:\Users\User\Desktop\Hebrews

# Create migration directory with timestamp
$migrationName = "add_awaiting_payment_status"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationDir = "prisma\migrations\${timestamp}_$migrationName"

New-Item -ItemType Directory -Force -Path $migrationDir | Out-Null

# Create migration.sql file
$migrationSQL = @"
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
"@

$migrationSQL | Out-File -FilePath "$migrationDir\migration.sql" -Encoding utf8

Write-Host "Migration file created: $migrationDir\migration.sql"
```

### 4.3 Mark Migration as Applied

Since we already applied the SQL manually, we need to tell Prisma it's done:

```powershell
cd c:\Users\User\Desktop\Hebrews

# Create _prisma_migrations table if it doesn't exist
psql -U postgres -d pos -c @"
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
"@

# Get the migration directory name
$migrationDir = Get-ChildItem "prisma\migrations" -Directory | Where-Object { $_.Name -like "*add_awaiting_payment_status" } | Select-Object -First 1

if ($migrationDir) {
    $migrationName = $migrationDir.Name
    $migrationId = [guid]::NewGuid().ToString()
    
    # Insert migration record
    psql -U postgres -d pos -c @"
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
VALUES ('$migrationId', '', '$migrationName', now(), now(), 1)
ON CONFLICT (id) DO NOTHING;
"@
    
    Write-Host "Migration marked as applied: $migrationName"
}
```

---

## STEP 5: Regenerate Prisma Client

```powershell
cd c:\Users\User\Desktop\Hebrews

# Regenerate Prisma client to include new enum value
npx prisma generate
```

**Expected Output:** Prisma Client generated successfully

---

## STEP 6: Verify Everything Works

### 6.1 Verify Prisma Schema Matches Database

```powershell
cd c:\Users\User\Desktop\Hebrews

# Check Prisma can connect and read schema
npx prisma db pull --print
```

**Expected:** Should show schema matches (no changes detected)

### 6.2 Test Application

1. Start your application
2. Create a test order
3. Verify status transitions work
4. Check that `awaiting_payment` status can be set

---

## ALTERNATIVE: If Manual SQL Fails

### Option B: Use Prisma Migrate Resolve (If Migration Already Created)

If Prisma created a migration file before you stopped it:

```powershell
cd c:\Users\User\Desktop\Hebrews

# 1. Apply the SQL manually first (from Step 3.1)
psql -U postgres -d pos -c "ALTER TYPE \"OrderStatus\" ADD VALUE IF NOT EXISTS 'awaiting_payment';"

# 2. Mark migration as applied
npx prisma migrate resolve --applied add_awaiting_payment_status

# 3. Regenerate client
npx prisma generate
```

---

## ROLLBACK PLAN (If Something Goes Wrong)

### Restore from Backup

```powershell
cd c:\Users\User\Desktop\Hebrews

# Find latest backup
$backupFile = Get-ChildItem "backups\pos_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($backupFile) {
    Write-Host "Restoring from: $($backupFile.Name)" -ForegroundColor Yellow
    
    # Drop and recreate database (DESTRUCTIVE - only if needed)
    psql -U postgres -c "DROP DATABASE IF EXISTS pos;"
    psql -U postgres -c "CREATE DATABASE pos;"
    
    # Restore backup
    psql -U postgres -d pos -f $backupFile.FullName
    
    Write-Host "Database restored from backup" -ForegroundColor Green
} else {
    Write-Host "ERROR: No backup file found!" -ForegroundColor Red
}
```

---

## QUICK REFERENCE: All Commands in Order

```powershell
# 1. Navigate to project
cd c:\Users\User\Desktop\Hebrews

# 2. Check current enum (verify awaiting_payment missing)
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status;"

# 3. Create backup
New-Item -ItemType Directory -Force -Path "backups" | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -U postgres -d pos -F p -f "backups\pos_backup_$timestamp.sql" -v

# 4. Add enum value (SAFE - non-destructive)
psql -U postgres -d pos -c "ALTER TYPE \"OrderStatus\" ADD VALUE IF NOT EXISTS 'awaiting_payment';"

# 5. Verify enum value added
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"

# 6. Create migration file manually
$migrationName = "add_awaiting_payment_status"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationDir = "prisma\migrations\${timestamp}_$migrationName"
New-Item -ItemType Directory -Force -Path $migrationDir | Out-Null
"ALTER TYPE `"OrderStatus`" ADD VALUE IF NOT EXISTS 'awaiting_payment';" | Out-File -FilePath "$migrationDir\migration.sql" -Encoding utf8

# 7. Regenerate Prisma client
npx prisma generate

# 8. Verify
npx prisma db pull --print
```

---

## VERIFICATION CHECKLIST

After completing all steps:

- [ ] Backup file created and verified
- [ ] Enum value `awaiting_payment` exists in database
- [ ] Migration file created in `prisma/migrations/`
- [ ] Prisma client regenerated
- [ ] Application starts without errors
- [ ] Can create orders
- [ ] Status transitions work correctly
- [ ] `awaiting_payment` status displays in UI

---

## WHY PRISMA WANTED TO RESET

**Root Cause:** No migrations directory exists, so Prisma has no migration history. When it sees the schema doesn't match the database, it assumes the database is out of sync and wants to recreate it.

**Solution:** We manually add the enum value (safe), then create a migration file to track it, so Prisma knows the state.

---

**END OF SAFE MIGRATION PLAN**
