-- Phase 4: Terminal, AuditLog, Payment.terminalId, StaffRole.waiter

-- New enum for terminal type
CREATE TYPE "TerminalType" AS ENUM ('POS', 'KDS', 'manager', 'mobile');

-- Add waiter to StaffRole (PostgreSQL: add value to existing enum)
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'waiter';

-- Terminal table
CREATE TABLE "Terminal" (
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

CREATE UNIQUE INDEX "Terminal_code_key" ON "Terminal"("code");
CREATE INDEX "Terminal_code_idx" ON "Terminal"("code");
CREATE INDEX "Terminal_type_idx" ON "Terminal"("type");
CREATE INDEX "Terminal_is_active_idx" ON "Terminal"("is_active");

-- AuditLog table (append-only)
CREATE TABLE "AuditLog" (
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

CREATE INDEX "AuditLog_staff_id_idx" ON "AuditLog"("staff_id");
CREATE INDEX "AuditLog_terminal_id_idx" ON "AuditLog"("terminal_id");
CREATE INDEX "AuditLog_action_type_idx" ON "AuditLog"("action_type");
CREATE INDEX "AuditLog_entity_type_idx" ON "AuditLog"("entity_type");
CREATE INDEX "AuditLog_entity_id_idx" ON "AuditLog"("entity_id");
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- Payment.terminalId (optional)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "terminal_id" VARCHAR(32);
