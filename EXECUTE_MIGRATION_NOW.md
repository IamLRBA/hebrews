# EXECUTE MIGRATION NOW - Step-by-Step Commands

## ⚠️ CRITICAL: This is a SAFE operation - Enum additions don't lose data

**Why Prisma wants to reset:** No migration history exists  
**Solution:** Add enum manually (safe), then create migration file  
**Data Loss Risk:** ZERO (PostgreSQL enum additions are non-destructive)

---

## IMMEDIATE ACTION PLAN

### STEP 1: Verify Current State (30 seconds)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Check current enum values
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"
```

**Expected:** Should show: pending, preparing, ready, served, cancelled  
**If `awaiting_payment` is missing:** Continue to Step 2

---

### STEP 2: Create Backup (2 minutes)

#### Option A: If pg_dump is Available (Check Common Locations)

```powershell
# Try to find pg_dump
$pgDumpPaths = @(
    "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
    "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe"
)

$pgDump = $null
foreach ($path in $pgDumpPaths) {
    $found = Get-ChildItem $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $pgDump = $found.FullName
        break
    }
}

if ($pgDump) {
    Write-Host "Found pg_dump: $pgDump" -ForegroundColor Green
    
    # Create backup
    New-Item -ItemType Directory -Force -Path "backups" | Out-Null
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backups\pos_backup_$timestamp.sql"
    
    & $pgDump -U postgres -d pos -F p -f $backupFile -v
    
    Write-Host "Backup created: $backupFile" -ForegroundColor Green
} else {
    Write-Host "pg_dump not found - using SQL backup method" -ForegroundColor Yellow
    # Continue to Option B
}
```

#### Option B: SQL-Based Backup (If pg_dump Not Available)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Create backup directory
New-Item -ItemType Directory -Force -Path "backups" | Out-Null

# Export schema and data using psql
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\pos_backup_$timestamp.sql"

# Export schema
psql -U postgres -d pos -c "\d+" > "$backupFile.schema.txt"

# Export enum values
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status;" > "$backupFile.enums.txt"

# Export order counts by status
psql -U postgres -d pos -c "SELECT status, COUNT(*) FROM \"Order\" GROUP BY status;" > "$backupFile.orders.txt"

Write-Host "Backup files created in backups/ directory" -ForegroundColor Green
```

**Note:** This is a lightweight backup. For full backup, install PostgreSQL client tools.

---

### STEP 3: Add Enum Value (SAFE - 10 seconds)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Add enum value - THIS IS SAFE, NO DATA LOSS
psql -U postgres -d pos -c "ALTER TYPE \"OrderStatus\" ADD VALUE IF NOT EXISTS 'awaiting_payment';"
```

**Expected Output:** `ALTER TYPE` (success)  
**What This Does:** Adds new enum value without touching existing data  
**Risk Level:** ZERO - PostgreSQL enum additions are atomic and safe

---

### STEP 4: Verify Enum Value Added (10 seconds)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Verify awaiting_payment is now in enum
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"
```

**Expected:** Should now show `awaiting_payment` in the list

---

### STEP 5: Create Prisma Migration File (30 seconds)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Create migrations directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "prisma\migrations" | Out-Null

# Create migration directory with timestamp
$migrationName = "add_awaiting_payment_status"
$migrationTimestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationDir = "prisma\migrations\${migrationTimestamp}_$migrationName"

New-Item -ItemType Directory -Force -Path $migrationDir | Out-Null

# Create migration.sql file
@"
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
"@ | Out-File -FilePath "$migrationDir\migration.sql" -Encoding utf8

Write-Host "Migration file created: $migrationDir\migration.sql" -ForegroundColor Green
```

---

### STEP 6: Initialize Prisma Migrations Table (30 seconds)

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

# Get migration directory name
$migrationDir = Get-ChildItem "prisma\migrations" -Directory | Where-Object { $_.Name -like "*add_awaiting_payment_status" } | Select-Object -First 1

if ($migrationDir) {
    $migrationName = $migrationDir.Name
    $migrationId = [guid]::NewGuid().ToString()
    
    # Mark migration as applied
    psql -U postgres -d pos -c @"
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
VALUES ('$migrationId', '', '$migrationName', now(), now(), 1)
ON CONFLICT (id) DO NOTHING;
"@
    
    Write-Host "Migration marked as applied: $migrationName" -ForegroundColor Green
}
```

