# Phase 1: External Database Setup & Migration (Supabase)

This guide sets up a managed PostgreSQL database on Supabase for Cafe Havilah POS and runs Prisma migrations (and optional seed) from your machine.

---

## Your Supabase project

| Item | Value |
|------|--------|
| **Project ref** | `ubpztkldyuohrurapaxu` |
| **Direct connection host** | `db.ubpztkldyuohrurapaxu.supabase.co:5432` |

**Production `DATABASE_URL`** (replace `YOUR_PASSWORD` with your database password):

```text
postgresql://postgres.ubpztkldyuohrurapaxu:YOUR_PASSWORD@db.ubpztkldyuohrurapaxu.supabase.co:5432/postgres?schema=public&sslmode=require
```

If your password contains `@`, `#`, `%`, or other special characters, [URL-encode](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) them (e.g. `@` → `%40`).

---

## 1. Create the managed Postgres database (Supabase)

You create the database in Supabase; Cursor cannot create it for you. Follow these steps:

1. **Sign up / log in**  
   Go to [supabase.com](https://supabase.com) and create an account or sign in.

2. **Create a new project**  
   - Dashboard → **New project**  
   - **Organization:** use default or create one  
   - **Name:** e.g. `cafe-havilah-pos`  
   - **Database password:** choose a strong password and **save it** (you need it for the connection URL)  
   - **Region:** pick one close to your Koyeb region (e.g. `East US` or `eu-west-1`)  
   - Click **Create new project** and wait for the database to be ready (1–2 minutes).

3. **Get the connection URL**  
   - In the project: **Project Settings** (gear) → **Database**  
   - Under **Connection string** choose **URI**  
   - Copy the URI. It looks like:
     ```text
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
   - Supabase also shows a **Direct connection** (port **5432**). For **Prisma migrations** use the **direct** connection, not the pooler (6543):
     - On the same Database settings page, find **Connection string** → **Direct connection** or the host for port 5432.  
     - Direct host is usually: `db.[PROJECT-REF].supabase.co` (port 5432).

4. **Build your production `DATABASE_URL`**  
   Use the **direct** connection (port 5432) for running migrations and seeding. Format:

   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public&sslmode=require
   ```

   Replace:
   - `[PROJECT-REF]` — from Supabase (e.g. `abcdefghijklmnop`)  
   - `[YOUR-PASSWORD]` — the database password you set when creating the project  

   **Required query params:**
   - `schema=public` — Prisma uses the `public` schema  
   - `sslmode=require` — Supabase requires SSL  

   Example (fake ref/password):

   ```text
   postgresql://postgres.abcdefghijklmnop:MyStr0ngP@ss@db.abcdefghijklmnop.supabase.co:5432/postgres?schema=public&sslmode=require
   ```

   **Note:** If your password contains special characters, URL-encode them (e.g. `@` → `%40`, `#` → `%23`).

   **Supabase UI:** In **Project Settings → Database**, use the **Session** (direct) connection string, which uses port **5432**. Do not use the Transaction pooler (port 6543) for migrations — Prisma Migrate requires a direct connection.

---

## 2. Run migrations on the production database

From your **local machine** (in the repo), set `DATABASE_URL` to the Supabase URL above, then run Prisma migrate.

### Option A: One-off command (PowerShell)

```powershell
cd C:\Users\User\Desktop\Hebrews

$env:DATABASE_URL = "postgresql://postgres.ubpztkldyuohrurapaxu:YOUR_PASSWORD@db.ubpztkldyuohrurapaxu.supabase.co:5432/postgres?schema=public&sslmode=require"
npx prisma migrate deploy
```

Replace `YOUR_PASSWORD` with your Supabase database password.

### Option B: One-off command (Bash / Git Bash)

```bash
cd /c/Users/User/Desktop/Hebrews

export DATABASE_URL="postgresql://postgres.ubpztkldyuohrurapaxu:YOUR_PASSWORD@db.ubpztkldyuohrurapaxu.supabase.co:5432/postgres?schema=public&sslmode=require"
npx prisma migrate deploy
```

### Option C: Use a `.env` file (do not commit)

1. Create or edit `.env` in the repo root (ensure `.env` is in `.gitignore`).
2. Set one line (replace `YOUR_PASSWORD` with your Supabase database password):
   ```env
   DATABASE_URL="postgresql://postgres.ubpztkldyuohrurapaxu:YOUR_PASSWORD@db.ubpztkldyuohrurapaxu.supabase.co:5432/postgres?schema=public&sslmode=require"
   ```
3. Run:
   ```powershell
   cd C:\Users\User\Desktop\Hebrews
   npx prisma migrate deploy
   ```
   Prisma will read `DATABASE_URL` from `.env`.

**Expected output:**  
You should see “Applying migration …” for each migration and finally “All migrations have been successfully applied.”

---

## 3. Optional: Seed the database

Seeding creates default staff, terminals, tables, products, and an initial shift (see `prisma/seed.js`).

```powershell
cd C:\Users\User\Desktop\Hebrews
# If DATABASE_URL is not already set (e.g. from .env), set it first as in step 2.
npx prisma db seed
```

Or with npm script:

```powershell
npm run db:seed
```

**Expected output:**  
`Seed completed.`  
Default staff include usernames like `able`, `phiona` with password `password123` — change these after first login.

---

## 4. Verify the database is ready and accessible

### Quick check (Prisma)

```powershell
cd C:\Users\User\Desktop\Hebrews
npx prisma db execute --stdin
```

Then type and press Enter:

```sql
SELECT 1 AS ok;
```

Or list tables:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Exit with `Ctrl+C` or run:

```powershell
echo "SELECT 1 AS ok;" | npx prisma db execute --stdin
```

### Open Prisma Studio (optional)

```powershell
npx prisma studio
```

This opens a browser UI; confirm you see tables such as `Staff`, `Product`, `Order`, etc.

### Verify from the app

1. In the same repo, set in `.env` (or env):
   ```env
   DATABASE_URL="postgresql://postgres.ubpztkldyuohrurapaxu:YOUR_PASSWORD@db.ubpztkldyuohrurapaxu.supabase.co:5432/postgres?schema=public&sslmode=require"
   ```
2. Run the app locally:
   ```powershell
   npm run build
   npm start
   ```
3. Open the app (e.g. http://localhost:3000), log in with seeded credentials (e.g. `able` / `password123`) and confirm data loads.

---

## 5. SSL and schema summary

| Item | Value |
|------|--------|
| **Schema** | `?schema=public` in `DATABASE_URL` (Prisma default) |
| **SSL** | `sslmode=require` (Supabase requires encrypted connections) |
| **Full pattern** | `...postgres?schema=public&sslmode=require` |

Use this same URL (direct connection, port 5432) for:

- Running `prisma migrate deploy` and `prisma db seed` from your machine or CI  
- Local app runs against production DB (for verification only)  
- **Koyeb:** Use this direct URL, or for connection pooling use Supabase’s pooler (port 6543) with `?schema=public&sslmode=require&pgbouncer=true` (required when using the Transaction pooler with Prisma).

---

## 6. Checklist

- [ ] Supabase project created; database password saved  
- [ ] `DATABASE_URL` built with **direct** host (e.g. `db.[ref].supabase.co:5432`) and `?schema=public&sslmode=require`  
- [ ] `npx prisma migrate deploy` run successfully  
- [ ] (Optional) `npx prisma db seed` run successfully  
- [ ] Verification: `prisma db execute` or Prisma Studio or local app login works  
- [ ] `DATABASE_URL` stored securely for Koyeb (e.g. Koyeb Secrets); never committed to git  

Once this is done, you can point the Koyeb app to this `DATABASE_URL` for Phase 2 (deploying the app to Koyeb).
