-- AlterEnum (skip if OrderStatus type does not exist, e.g. in shadow DB without baseline)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'awaiting_payment';
  END IF;
END $$;
