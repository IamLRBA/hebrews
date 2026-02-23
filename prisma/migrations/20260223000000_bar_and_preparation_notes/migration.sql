-- Add bar role to StaffRole enum (skip if enum does not exist, e.g. shadow DB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StaffRole') THEN
    ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'bar';
  END IF;
END $$;

-- Add sent_to_bar_at and preparation_notes to Order (skip if Order table does not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sent_to_bar_at" TIMESTAMP(3);
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "preparation_notes" TEXT;
  END IF;
END $$;
