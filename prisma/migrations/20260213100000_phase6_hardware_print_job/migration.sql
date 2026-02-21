-- Phase 6: Hardware integration - Terminal capabilities, PrintJob tracking

ALTER TABLE "Terminal" ADD COLUMN IF NOT EXISTS "receipt_printer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Terminal" ADD COLUMN IF NOT EXISTS "kitchen_printer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Terminal" ADD COLUMN IF NOT EXISTS "cash_drawer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Terminal" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);

CREATE TYPE "PrintJobType" AS ENUM ('receipt', 'kitchen_ticket');
CREATE TYPE "PrintJobStatus" AS ENUM ('pending', 'success', 'failed');

CREATE TABLE "PrintJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "payment_id" UUID,
    "type" "PrintJobType" NOT NULL,
    "terminal_id" VARCHAR(32),
    "device_id" VARCHAR(64),
    "status" "PrintJobStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrintJob_receipt_once_per_payment" ON "PrintJob"("payment_id", "type") WHERE "payment_id" IS NOT NULL;
CREATE INDEX "PrintJob_order_id_idx" ON "PrintJob"("order_id");
CREATE INDEX "PrintJob_payment_id_idx" ON "PrintJob"("payment_id");
CREATE INDEX "PrintJob_type_idx" ON "PrintJob"("type");
CREATE INDEX "PrintJob_status_idx" ON "PrintJob"("status");
CREATE INDEX "PrintJob_created_at_idx" ON "PrintJob"("created_at");
