# Run this AFTER PostgreSQL is running (use Start-PostgreSQL.bat as Admin first)
# Creates tables and seeds cashier / kitchen users

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`nCreating database and tables..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nFailed. Is PostgreSQL running? Start it with: scripts\Start-PostgreSQL.bat (Run as Administrator)" -ForegroundColor Red
    exit 1
}

Write-Host "`nSeeding cashier and kitchen users..." -ForegroundColor Cyan
npx prisma db seed
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nDone. Login at POS with:  cashier  /  password123" -ForegroundColor Green
Write-Host ""