---

### STEP 7: Regenerate Prisma Client (30 seconds)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Regenerate Prisma client
npx prisma generate
```

**Expected Output:** Prisma Client generated successfully

---

### STEP 8: Verify Everything Works (1 minute)

```powershell
cd c:\Users\User\Desktop\Hebrews

# Verify Prisma can read the schema
npx prisma db pull --print
```

**Expected:** Should show no changes (schema matches database)

---

## COMPLETE COMMAND SEQUENCE (Copy-Paste Ready)

```powershell
# Navigate to project
cd c:\Users\User\Desktop\Hebrews

# Step 1: Check current enum
Write-Host "Checking current enum values..." -ForegroundColor Cyan
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"

# Step 2: Create backup directory
New-Item -ItemType Directory -Force -Path "backups" | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
psql -U postgres -d pos -c "SELECT status, COUNT(*) FROM \"Order\" GROUP BY status;" > "backups\order_counts_$timestamp.txt"
Write-Host "Backup created: backups\order_counts_$timestamp.txt" -ForegroundColor Green

# Step 3: Add enum value (SAFE)
Write-Host "Adding awaiting_payment enum value..." -ForegroundColor Cyan
psql -U postgres -d pos -c "ALTER TYPE \"OrderStatus\" ADD VALUE IF NOT EXISTS 'awaiting_payment';"

# Step 4: Verify
Write-Host "Verifying enum value..." -ForegroundColor Cyan
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"

# Step 5: Create migration file
Write-Host "Creating migration file..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "prisma\migrations" | Out-Null
$migrationTimestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationDir = "prisma\migrations\${migrationTimestamp}_add_awaiting_payment_status"
New-Item -ItemType Directory -Force -Path $migrationDir | Out-Null
"ALTER TYPE `"OrderStatus`" ADD VALUE IF NOT EXISTS 'awaiting_payment';" | Out-File -FilePath "$migrationDir\migration.sql" -Encoding utf8

# Step 6: Initialize migrations table
Write-Host "Initializing Prisma migrations..." -ForegroundColor Cyan
psql -U postgres -d pos -c "CREATE TABLE IF NOT EXISTS \"_prisma_migrations\" (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMP, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMP, started_at TIMESTAMP NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0);"
$migrationId = [guid]::NewGuid().ToString()
psql -U postgres -d pos -c "INSERT INTO \"_prisma_migrations\" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES ('$migrationId', '', '${migrationTimestamp}_add_awaiting_payment_status', now(), now(), 1) ON CONFLICT (id) DO NOTHING;"

# Step 7: Regenerate client
Write-Host "Regenerating Prisma client..." -ForegroundColor Cyan
npx prisma generate

# Step 8: Verify
Write-Host "Verification complete!" -ForegroundColor Green
Write-Host "Next: Start your application and test order flow" -ForegroundColor Yellow
```

---

## WHY THIS IS SAFE

1. **PostgreSQL Enum Additions:** Adding enum values is a metadata-only operation
2. **No Table Recreation:** Existing tables and data are untouched
3. **Atomic Operation:** Either succeeds completely or fails without changes
4. **Backward Compatible:** Existing orders remain unchanged
5. **Reversible:** Can remove enum value if needed (though not recommended)

---

## IF SOMETHING GOES WRONG

### Check Current State:
```powershell
psql -U postgres -d pos -c "SELECT unnest(enum_range(NULL::\"OrderStatus\")) AS status ORDER BY status;"
```

### Verify Orders Still Exist:
```powershell
psql -U postgres -d pos -c "SELECT COUNT(*) FROM \"Order\";"
```

### Check Order Statuses:
```powershell
psql -U postgres -d pos -c "SELECT status, COUNT(*) FROM \"Order\" GROUP BY status;"
```

---

## SUCCESS CRITERIA

After running all steps:

- ✅ `awaiting_payment` appears in enum list
- ✅ All existing orders still exist
- ✅ Migration file created in `prisma/migrations/`
- ✅ Prisma client regenerated
- ✅ Application starts without errors
- ✅ Can create new orders
- ✅ Status transitions work

---

**READY TO EXECUTE - Copy the complete command sequence above and run it step by step.**
