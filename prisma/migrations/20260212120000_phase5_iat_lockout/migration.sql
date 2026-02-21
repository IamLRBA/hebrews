-- Phase 5: Token replay protection (iat) and account lockout
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "last_password_change_at" TIMESTAMP(3);
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "last_forced_logout_at" TIMESTAMP(3);
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);
