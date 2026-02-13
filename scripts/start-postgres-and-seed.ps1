# Start PostgreSQL, create DB/tables, and seed staff users
# Run this script in PowerShell. For "Start PostgreSQL" step, run PowerShell as Administrator.

$ErrorActionPreference = "Stop"

Write-Host "`n=== 1. Start PostgreSQL (Windows Service) ===" -ForegroundColor Cyan
Write-Host "If the service is stopped, run PowerShell AS ADMINISTRATOR and run:"
Write-Host "   Start-Service -Name 'postgresql-x64-18'" -ForegroundColor Yellow
Write-Host "Or from CMD (as Admin):"
Write-Host "   net start postgresql-x64-18" -ForegroundColor Yellow
Write-Host ""

$service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "PostgreSQL service is already running." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL is not running. Start it as Administrator (see above), then run this script again." -ForegroundColor Red
    Write-Host "Alternatively: start Docker Desktop and run: docker run -d --name pos-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=L@ruba1212 -e POSTGRES_DB=pos postgres:16" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== 2. Create database and tables (Prisma) ===" -ForegroundColor Cyan
Set-Location $PSScriptRoot\..

try {
    npx prisma db push
    if ($LASTEXITCODE -ne 0) { throw "prisma db push failed" }
    Write-Host "Database and tables ready." -ForegroundColor Green
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 3. Seed cashier and kitchen users ===" -ForegroundColor Cyan
try {
    npx prisma db seed
    if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed" }
    Write-Host "Seeded: cashier / password123  and  kitchen / password123" -ForegroundColor Green
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nDone. You can log in at POS Login with: cashier / password123" -ForegroundColor Green
Write-Host ""
