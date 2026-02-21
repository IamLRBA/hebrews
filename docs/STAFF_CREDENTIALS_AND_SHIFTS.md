# Staff Login Credentials & Shift IDs

Use this for testing the POS, Admin, Manager, and Kitchen UIs.

## Default password (all staff)

After running **`npx prisma db seed`**, every staff account uses:

- **Password:** `password123`

## Staff accounts (username = login, role)

| Username | Full Name | Role    | Use for                          |
|----------|-----------|---------|----------------------------------|
| able     | Able      | admin   | Admin dashboard, settings, all   |
| david    | David     | admin   | Admin (second admin)             |
| linus    | Linus     | manager | Manager dashboard, shifts, close |
| ritah    | Ritah     | manager | Manager                         |
| phiona   | Phiona    | cashier | POS, orders, payments           |
| evyone   | Evyone    | cashier | POS                             |
| patricia | Patricia  | cashier | POS                             |
| emma     | Emma      | kitchen | Kitchen display                  |
| kelvin   | Kelvin    | kitchen | Kitchen                          |
| fred     | Fred      | cashier | POS / service                    |
| gift     | Gift      | cashier | POS                             |
| sharon   | Sharon    | cashier | POS                             |
| shinnah  | Shinnah   | cashier | POS                             |
| aishah   | Aishah    | cashier | POS                             |

## Login URLs

- **Unified login (then redirect by role):** `/login`
- **POS-only login:** `/pos/login`

After login, staff are redirected by role (e.g. admin → `/admin/dashboard`, manager → `/manager/dashboard`, cashier → `/pos`, kitchen → `/kitchen` or shift picker).

## Shift IDs

Shifts are created when a **manager** or **admin** starts a shift from the POS (“Start shift”) or via API. They are not fixed IDs.

- **After seed:** The seed creates **one active shift** for **Linus** (manager) with terminal `POS-1`. That shift’s **ID** is a UUID stored in the database (e.g. `abc12345-...`). The **Kitchen** and **Manager** UIs that need a shift ID get it from:
  - **Kitchen:** `/kitchen` lists active shifts from `GET /api/kitchen/shifts`; you click a shift to open `/kitchen/[shiftId]`.
  - **Manager:** Manager shift close and summary use the active shift or the shift chosen in the manager shifts list.
- **To see current shift IDs:** Log in as admin → **Admin → Shifts** (`/admin/shifts`), or call `GET /api/admin/shifts?status=active` (as admin). Each row’s `id` is the **shift ID** to use in URLs or APIs (e.g. `/api/shifts/[shiftId]/summary`, `/api/shifts/[shiftId]/close`, `/kitchen/[shiftId]`).

## Quick test logins

- **Admin (analytics, products, tables, staff, shifts):**  
  Username: `able`  
  Password: `password123`

- **Manager (dashboard, orders, shifts, close shift):**  
  Username: `linus`  
  Password: `password123`

- **POS / Cashier (tables, orders, payment):**  
  Username: `phiona`  
  Password: `password123`  
  (Start or continue a shift when prompted.)

- **Kitchen:**  
  Username: `emma`  
  Password: `password123`  
  Then open **Kitchen**, pick the active shift (e.g. Linus’s), to see queue at `/kitchen/[shiftId]`.

## Notes

- Ensure **`npx prisma db seed`** has been run so all usernames and `password123` exist.
- **POS_JWT_SECRET** must be set in `.env` (min 16 characters) for login to work.
- Shift IDs are UUIDs from the database; use Admin → Shifts or the APIs above to get the current IDs when needed.
