-- Phase 2 Payment Integrity: add changeUgx to Payment for cash payments (audit)
-- Conditional so shadow DB (which may not have base tables) does not fail
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "change_ugx" DECIMAL(12,2);
  END IF;
END $$;
