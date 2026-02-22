-- Phase 4: Terminal, AuditLog, Payment.terminalId, StaffRole.waiter
-- Wrapped in conditionals so shadow DB (which may lack base schema) does not fail

-- New enum for terminal type (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TerminalType') THEN
    CREATE TYPE "TerminalType" AS ENUM ('POS', 'KDS', 'manager', 'mobile');
  END IF;
END $$;

-- Add waiter to StaffRole (only if enum exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StaffRole') THEN
    ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'waiter';
  END IF;
END $$;

-- Terminal table (only if not exists)
CREATE TABLE IF NOT EXISTS "Terminal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "type" "TerminalType" NOT NULL,
    "location" VARCHAR(128),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Terminal_code_key" ON "Terminal"("code");
CREATE INDEX IF NOT EXISTS "Terminal_code_idx" ON "Terminal"("code");
CREATE INDEX IF NOT EXISTS "Terminal_type_idx" ON "Terminal"("type");
CREATE INDEX IF NOT EXISTS "Terminal_is_active_idx" ON "Terminal"("is_active");

-- AuditLog table (only if not exists)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID,
    "terminal_id" VARCHAR(32),
    "action_type" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "entity_id" UUID,
    "previous_state" JSONB,
    "new_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_staff_id_idx" ON "AuditLog"("staff_id");
CREATE INDEX IF NOT EXISTS "AuditLog_terminal_id_idx" ON "AuditLog"("terminal_id");
CREATE INDEX IF NOT EXISTS "AuditLog_action_type_idx" ON "AuditLog"("action_type");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_type_idx" ON "AuditLog"("entity_type");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_id_idx" ON "AuditLog"("entity_id");
CREATE INDEX IF NOT EXISTS "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- Payment.terminalId (only if Payment table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "terminal_id" VARCHAR(32);
  END IF;
END $$;
