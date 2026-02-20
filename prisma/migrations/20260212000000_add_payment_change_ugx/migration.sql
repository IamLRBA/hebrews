-- Phase 2 Payment Integrity: add changeUgx to Payment for cash payments (audit)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "change_ugx" DECIMAL(12,2);
