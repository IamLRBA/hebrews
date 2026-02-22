-- Phase 5: Token replay protection (iat) and account lockout
-- Conditional so shadow DB (which may not have base tables) does not fail
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Staff') THEN
    ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "last_password_change_at" TIMESTAMP(3);
    ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "last_forced_logout_at" TIMESTAMP(3);
    ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);
  END IF;
END $$;
