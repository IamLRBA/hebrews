# Cafe Havilah POS - Login Credentials

**Default Password for All Staff:** `password123`

## Admin Accounts

| Username | Full Name | Role | Dashboard |
|----------|-----------|------|-----------|
| `able` | Able | Admin | `/admin/dashboard` |
| `david` | David | Admin | `/admin/dashboard` |

## Manager Accounts

| Username | Full Name | Role | Dashboard |
|----------|-----------|------|-----------|
| `linus` | Linus | Manager | `/manager/dashboard` |
| `ritah` | Ritah | Manager | `/manager/dashboard` |

## Kitchen Staff

| Username | Full Name | Role | Dashboard |
|----------|-----------|------|-----------|
| `emma` | Emma | Kitchen | `/kitchen` |
| `kelvin` | Kelvin | Kitchen | `/kitchen` |

## Cashier Accounts

| Username | Full Name | Role | Dashboard |
|----------|-----------|------|-----------|
| `phiona` | Phiona | Cashier | `/pos/start` |
| `evyone` | Evyone | Cashier | `/pos/start` |
| `patricia` | Patricia | Cashier | `/pos/start` |
| `fred` | Fred | Cashier | `/pos/start` |
| `gift` | Gift | Cashier | `/pos/start` |
| `sharon` | Sharon | Cashier | `/pos/start` |
| `shinnah` | Shinnah | Cashier | `/pos/start` |
| `aishah` | Aishah | Cashier | `/pos/start` |

## Login Instructions

1. Navigate to `/login` (or `/pos/login` which redirects to `/login`)
2. Enter your username (case-insensitive)
3. Enter password: `password123`
4. Click "Sign In"
5. You will be automatically redirected to your role-specific dashboard:
   - **Admin** → Admin Dashboard (`/admin/dashboard`)
   - **Manager** → Manager Dashboard (`/manager/dashboard`)
   - **Kitchen** → Kitchen Display (`/kitchen`)
   - **Cashier** → POS Start (`/pos/start`)

## Role Capabilities

### Admin
- Full system access
- View analytics and reports
- Manage all orders, payments, shifts
- Add/edit/remove staff
- Manage products and inventory
- Manage tables
- System settings

### Manager
- View shift summaries
- View and manage orders
- View payment summaries
- Close shifts with cash reconciliation
- Cancel orders (with approval)

### Kitchen
- View order queue for active shift
- Mark orders as "preparing"
- Mark orders as "ready"

### Cashier
- Create and manage orders
- Process payments
- Start shifts
- View order history

## Notes

- All passwords can be changed by Admin through the Staff Management page
- Staff accounts can be activated/deactivated by Admin
- The system uses role-based access control - unauthorized access attempts will redirect to appropriate dashboards
