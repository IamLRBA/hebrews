@echo off
REM Right-click this file and choose "Run as administrator"
echo Starting PostgreSQL service (postgresql-x64-18)...
net start postgresql-x64-18
if %errorlevel% equ 0 (
    echo.
    echo PostgreSQL started successfully.
    echo Now run in a normal terminal:  cd scripts  then  .\seed-database.ps1
) else (
    echo.
    echo Failed to start. Make sure you ran this as Administrator.
    echo Or start the service from: Services ^(services.msc^) - find "postgresql-x64-18"
    pause
)
