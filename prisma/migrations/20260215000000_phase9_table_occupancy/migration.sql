-- Phase 9: table ownership — which terminal/staff has the table locked for an order
-- Conditional so shadow DB (which may not have base tables) does not fail
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RestaurantTable') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TableOccupancy') THEN
      CREATE TABLE "TableOccupancy" (
          "id" UUID NOT NULL,
          "table_id" UUID NOT NULL,
          "order_id" UUID NOT NULL,
          "terminal_id" VARCHAR(32) NOT NULL,
          "staff_id" UUID NOT NULL,
          "locked_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "TableOccupancy_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX "TableOccupancy_table_id_key" ON "TableOccupancy"("table_id");
      CREATE INDEX "TableOccupancy_table_id_idx" ON "TableOccupancy"("table_id");
      CREATE INDEX "TableOccupancy_order_id_idx" ON "TableOccupancy"("order_id");
      CREATE INDEX "TableOccupancy_terminal_id_idx" ON "TableOccupancy"("terminal_id");
      ALTER TABLE "TableOccupancy" ADD CONSTRAINT "TableOccupancy_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "RestaurantTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
