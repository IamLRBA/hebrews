-- AlterTable Shift: add manager approval for variance
ALTER TABLE "Shift" ADD COLUMN "manager_approval_staff_id" UUID;

-- CreateTable TerminalCashSummary
CREATE TABLE "TerminalCashSummary" (
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
CREATE TABLE "ShiftFinancialSummary" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "expected_cash_ugx" DECIMAL(12,2) NOT NULL,
    "counted_cash_ugx" DECIMAL(12,2) NOT NULL,
    "variance_ugx" DECIMAL(12,2) NOT NULL,
    "manager_approval_staff_id" UUID,
    "closed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftFinancialSummary_pkey" PRIMARY KEY ("id")
);

-- AlterTable Payment: refund reference
ALTER TABLE "Payment" ADD COLUMN "original_payment_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "TerminalCashSummary_shift_id_terminal_id_key" ON "TerminalCashSummary"("shift_id", "terminal_id");
CREATE INDEX "TerminalCashSummary_shift_id_idx" ON "TerminalCashSummary"("shift_id");
CREATE INDEX "TerminalCashSummary_terminal_id_idx" ON "TerminalCashSummary"("terminal_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftFinancialSummary_shift_id_key" ON "ShiftFinancialSummary"("shift_id");
CREATE INDEX "ShiftFinancialSummary_shift_id_idx" ON "ShiftFinancialSummary"("shift_id");

-- CreateIndex
CREATE INDEX "Payment_original_payment_id_idx" ON "Payment"("original_payment_id");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_manager_approval_staff_id_fkey" FOREIGN KEY ("manager_approval_staff_id") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TerminalCashSummary" ADD CONSTRAINT "TerminalCashSummary_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftFinancialSummary" ADD CONSTRAINT "ShiftFinancialSummary_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
