-- Allow multiple orders per table: remove unique on table_id so TableOccupancy can have one row per order.
-- Table is "full" when count(TableOccupancy for table) >= RestaurantTable.capacity.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TableOccupancy') THEN
    DROP INDEX IF EXISTS "TableOccupancy_table_id_key";
  END IF;
END $$;
