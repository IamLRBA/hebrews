# Supabase + Prisma: Interactive Setup Guide (Cafe Havilah POS)

Use this guide step by step. Pause after each step and confirm before moving on.

---

## Step 1: Ensure you have a Supabase account

1. Go to **[supabase.com](https://supabase.com)**.
2. Click **Start your project** (or **Sign in** if you already have an account).
3. Sign up with GitHub, GitLab, or email.

**Confirm:** I have a Supabase account and am logged in.  
*(Reply "done" or "step 1 done" before going to Step 2.)*

---

## Step 2: Create a new Supabase project

1. In the dashboard, click **New project**.
2. **Organization:** Keep default (or create one if prompted).
3. **Name:** `cafe-havilah-pos`
4. **Database password:** Choose a **strong password** and **save it** in a secure place (password manager or secure note). You will need it for `DATABASE_URL`.
5. **Region:** Pick one close to where you’ll run the app (e.g. **East US (N. Virginia)** or **eu-west-1 (Ireland)** if using Koyeb in EU).
6. Click **Create new project** and wait 1–2 minutes until the project is ready.

**Confirm:** My project is created and I have saved the database password.  
*(Reply "done" or "step 2 done". If you already created the project earlier, reply "already done".)*

---

## Step 3: Get the direct connection (port 5432) and PROJECT-REF

1. In your Supabase project, open **Project Settings** (gear icon in the left sidebar).
2. Go to **Database**.
3. Under **Connection string**, select the **URI** tab.
4. Choose **Session** (or **Direct**) connection — this uses **port 5432**.  
   Do **not** use the Transaction pooler (port 6543) for migrations.
5. Note the **host**: it should look like `db.XXXXXXXXXX.supabase.co`. The `XXXXXXXXXX` part is your **PROJECT-REF**.
6. Copy or note your **PROJECT-REF** (e.g. `ubpztkldyuohrurapaxu`).

**Confirm:** I have my PROJECT-REF: `________________`  
*(Reply with your PROJECT-REF, or "done" if you already shared it.)*

---

## Step 4: Build your production DATABASE_URL

Use this format (direct connection, port 5432, with schema and SSL):

```text
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public&sslmode=require
```

Replace:
- `[PROJECT-REF]` — from Step 3 (e.g. `ubpztkldyuohrurapaxu`).
- `[PASSWORD]` — your database password from Step 2.

**URL-encoding the password:**  
If the password contains special characters, they must be encoded in the URL:

| Character | Encode as |
|-----------|-----------|
| `@`       | `%40`     |
| `#`       | `%23`     |
| `%`       | `%25`     |
| `?`       | `%3F`     |
| `&`       | `%26`     |
| `=`       | `%3D`     |
| `/`       | `%2F`     |
| `+`       | `%2B`     |
| space     | `%20`     |

Example: password `L@ruba1212Jerry` → use `L%40ruba1212Jerry` in the URL.

**Your DATABASE_URL (do not commit; use only in .env or env vars):**

```text
postgresql://postgres._____________:_____________@db._____________.supabase.co:5432/postgres?schema=public&sslmode=require
```

**Confirm:** I have built my DATABASE_URL and saved it somewhere secure (e.g. .env draft).  
*(Reply "done" before running migrations.)*

---

## Step 5: Run Prisma migrations from your machine

Open a terminal in your project folder (e.g. `C:\Users\User\Desktop\Hebrews`).

### Option A — PowerShell (one-off)

Set the env var and run (replace the URL with your real DATABASE_URL):

```powershell
cd C:\Users\User\Desktop\Hebrews
$env:DATABASE_URL = "postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres?schema=public&sslmode=require"
npx prisma migrate deploy
```

### Option B — Bash / Git Bash (one-off)

```bash
cd /c/Users/User/Desktop/Hebrews
export DATABASE_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres?schema=public&sslmode=require"
npx prisma migrate deploy
```

### Option C — .env file (recommended for reuse)

1. In the project root, create or edit `.env` (ensure `.env` is in `.gitignore`).
2. Add one line (your real URL, in quotes if it contains spaces):

   ```env
   DATABASE_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres?schema=public&sslmode=require"
   ```

3. Run:

   ```powershell
   cd C:\Users\User\Desktop\Hebrews
   npx prisma migrate deploy
   ```

You should see output like: `Applying migration …` for each migration, then `All migrations have been successfully applied.`

**Confirm:** Migrations finished successfully.  
*(Reply "done" or paste any error message if it failed.)*

---

## Step 6 (Optional): Run the seed script

Seeding creates default staff (e.g. usernames like `able`, `phiona`), terminals, tables, products, and an initial shift. Default password for seeded users: `password123` (change after first login).

**Do you want to seed the database?** (yes/no)

If **yes**, run (with the same `DATABASE_URL` set as in Step 5):

```powershell
npx prisma db seed
```

Or:

```powershell
npm run db:seed
```

Expected: `Seed completed.`

**Confirm:** I have run the seed (or skipped it).  
*(Reply "seeded" or "skipped".)*

---

## Step 7: Verify database access

### 7a — Quick Prisma check

With `DATABASE_URL` still set (or in `.env`):

```powershell
cd C:\Users\User\Desktop\Hebrews
echo "SELECT 1 AS ok;" | npx prisma db execute --stdin
```

You should see a result with `ok: 1` (or similar).

### 7b — List tables

```powershell
echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | npx prisma db execute --stdin
```

You should see tables such as `Staff`, `Product`, `Order`, etc.

### 7c — Prisma Studio (optional)

```powershell
npx prisma studio
```

A browser window opens; confirm you can see your tables and data.

### 7d — Run the app locally against production DB (optional)

Only if you want to test the app with the production DB:

1. Ensure `.env` contains your production `DATABASE_URL` (and optionally `POS_JWT_SECRET`).
2. Run:

   ```powershell
   npm run build
   npm start
   ```

3. Open http://localhost:3000 and log in (e.g. `able` / `password123` if you seeded).

**Confirm:** Verification steps passed (or describe any failure).  
*(Reply "done" or the error you see.)*

---

## Step 8: Checklist and next steps

- [ ] Supabase account exists.
- [ ] Project `cafe-havilah-pos` created; database password saved securely.
- [ ] PROJECT-REF and direct connection (port 5432) noted.
- [ ] Production `DATABASE_URL` built with `?schema=public&sslmode=require` and password URL-encoded if needed.
- [ ] `npx prisma migrate deploy` completed successfully.
- [ ] (Optional) `npx prisma db seed` run.
- [ ] Verification (SELECT 1, list tables, and/or Prisma Studio) done.
- [ ] `DATABASE_URL` stored securely for Koyeb (e.g. as a secret in Koyeb dashboard); **never committed to git**.

**Confirm:** All steps completed; DATABASE_URL is saved for Koyeb and not in the repo.  
*(Reply "checklist done" to finish.)*

---

*For Koyeb: add `DATABASE_URL` as an environment variable or secret in the Koyeb service settings, using this same connection string (direct or pooler with `pgbouncer=true` if you use port 6543).*
