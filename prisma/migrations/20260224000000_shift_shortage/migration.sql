-- Add shortage_ugx to Shift and ShiftFinancialSummary (declared cash shortage when closing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Shift') THEN
    ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "shortage_ugx" DECIMAL(12, 2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ShiftFinancialSummary') THEN
    ALTER TABLE "ShiftFinancialSummary" ADD COLUMN IF NOT EXISTS "shortage_ugx" DECIMAL(12, 2);
  END IF;
END $$;
