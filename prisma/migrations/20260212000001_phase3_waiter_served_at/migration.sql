-- Phase 3 Café Workflow: waiter assignment and served timestamp
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assigned_waiter_id" UUID REFERENCES "Staff"("id");
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "served_at" TIMESTAMP(3);
    CREATE INDEX IF NOT EXISTS "Order_assignedWaiterId_idx" ON "Order"("assigned_waiter_id");
  END IF;
END $$;
