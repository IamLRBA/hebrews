-- Phase 5: Token versioning for revocation (invalidate all tokens when version bumps)
-- Conditional so shadow DB (which may not have base tables) does not fail
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Staff') THEN
    ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
