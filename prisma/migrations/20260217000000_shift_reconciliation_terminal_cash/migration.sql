-- Only run when base schema exists (e.g. production); skip in shadow DB where Shift may not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Shift') THEN
    RETURN;
  END IF;

  -- AlterTable Shift: add manager approval for variance (idempotent)
  ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "manager_approval_staff_id" UUID;

  -- CreateTable TerminalCashSummary
  CREATE TABLE IF NOT EXISTS "TerminalCashSummary" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "terminal_id" VARCHAR(32) NOT NULL,
    "cash_sales_ugx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "drops_ugx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustments_ugx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expected_balance_ugx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TerminalCashSummary_pkey" PRIMARY KEY ("id")
  );

  -- CreateTable ShiftFinancialSummary
  CREATE TABLE IF NOT EXISTS "ShiftFinancialSummary" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "expected_cash_ugx" DECIMAL(12,2) NOT NULL,
    "counted_cash_ugx" DECIMAL(12,2) NOT NULL,
    "variance_ugx" DECIMAL(12,2) NOT NULL,
    "manager_approval_staff_id" UUID,
    "closed_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftFinancialSummary_pkey" PRIMARY KEY ("id")
  );

  -- AlterTable Payment: refund reference (idempotent)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "original_payment_id" UUID;
  END IF;

  -- CreateIndex (idempotent)
  CREATE UNIQUE INDEX IF NOT EXISTS "TerminalCashSummary_shift_id_terminal_id_key" ON "TerminalCashSummary"("shift_id", "terminal_id");
  CREATE INDEX IF NOT EXISTS "TerminalCashSummary_shift_id_idx" ON "TerminalCashSummary"("shift_id");
  CREATE INDEX IF NOT EXISTS "TerminalCashSummary_terminal_id_idx" ON "TerminalCashSummary"("terminal_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "ShiftFinancialSummary_shift_id_key" ON "ShiftFinancialSummary"("shift_id");
  CREATE INDEX IF NOT EXISTS "ShiftFinancialSummary_shift_id_idx" ON "ShiftFinancialSummary"("shift_id");
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    CREATE INDEX IF NOT EXISTS "Payment_original_payment_id_idx" ON "Payment"("original_payment_id");
  END IF;

  -- AddForeignKey (idempotent)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Shift_manager_approval_staff_id_fkey') THEN
    ALTER TABLE "Shift" ADD CONSTRAINT "Shift_manager_approval_staff_id_fkey" FOREIGN KEY ("manager_approval_staff_id") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TerminalCashSummary_shift_id_fkey') THEN
    ALTER TABLE "TerminalCashSummary" ADD CONSTRAINT "TerminalCashSummary_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShiftFinancialSummary_shift_id_fkey') THEN
    ALTER TABLE "ShiftFinancialSummary" ADD CONSTRAINT "ShiftFinancialSummary_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_original_payment_id_fkey') AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
