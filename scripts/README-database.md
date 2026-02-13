# Start PostgreSQL and seed POS users

## Step 1: Start PostgreSQL

**Option A – Windows service (recommended)**  
1. Right-click `Start-PostgreSQL.bat`  
2. Choose **Run as administrator**  
3. Wait until it says "PostgreSQL started successfully"

**Option B – Services (if the batch file fails)**  
1. Press `Win + R`, type `services.msc`, Enter  
2. Find **postgresql-x64-18**  
3. Right-click → **Start**

**Option C – Docker**  
1. Start Docker Desktop  
2. In a terminal:  
   ```bash
   docker run -d --name pos-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=L@ruba1212 -e POSTGRES_DB=pos postgres:16
   ```

---

## Step 2: Create tables and seed users

In a normal terminal (no admin needed):

```powershell
cd c:\Users\User\Desktop\Hebrews
.\scripts\seed-database.ps1
```

Or manually:

```powershell
cd c:\Users\User\Desktop\Hebrews
npx prisma db push
npx prisma db seed
```

---

## Step 3: Log in to POS

- **URL:** POS Login page (e.g. `/pos/login`)  
- **Username:** `cashier`  
- **Password:** `password123`  

(Also available: `kitchen` / `password123`)
