-- Phase 5: Token versioning for revocation (invalidate all tokens when version bumps)
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 0;
