-- Add sent_to_kitchen_at to Order (skip if Order table does not exist, e.g. shadow DB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Order') THEN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sent_to_kitchen_at" TIMESTAMP(3);
  END IF;
END $$;
