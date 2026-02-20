# Next Steps Guide - Order Lifecycle Refactor

## Step 1: Database Migration ✅ READY

### Option A: Interactive Migration (Recommended for Development)

```bash
# Navigate to project directory
cd c:\Users\User\Desktop\Hebrews

# Run interactive migration
npx prisma migrate dev --name add_awaiting_payment_status
```

**What this does:**
- Creates migration file in `prisma/migrations/`
- Applies migration to your database
- Regenerates Prisma client

### Option B: Manual Migration (If Option A Fails)

If the interactive command fails, you can manually create the migration:

1. **Create migration directory:**
```bash
mkdir -p prisma/migrations/$(Get-Date -Format "yyyyMMddHHmmss")_add_awaiting_payment_status
```

2. **Create migration SQL file** (`migration.sql`):
```sql
-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'awaiting_payment';
```

3. **Apply migration:**
```bash
npx prisma migrate deploy
npx prisma generate
```

### Verify Migration

After migration, verify the enum was updated:

```bash
npx prisma studio
```

Check the `Order` model - `status` field should now include `awaiting_payment` option.

---

## Step 2: Frontend UI Updates ✅ COMPLETED

### Files Updated:

1. **`components/ui/StatusBadge.tsx`**
   - ✅ Added `awaiting_payment` status styling (orange badge)
   - Icon: AlertCircle
   - Colors: Orange theme

2. **`app/(pos)/pos/ready/page.tsx`**
   - ✅ Updated to display actual order status (not hardcoded "ready")
   - Now shows both `ready` and `awaiting_payment` orders

3. **`app/(pos)/manager/dashboard/page.tsx`**
   - ✅ Updated "Ready Orders" count to include `awaiting_payment`
   - Dashboard now shows accurate counts

4. **`app/(pos)/manager/orders/page.tsx`**
   - ✅ Replaced custom status badge with `<StatusBadge>` component
   - ✅ Added StatusBadge import

5. **`app/(pos)/admin/orders/page.tsx`**
   - ✅ Replaced custom status badge with `<StatusBadge>` component
   - ✅ Added StatusBadge import

6. **`app/(pos)/pos/orders/[orderId]/page.tsx`**
   - ✅ Updated payment button to show for both `ready` and `awaiting_payment` statuses

### Status Badge Styling:

- **Pending:** Yellow (Clock icon)
- **Preparing:** Blue (ChefHat icon)
- **Ready:** Green (CheckCircle icon)
- **Awaiting Payment:** Orange (AlertCircle icon) ← NEW
- **Served:** Primary color (CheckCircle icon)
- **Cancelled:** Neutral gray (XCircle icon)

---

## Step 3: Testing Complete Order Flow

### Test Scenario 1: Basic Order Flow

1. **Create Order**
   - Login as cashier
   - Create new order (dine-in or takeaway)
   - Add items
   - Verify status is `pending`

2. **Submit to Kitchen**
   - Click "Send to Kitchen"
   - Verify status changes to `preparing`

3. **Kitchen Prepares**
   - Login as kitchen staff
   - View kitchen display
   - Click "Start Preparing"
   - Verify status remains `preparing`

4. **Kitchen Marks Ready**
   - Click "Mark Ready"
   - **VERIFY:** Status changes to `awaiting_payment` (NOT `served`)
   - Verify order appears in POS "Ready Orders" screen
   - Verify table is still occupied (if dine-in)

5. **Process Payment**
   - Navigate to order detail
   - Click "Payment"
   - Process cash/momo payment
   - **VERIFY:** Status changes to `served`
   - Verify table is released (if dine-in)

### Test Scenario 2: Payment Validation

1. **Create Order → Ready → Awaiting Payment**
2. **Try to serve without payment**
   - Navigate to ready orders screen
   - Try to "Serve Order" without payment
   - **VERIFY:** Error message (order not fully paid)

3. **Process Payment**
   - Process payment
   - **VERIFY:** Order transitions to `served`

### Test Scenario 3: Manager Dashboard

1. **View Manager Dashboard**
   - Login as manager
   - View dashboard
   - **VERIFY:** "Ready Orders" count includes `awaiting_payment` orders

2. **View Orders List**
   - Navigate to orders page
   - **VERIFY:** `awaiting_payment` orders display with orange badge
   - Filter by status
   - **VERIFY:** Can filter by `awaiting_payment` status

### Test Scenario 4: Status Transitions

Test invalid transitions throw errors:

1. **Try to transition `ready → served` directly**
   - Should fail (must go through `awaiting_payment`)

2. **Try to transition `awaiting_payment → ready`**
   - Should fail (not allowed)

3. **Try to transition `awaiting_payment → preparing`**
   - Should fail (not allowed)

---

## Step 4: Deployment Checklist

### Pre-Deployment

- [ ] Database migration tested on staging
- [ ] All frontend updates tested
- [ ] Order flow tested end-to-end
- [ ] Payment processing tested
- [ ] Status badges display correctly
- [ ] No console errors
- [ ] No TypeScript errors

### Deployment Steps

1. **Backup Database**
```bash
# Create backup before migration
pg_dump -U postgres pos > backup_before_awaiting_payment.sql
```

2. **Run Migration on Production**
```bash
# Apply migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

3. **Deploy Application**
```bash
# Build application
npm run build

# Start application
npm start
```

4. **Verify Deployment**
   - Check application logs for errors
   - Test order creation
   - Test kitchen workflow
   - Test payment processing
   - Verify status badges display correctly

### Rollback Plan (If Needed)

If issues occur:

1. **Rollback Migration:**
```sql
-- Remove enum value (PostgreSQL)
-- Note: This is complex - may require recreating enum
-- Better to fix issues rather than rollback
```

2. **Revert Code:**
```bash
git revert <commit-hash>
```

---

## Expected Behavior After Deployment

### Kitchen Workflow

1. Kitchen marks order "ready" → Order becomes `awaiting_payment`
2. Order appears in POS "Ready Orders" screen
3. Table remains occupied (if dine-in)
4. Order cannot be served without payment

### Payment Workflow

1. Cashier navigates to order
2. Order status is `awaiting_payment` (or `ready`)
3. Cashier processes payment
4. Order transitions to `served`
5. Table is released (if dine-in)

### UI Display

- **Status Badges:** Orange badge for `awaiting_payment`
- **Ready Orders Screen:** Shows both `ready` and `awaiting_payment`
- **Dashboard Counts:** Includes `awaiting_payment` in "Ready Orders"
- **Order Lists:** Display `awaiting_payment` status correctly

---

## Troubleshooting

### Issue: Migration Fails

**Solution:**
- Check PostgreSQL version (needs 9.1+ for ALTER TYPE)
- Ensure database connection is correct
- Check for existing migrations conflicts

### Issue: Status Badge Not Displaying

**Solution:**
- Clear browser cache
- Restart development server
- Verify StatusBadge component import

### Issue: Orders Stuck in `awaiting_payment`

**Solution:**
- Verify payment was processed
- Check payment records in database
- Verify `finalizePayment()` is being called

### Issue: Kitchen Can Still Mark Orders as Served

**Solution:**
- Verify `updateKitchenStatus()` was updated
- Check backend logs for status transitions
- Verify Prisma client was regenerated

---

## Support

If you encounter issues:

1. Check application logs
2. Check database for order statuses
3. Verify Prisma client is up to date
4. Test API endpoints directly
5. Review error messages

---

**END OF NEXT STEPS GUIDE**
